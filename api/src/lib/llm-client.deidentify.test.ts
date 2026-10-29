import { beforeEach, describe, expect, it, vi } from 'vitest'

const sent: any[] = []

vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: async (body: any) => {
          sent.push(body)
          const user = body.messages.find((m: any) => m.role === 'user')?.content ?? ''
          return { choices: [{ message: { content: JSON.stringify({ echo: user }) } }] }
        },
      },
    }
  },
}))

vi.mock('../env', () => ({
  ENV: { OPENAI_API_KEY: 'sk-test', OPENAI_ANALYSIS_MODEL: 'gpt-test', LLM_ALLOW_PHI: false },
}))

import { ENV } from '../env'
import { getLlmChatClient } from './llm-client'
import { withLlmSubject } from './llm-deidentify'

const NOTE = 'Maria Lopez (DOB 04/12/1958) was seen 03/14/2026 for C5-C6 herniation. Call 310-555-0142.'

async function ask(body: any) {
  const completion: any = await getLlmChatClient()!.chat.completions.create(body)
  return JSON.parse(completion.choices[0].message.content).echo as string
}

describe('chat client de-identification', () => {
  beforeEach(() => {
    sent.length = 0
    ;(ENV as any).LLM_ALLOW_PHI = false
  })

  it('sends placeholders and hands the caller the originals back', async () => {
    const echo = await ask(
      withLlmSubject({ model: 'gpt-test', messages: [{ role: 'user', content: NOTE }] }, { names: ['Maria Lopez'] }),
    )
    const outbound = JSON.stringify(sent[0].messages)
    for (const leak of ['Maria', 'Lopez', '04/12/1958', '03/14/2026', '555-0142']) expect(outbound).not.toContain(leak)
    expect(outbound).toContain('C5-C6 herniation')
    expect(sent[0].messages[0].role).toBe('system')
    expect(sent[0].messages[0].content).toContain('placeholders')
    expect(echo).toBe(NOTE)
  })

  it('leaves placeholders in the answer when restore is off', async () => {
    const echo = await ask(
      withLlmSubject({ model: 'gpt-test', messages: [{ role: 'user', content: NOTE }] }, { names: ['Maria Lopez'], restore: false }),
    )
    expect(echo).toContain('[NAME#1]')
    expect(echo).not.toContain('Maria')
  })

  it('sends identified detail, contact-redacted, once LLM_ALLOW_PHI is on', async () => {
    ;(ENV as any).LLM_ALLOW_PHI = true
    await ask({ model: 'gpt-test', messages: [{ role: 'user', content: NOTE }] })
    const outbound = sent[0].messages[0].content
    expect(outbound).toContain('Maria Lopez')
    expect(outbound).toContain('03/14/2026')
    expect(outbound).not.toContain('555-0142')
  })
})
