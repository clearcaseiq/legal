import { getLlmChatClient, LLM_CHAT_MODEL, isKimiProvider } from '../src/lib/llm-client'

async function main() {
  const client = getLlmChatClient()
  console.log('provider kimi?', isKimiProvider(), 'model:', LLM_CHAT_MODEL)
  if (!client) {
    console.error('No LLM client configured')
    process.exit(1)
  }
  const completion = await client.chat.completions.create({
    model: LLM_CHAT_MODEL,
    messages: [{ role: 'user', content: 'Reply with exactly: KIMI_OK' }],
    max_tokens: 512,
  })
  console.log('finish_reason:', completion.choices[0]?.finish_reason)
  console.log('usage:', JSON.stringify(completion.usage))
  console.log('response:', JSON.stringify(completion.choices[0]?.message?.content))
}

main().catch((e) => {
  console.error('ERROR:', e?.status, e?.message)
  process.exit(1)
})
