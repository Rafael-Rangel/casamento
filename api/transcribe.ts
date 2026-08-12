import { isAuthorized } from './_lib/cloud.js'

declare const process: { env: Record<string, string | undefined> }

/** Whisper via Groq — mesmo GROQ_API_KEY do agente */
const WHISPER_MODEL = 'whisper-large-v3'

function jsonResponse(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export default async function handler(req: any, res: any) {
  if (!isAuthorized(req)) {
    jsonResponse(res, 401, { error: 'Acesso à transcrição não autorizado.' })
    return
  }

  if (req.method !== 'POST') {
    jsonResponse(res, 405, { error: 'Método não permitido.' })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    jsonResponse(res, 500, {
      error: 'Configure GROQ_API_KEY para ativar a transcrição de áudio.',
    })
    return
  }

  try {
    const { audioBase64, mimeType } = req.body || {}
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      jsonResponse(res, 400, { error: 'Áudio obrigatório.' })
      return
    }

    const raw = Buffer.from(audioBase64, 'base64')
    if (raw.length < 64) {
      jsonResponse(res, 400, { error: 'Áudio muito curto. Grave de novo.' })
      return
    }
    if (raw.length > 24 * 1024 * 1024) {
      jsonResponse(res, 400, { error: 'Áudio grande demais. Grave uma mensagem mais curta.' })
      return
    }

    const type = typeof mimeType === 'string' && mimeType.startsWith('audio/')
      ? mimeType
      : 'audio/webm'
    const ext = type.includes('mp4') || type.includes('m4a')
      ? 'm4a'
      : type.includes('ogg')
        ? 'ogg'
        : type.includes('wav')
          ? 'wav'
          : 'webm'

    const form = new FormData()
    form.append(
      'file',
      new Blob([raw], { type }),
      `voice.${ext}`,
    )
    form.append('model', WHISPER_MODEL)
    form.append('language', 'pt')
    form.append('response_format', 'json')
    form.append('temperature', '0')

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!response.ok) {
      const text = await response.text()
      const isRate = response.status === 429
      jsonResponse(res, response.status, {
        error: isRate
          ? 'Limite da Groq atingido na transcrição. Espere um pouco.'
          : `Whisper falhou: ${text}`,
      })
      return
    }

    const data = (await response.json()) as { text?: string }
    const text = String(data.text || '').trim()
    if (!text) {
      jsonResponse(res, 422, { error: 'Não entendi o áudio. Tente de novo.' })
      return
    }

    jsonResponse(res, 200, { text })
  } catch (err) {
    jsonResponse(res, 500, {
      error: err instanceof Error ? err.message : 'Erro inesperado na transcrição.',
    })
  }
}
