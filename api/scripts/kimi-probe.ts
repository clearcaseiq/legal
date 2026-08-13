import OpenAI from 'openai'
import { ENV } from '../src/env'

async function main() {
  const c = new OpenAI({ apiKey: ENV.KIMI_API_KEY!, baseURL: ENV.KIMI_BASE_URL })
  const model = ENV.KIMI_MODEL || 'kimi-k3'
  const r = await c.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Return JSON only: {"ok":true,"n":1}' }],
    temperature: 1,
    max_tokens: 256,
    response_format: { type: 'json_object' },
  })
  const msg: any = r.choices[0]?.message
  console.log(
    JSON.stringify(
      {
        model,
        finish: r.choices[0]?.finish_reason,
        usage: r.usage,
        content: msg?.content,
        refusal: msg?.refusal,
        keys: Object.keys(msg || {}),
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e?.status, e?.message)
  process.exit(1)
})
