// Set your ElevenLabs API key here if you don't want to use env vars
const API_KEY = '' // <- put your key here

export async function speakText({ text, voiceId = 'JBFqnCBsd6RMkjVDRZzb', modelId = 'eleven_multilingual_v2', outputFormat = 'mp3_44100_128' }) {
  if (!text || !text.trim()) return { ok: false, error: 'No text provided' }

  try {
    const params = new URLSearchParams({
      text,
      voiceId,
      modelId,
      outputFormat,
    })
    if (API_KEY) params.set('apiKey', API_KEY)

    const url = `/api/tts?${params.toString()}`
    const audio = new Audio(url)
    await audio.play()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Playback failed' }
  }
}


