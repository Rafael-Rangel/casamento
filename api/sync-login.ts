import {
  clearSessionCookie,
  createSessionToken,
  isAuthorized,
  sendJson,
  sessionCookie,
  verifyAccessCode,
} from './_lib/cloud.js'

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    sendJson(res, 200, { authorized: isAuthorized(req) })
    return
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie())
    sendJson(res, 200, { authorized: false })
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método não permitido.' })
    return
  }

  const code = String(req.body?.code || '')
  if (!code || !verifyAccessCode(code)) {
    sendJson(res, 401, { error: 'Código incorreto.' })
    return
  }

  res.setHeader('Set-Cookie', sessionCookie(createSessionToken()))
  sendJson(res, 200, { authorized: true })
}
