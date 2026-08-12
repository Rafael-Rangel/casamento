export function fmt(value: number, compact = false) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: compact ? 0 : 2,
  }).format(value)
}

export function fmtSigned(value: number) {
  const formatted = fmt(Math.abs(value))
  if (value > 0) return `+${formatted}`
  if (value < 0) return `−${formatted}`
  return formatted
}

/** Exibe número no padrão BR: 1.545,75 */
export function formatBrMoney(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ''
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Normaliza vírgulas “estranhas” do teclado pra vírgula comum. */
function normalizeMoneyChars(raw: string): string {
  return String(raw || '')
    .replace(/[，､٫‚¸]/g, ',')
    .replace(/[．]/g, '.')
}

/**
 * Aceita formatos BR e simples — vírgula = centavos:
 * - 10,50 / 0,99 / ,50
 * - 10.353,65 / 1.545,75
 * - 1545,75 / 1545.75 / 1545
 */
export function parseBrMoney(raw: string): number {
  let s = normalizeMoneyChars(raw).trim().replace(/[^\d.,-]/g, '')
  if (!s || s === '-' || s === '.' || s === ',') return NaN

  const negative = s.startsWith('-')
  if (negative) s = s.slice(1)

  // ",50" → "0,50"
  if (s.startsWith(',')) s = `0${s}`

  let normalized: string
  if (s.includes(',')) {
    // Vírgula = decimal/centavos; pontos = milhar
    const [intPart, decPart = ''] = s.split(',')
    const ints = intPart.replace(/\./g, '')
    const cents = decPart.replace(/\D/g, '').slice(0, 2)
    normalized = cents.length ? `${ints || '0'}.${cents}` : ints || '0'
  } else {
    const parts = s.split('.')
    if (parts.length === 1) {
      normalized = s
    } else if (parts.length === 2 && parts[1].length <= 2) {
      // 10.5 / 10.50 → decimal
      normalized = s
    } else {
      // 1.545 / 10.353 → milhar
      normalized = s.replace(/\./g, '')
    }
  }

  const n = Number(normalized)
  if (!Number.isFinite(n)) return NaN
  return negative ? -Math.abs(n) : n
}

/** Digitando valor: dígitos, ponto (milhar) e vírgula (centavos). */
export function sanitizeBrMoneyInput(raw: string): string {
  const s = normalizeMoneyChars(raw)
  let out = ''
  let sawComma = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch >= '0' && ch <= '9') {
      if (sawComma) {
        const after = out.split(',')[1] || ''
        if (after.length >= 2) continue
      }
      out += ch
      continue
    }
    // Vírgula = centavos (só uma)
    if ((ch === ',') && !sawComma) {
      sawComma = true
      if (out === '' || out === '-') out += '0'
      out += ','
      continue
    }
    // Ponto = milhar (só antes da vírgula)
    if (ch === '.' && !sawComma) {
      out += ch
      continue
    }
    if (ch === '-' && out.length === 0) out += ch
  }
  return out
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function uid() {
  return crypto.randomUUID()
}
