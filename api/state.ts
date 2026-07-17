import { isAuthorized, readCloudState, sendJson, writeCloudState } from './_lib/cloud.js'

export default async function handler(req: any, res: any) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: 'Acesso à nuvem não autorizado.' })
    return
  }

  try {
    if (req.method === 'GET') {
      sendJson(res, 200, await readCloudState())
      return
    }

    if (req.method === 'PUT') {
      const state = req.body?.state
      if (!state || typeof state !== 'object') {
        sendJson(res, 400, { error: 'Estado inválido.' })
        return
      }

      const baseRevision =
        req.body?.baseRevision === undefined ? undefined : Number(req.body.baseRevision)
      sendJson(res, 200, await writeCloudState(state, baseRevision))
      return
    }

    sendJson(res, 405, { error: 'Método não permitido.' })
  } catch (err) {
    const error = err as Error & { status?: number; current?: unknown }
    sendJson(res, error.status || 500, {
      error: error.message || 'Erro ao sincronizar com a planilha.',
      current: error.current,
    })
  }
}
