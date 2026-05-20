import { createWriteStream } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { config } from 'dotenv'
import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: true })

type RawCase = {
  case_id: string
  source_name: string | null
  source_url: string | null
  author: string | null
  metadata_json: unknown
  opinion_text: string
  opinion_char_count: number | null
  prefilter_label: string | null
  prefilter_score: string | number | null
  has_value_signal: boolean | null
}

function getArg(name: string) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : undefined
}

function getIntArg(name: string, fallback: number) {
  const raw = getArg(name)
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative integer.`)
  }
  return value
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required in api/.env.`)
  return value
}

function getOutputDirectory() {
  const output = getArg('out')
  if (output) return resolve(process.cwd(), output)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return resolve(__dirname, '../../data/ml-labels/sample', stamp)
}

function truncateOpinion(text: string, maxChars: number) {
  if (text.length <= maxChars) return text
  const headChars = Math.floor(maxChars * 0.72)
  const tailChars = maxChars - headChars
  return `${text.slice(0, headChars)}\n\n[...TRUNCATED FOR LABELING...]\n\n${text.slice(-tailChars)}`
}

function safeJsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`
}

function buildPrompt(rawCase: RawCase, maxChars: number) {
  const opinionText = truncateOpinion(rawCase.opinion_text || '', maxChars)

  return [
    'Extract personal-injury ML labels from the legal opinion below.',
    '',
    'Return strict JSON only. Use null when the opinion does not clearly provide a value.',
    'Do not invent facts. Prefer conservative labels with evidence snippets.',
    '',
    'JSON shape:',
    '{',
    '  "case_id": string,',
    '  "is_personal_injury_case": boolean,',
    '  "case_type": "auto_pi" | "premises" | "workplace_injury" | "railroad_transport" | "med_mal" | "product_liability" | "wrongful_death" | "intentional_tort" | "other_pi" | "property_damage" | "not_pi",',
    '  "procedural_posture": string | null,',
    '  "disposition": string | null,',
    '  "liability_summary": string | null,',
    '  "liability_strength": "strong_defendant_liability" | "mixed" | "weak_defendant_liability" | "defense_win" | "unknown",',
    '  "comparative_fault_percent": number | null,',
    '  "injury_summary": string | null,',
    '  "injury_flags": { "surgery": boolean, "tbi": boolean, "fracture": boolean, "spine": boolean, "death": boolean, "permanency": boolean },',
    '  "damages_summary": string | null,',
    '  "settlement_amount": number | null,',
    '  "total_award": number | null,',
    '  "final_recoverable_amount": number | null,',
    '  "economic_damages": number | null,',
    '  "noneconomic_damages": number | null,',
    '  "punitive_damages": number | null,',
    '  "medical_expenses": number | null,',
    '  "lost_wages": number | null,',
    '  "evidence": { "liability": string[], "injury": string[], "damages": string[] },',
    '  "confidence": number',
    '}',
    '',
    'Taxonomy rules:',
    '- auto_pi: motor vehicle road collisions only, such as car, truck, bus, motorcycle, pedestrian, or bicycle crashes.',
    '- railroad_transport: train, streetcar, rail crossing, rail passenger, rail worker, or rail equipment injury. Do not label these auto_pi.',
    '- workplace_injury: employee or worker injured at work, including mines, factories, construction, industrial equipment, employer negligence, or unsafe workplace conditions.',
    '- premises: land/building/sidewalk/store/residential premises conditions, slip/trip/fall, negligent maintenance, unsafe stairs, holes, ice, or similar premises defects.',
    '- med_mal: medical, hospital, physician, nursing, diagnosis, treatment, or surgical negligence.',
    '- product_liability: defective product, machine, tool, design/manufacturing defect, or failure to warn.',
    '- wrongful_death: death claim arising from injury/tort facts, but only when the opinion explicitly says death, died, killed, fatal, deceased, decedent, estate, administrator, survival action, or wrongful death. Severe injury, permanent injury, paralysis, amputation, or catastrophic injury alone is not wrongful_death.',
    '- intentional_tort: assault, battery, false imprisonment, intentional infliction, or other intentional personal injury.',
    '- property_damage: property-only economic loss, damaged goods, repossession, contract/commercial disputes, or vehicle/property damage without bodily injury.',
    '- other_pi: plaintiff-side bodily injury that does not fit the above.',
    '- not_pi: no plaintiff-side personal injury or wrongful death claim.',
    '',
    'Classification precedence:',
    '1. If there is explicit death/decedent/estate/survival/wrongful-death language from tort/injury facts, use wrongful_death.',
    '2. If bodily injury happened while working or in a mine/factory/construction workplace, use workplace_injury unless the case is strictly med_mal or product_liability.',
    '3. If injury involves trains, railroads, streetcars, crossings, or rail equipment, use railroad_transport, not auto_pi.',
    '4. Use auto_pi only for road motor vehicle crashes.',
    '5. Use property_damage or not_pi for property-only/value-only disputes, even if damages are discussed.',
    '',
    `Case ID: ${rawCase.case_id}`,
    `Source: ${rawCase.source_name || 'unknown'}`,
    `Source URL: ${rawCase.source_url || 'unknown'}`,
    `Opinion char count: ${rawCase.opinion_char_count ?? opinionText.length}`,
    '',
    'Opinion text:',
    opinionText,
  ].join('\n')
}

function parseJsonObject(content: string) {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return JSON.parse(trimmed)

  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('LLM response did not contain a JSON object.')
  return JSON.parse(match[0])
}

async function main() {
  const limit = getIntArg('limit', 100)
  const offset = getIntArg('offset', 0)
  const maxChars = getIntArg('max-chars', 60000)
  const model = getArg('model') || process.env.ML_LABELING_MODEL || 'gpt-4o-mini'
  const outputDir = getOutputDirectory()
  const dryRun = process.argv.includes('--dry-run')

  const databaseUrl = requireEnv('SUPABASE_DATABASE_URL')
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  const openai = dryRun ? null : new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') })

  await mkdir(outputDir, { recursive: true })
  const labelsPath = resolve(outputDir, 'case-labels.jsonl')
  const errorsPath = resolve(outputDir, 'case-label-errors.jsonl')
  const labels = createWriteStream(labelsPath, { flags: 'a', encoding: 'utf8' })
  const errors = createWriteStream(errorsPath, { flags: 'a', encoding: 'utf8' })

  let labeled = 0
  let failed = 0

  try {
    const cases = await prisma.$queryRawUnsafe<RawCase[]>(
      `select case_id, source_name, source_url, author, metadata_json, opinion_text, opinion_char_count, prefilter_label, prefilter_score, has_value_signal
       from public.cases_raw
       where prefilter_label = 'keep'
       order by case_id
       limit ${limit} offset ${offset}`,
    )

    if (dryRun) {
      const firstPrompt = cases[0] ? buildPrompt(cases[0], maxChars) : ''
      await writeFile(resolve(outputDir, 'dry-run-first-prompt.txt'), firstPrompt, 'utf8')
      console.log(`Dry run complete. Wrote first prompt to ${resolve(outputDir, 'dry-run-first-prompt.txt')}`)
      return
    }

    for (const rawCase of cases) {
      try {
        const prompt = buildPrompt(rawCase, maxChars)
        const completion = await openai!.chat.completions.create({
          model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are a careful legal data labeling assistant. Return only valid JSON and never invent missing values.',
            },
            { role: 'user', content: prompt },
          ],
        })

        const content = completion.choices[0]?.message?.content || ''
        const parsed = parseJsonObject(content)
        labels.write(
          safeJsonLine({
            case_id: rawCase.case_id,
            source_name: rawCase.source_name,
            opinion_char_count: rawCase.opinion_char_count,
            model,
            labeled_at: new Date().toISOString(),
            label: parsed,
          }),
        )
        labeled += 1
        console.log(`labeled ${labeled}/${cases.length}: ${rawCase.case_id}`)
      } catch (error) {
        failed += 1
        errors.write(
          safeJsonLine({
            case_id: rawCase.case_id,
            failed_at: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          }),
        )
        console.warn(`failed ${rawCase.case_id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    await writeFile(
      resolve(outputDir, 'manifest.json'),
      `${JSON.stringify(
        {
          created_at: new Date().toISOString(),
          model,
          limit,
          offset,
          maxChars,
          labeled,
          failed,
          labelsPath,
          errorsPath,
        },
        null,
        2,
      )}\n`,
      'utf8',
    )
  } finally {
    labels.end()
    errors.end()
    await prisma.$disconnect()
  }

  console.log(`Done. Labeled ${labeled}, failed ${failed}. Output: ${outputDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
