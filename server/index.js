import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const eleven = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Text-to-Speech proxy
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceId = 'JBFqnCBsd6RMkjVDRZzb', modelId = 'eleven_multilingual_v2', outputFormat = 'mp3_44100_128' } = req.body || {};

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'Missing ELEVENLABS_API_KEY on server' });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }

    const audio = await eleven.textToSpeech.convert(voiceId, {
      text,
      modelId,
      outputFormat,
    });

    // Normalize to Buffer
    let buffer
    if (audio && typeof audio.pipe === 'function') {
      // If SDK returns a stream, buffer it for Range support
      const chunks = []
      for await (const chunk of audio) chunks.push(chunk)
      buffer = Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c)))
    } else {
      buffer = Buffer.isBuffer(audio)
        ? audio
        : Buffer.from(audio instanceof Uint8Array ? audio : new Uint8Array(audio))
    }

    const total = buffer.length
    const range = req.headers.range
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range)
      const start = match ? parseInt(match[1], 10) : 0
      const end = match && match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1
      if (start >= total || end >= total || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${total}`).end()
        return
      }
      const chunk = buffer.subarray(start, end + 1)
      res.status(206)
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
      res.setHeader('Content-Length', chunk.length)
      return res.end(chunk)
    }

    res.setHeader('Content-Length', total)
    return res.end(buffer)
  } catch (err) {
    // Log detailed error for debugging
    console.error('TTS error:', err?.response?.data || err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to generate audio' });
  }
});

// Simpler streaming GET endpoint so the browser can set audio.src directly
app.get('/api/tts', async (req, res) => {
  try {
    const text = req.query.text || ''
    const voiceId = req.query.voiceId || 'JBFqnCBsd6RMkjVDRZzb'
    const modelId = req.query.modelId || 'eleven_multilingual_v2'
    const outputFormat = req.query.outputFormat || 'mp3_44100_128'
    const apiKey = req.query.apiKey || process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return res.status(400).json({ error: 'Missing ElevenLabs API key (pass apiKey=... or set env)' })
    }
    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' })
    }

    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ text, model_id: modelId, output_format: outputFormat })
    })

    if (!upstream.ok) {
      const errText = await upstream.text()
      return res.status(upstream.status).json({ error: errText })
    }

    // Proxy headers and stream
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Accept-Ranges', 'bytes')

    return upstream.body.pipeTo(new WritableStream({
      write(chunk) { res.write(chunk) },
      close() { res.end() },
      abort(err) { console.error('Proxy stream abort:', err); res.end() }
    }))
  } catch (err) {
    console.error('TTS stream error:', err?.message || err)
    res.status(500).json({ error: err?.message || 'Failed to stream audio' })
  }
})

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`ElevenLabs TTS proxy listening on http://localhost:${PORT}`);
});


