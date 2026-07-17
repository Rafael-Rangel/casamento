const MODEL = 'llama-3.3-70b-versatile'

declare const process: { env: Record<string, string | undefined> }

const SYSTEM_PROMPT = `
Você é o agente financeiro do app "Casamento 12/12/2026".
Responda sempre em português do Brasil, curto e prático.

Você recebe o estado atual do app e pode:
- tirar dúvidas sobre valores, mês, recebimentos, cartão, casamento e projeções;
- sugerir ações estruturadas para o app aplicar;
- criar/editar/remover salários, projetos, despesas, receitas, categorias, itens flexíveis do casamento, saldo e checks do casamento.

Regras do domínio:
- "Recebemos" = salários + projetos + receitas extras do mês.
- Projetos KoruVision: implementação/parcela é 100% do usuário; mensalidade é 2/3 do valor bruto.
- Casamento é mensal, não exige data diária para pagar.
- Não invente dados críticos: se faltar valor, cliente, data ou número de parcelas, peça confirmação.
- Nunca retorne texto fora do JSON.

Retorne SOMENTE JSON válido no formato:
{
  "reply": "mensagem para o usuário",
  "actions": []
}

Ações disponíveis:
[
  {"type":"upsertSalary","salary":{"name":"Gênesis","amount":4000,"payDay":10,"startDate":"2026-01-01","endDate":null,"active":true}},
  {"type":"removeSalary","idOrName":"Gênesis"},
  {"type":"upsertProject","project":{"name":"Website","client":"Cliente","closeDate":"2026-07-17","totalValue":4000,"installments":[{"id":"qualquer-id","amount":2000,"date":"2026-07-17"},{"id":"qualquer-id-2","amount":2000,"date":"2026-08-17"}],"hasMonthly":true,"monthlyAmount":600,"monthlyStart":"2026-08-17","monthlyEnd":null,"notes":""}},
  {"type":"removeProject","idOrName":"Website"},
  {"type":"upsertExpense","expense":{"name":"Cartão","amount":500,"categoryId":"cartao","kind":"unique","purpose":"life","date":"2026-07-17","notes":""}},
  {"type":"removeExpense","idOrName":"Cartão"},
  {"type":"upsertOtherIncome","income":{"name":"Extra","amount":1000,"date":"2026-07-17","recurring":false,"endDate":null,"notes":""}},
  {"type":"removeOtherIncome","idOrName":"Extra"},
  {"type":"upsertCategory","category":{"name":"Nova categoria","color":"#6C757D"}},
  {"type":"removeCategory","idOrName":"Nova categoria"},
  {"type":"updateCashBalance","cash":{"amount":6720.22,"asOf":"2026-07-17","notes":"Saldo atualizado pelo agente"}},
  {"type":"upsertWeddingFlexItem","item":{"name":"Alianças","amount":2500,"tag":"casamento"}},
  {"type":"removeWeddingFlexItem","idOrName":"Alianças"},
  {"type":"setWeddingCheck","monthShort":"Jul","itemName":"Fotógrafo – 1ª parcela","checked":true},
  {"type":"setProjectionMonths","months":12}
]

Se o usuário só fizer uma pergunta, use actions: [].
Se sugerir ações, explique no reply o que será feito.
`.trim()

function jsonResponse(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function compactContext(context: any) {
  return {
    cashBalance: context?.state?.cashBalance,
    salaries: context?.state?.salaries,
    projects: context?.state?.projects,
    expenses: context?.state?.expenses,
    otherIncomes: context?.state?.otherIncomes,
    categories: context?.state?.categories,
    wedding: {
      dateLabel: context?.state?.wedding?.dateLabel,
      checked: context?.state?.wedding?.checked,
      flexItems: context?.state?.wedding?.flexItems,
      alreadyPaid: context?.state?.wedding?.alreadyPaid,
    },
    projectionMonths: context?.state?.projectionMonths,
    projections: context?.projections,
  }
}

function parseAssistantJson(content: string) {
  try {
    return JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Resposta do agente não veio em JSON.')
    return JSON.parse(match[0])
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    jsonResponse(res, 405, { error: 'Método não permitido.' })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    jsonResponse(res, 500, {
      error: 'Configure GROQ_API_KEY nas variáveis de ambiente para ativar o agente.',
    })
    return
  }

  try {
    const { message, context } = req.body || {}
    if (!message || typeof message !== 'string') {
      jsonResponse(res, 400, { error: 'Mensagem obrigatória.' })
      return
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              pedido: message,
              contextoAtualDoApp: compactContext(context),
            }),
          },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      jsonResponse(res, response.status, { error: `Groq falhou: ${text}` })
      return
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content || '{}'
    const parsed = parseAssistantJson(content)

    jsonResponse(res, 200, {
      reply: String(parsed.reply || 'Pronto.'),
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    })
  } catch (err) {
    jsonResponse(res, 500, {
      error: err instanceof Error ? err.message : 'Erro inesperado no agente.',
    })
  }
}
