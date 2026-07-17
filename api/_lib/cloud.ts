import { createHmac, timingSafeEqual } from 'node:crypto'
import { JWT } from 'google-auth-library'

const COOKIE = 'casamento_sync'
const SHEET_NAME = 'Banco'
const SHEET_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

interface ServiceAccount {
  client_email: string
  private_key: string
}

export interface CloudState {
  revision: number
  updatedAt: string
  state: unknown | null
}

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Variável ${name} não configurada.`)
  return value
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  return aa.length === bb.length && timingSafeEqual(aa, bb)
}

function sign(payload: string) {
  return createHmac('sha256', env('SYNC_SECRET')).update(payload).digest('base64url')
}

export function verifyAccessCode(code: string) {
  return safeEqual(code, env('SYNC_CODE'))
}

export function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + 1000 * 60 * 60 * 24 * 365 }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function sessionCookie(token: string) {
  return `${COOKIE}=${token}; Path=/api; Max-Age=31536000; HttpOnly; Secure; SameSite=Strict`
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
}

function readCookie(req: any, name: string) {
  const source = String(req.headers?.cookie || '')
  for (const item of source.split(';')) {
    const [key, ...value] = item.trim().split('=')
    if (key === name) return value.join('=')
  }
  return null
}

export function isAuthorized(req: any) {
  try {
    const token = readCookie(req, COOKIE)
    if (!token) return false
    const [payload, signature] = token.split('.')
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return false
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return Number(decoded.exp) > Date.now()
  } catch {
    return false
  }
}

function credentials(): ServiceAccount {
  return JSON.parse(env('GOOGLE_SERVICE_ACCOUNT_JSON')) as ServiceAccount
}

function authClient() {
  const account = credentials()
  return new JWT({
    email: account.client_email,
    key: account.private_key,
    scopes: [SHEET_SCOPE],
  })
}

async function request<T>(method: string, path: string, data?: unknown): Promise<T> {
  const spreadsheetId = env('GOOGLE_SHEET_ID')
  const auth = authClient()
  const response = await auth.request<T>({
    method,
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`,
    data,
  })
  return response.data
}

async function ensureDatabaseSheet() {
  const metadata = await request<{
    sheets?: { properties?: { sheetId?: number; title?: string; index?: number } }[]
  }>('GET', '?fields=sheets(properties(sheetId,title,index))')

  const sheets = metadata.sheets || []
  const database = sheets.find((sheet) => sheet.properties?.title === SHEET_NAME)
  if (database) return

  const first = sheets.sort(
    (a, b) => (a.properties?.index || 0) - (b.properties?.index || 0),
  )[0]
  if (!first?.properties?.sheetId && first?.properties?.sheetId !== 0) {
    throw new Error('A planilha não possui nenhuma aba disponível.')
  }

  await request('POST', ':batchUpdate', {
    requests: [
      {
        updateSheetProperties: {
          properties: { sheetId: first.properties.sheetId, title: SHEET_NAME },
          fields: 'title',
        },
      },
      {
        updateSheetProperties: {
          properties: {
            sheetId: first.properties.sheetId,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: 'gridProperties.frozenRowCount',
        },
      },
    ],
  })
}

function valuesPath(range: string) {
  return `/values/${encodeURIComponent(`'${SHEET_NAME}'!${range}`)}`
}

export async function readCloudState(): Promise<CloudState> {
  await ensureDatabaseSheet()
  const data = await request<{ values?: string[][] }>('GET', valuesPath('A1:C2'))
  const row = data.values?.[1]
  if (!row?.[2]) return { revision: 0, updatedAt: '', state: null }

  return {
    revision: Number(row[0]) || 0,
    updatedAt: row[1] || '',
    state: JSON.parse(row[2]),
  }
}

export async function writeCloudState(
  state: unknown,
  baseRevision?: number,
): Promise<CloudState> {
  const current = await readCloudState()
  if (
    baseRevision !== undefined &&
    current.revision > 0 &&
    baseRevision !== current.revision
  ) {
    const error = new Error('A planilha foi atualizada em outro aparelho.')
    ;(error as Error & { status?: number; current?: CloudState }).status = 409
    ;(error as Error & { status?: number; current?: CloudState }).current = current
    throw error
  }

  const serialized = JSON.stringify(state)
  if (serialized.length > 45000) {
    const error = new Error('Os dados ultrapassaram o limite da célula da planilha.')
    ;(error as Error & { status?: number }).status = 413
    throw error
  }

  const result: CloudState = {
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    state,
  }

  await request('PUT', `${valuesPath('A1:C2')}?valueInputOption=RAW`, {
    range: `'${SHEET_NAME}'!A1:C2`,
    majorDimension: 'ROWS',
    values: [
      ['Revisão', 'Atualizado em', 'Dados do sistema (JSON)'],
      [result.revision, result.updatedAt, serialized],
    ],
  })

  return result
}

export function sendJson(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}
