/**
 * Set the attorney "response deadline" — how long a routed match stays open in
 * an attorney's New Matches before it expires.
 *
 * Stored in the matching_rules routing config; goes through saveMatchingRules so
 * the value is merged/validated exactly like the admin screen does.
 *
 * Usage (inside the api container):
 *   docker exec -w /app -e MINUTES=20 clearcaseiq-api \
 *     node ../node_modules/tsx/dist/cli.mjs scripts/set-response-deadline.ts
 *
 * Config:
 *   MINUTES   new deadline in minutes (default 20)
 */
import { getMatchingRules, saveMatchingRules } from '../src/lib/matching-rules-config'

const MINUTES = Math.max(1, Math.round(Number(process.env.MINUTES || 20)))

async function main() {
  const before = await getMatchingRules()
  console.log(`Current attorney response deadline: ${before.defaultAttorneyResponseDeadlineMinutes} min`)

  const updated = await saveMatchingRules({
    defaultAttorneyResponseDeadlineMinutes: MINUTES,
    // Clear the legacy hours field so it can't override the minutes value.
    defaultAttorneyResponseDeadlineHours: undefined,
  })

  console.log(`Updated attorney response deadline: ${updated.defaultAttorneyResponseDeadlineMinutes} min`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
