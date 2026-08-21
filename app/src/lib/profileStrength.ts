/**
 * Attorney profile strength.
 *
 * This checklist used to live inline in the dashboard shell. It now has two
 * callers — the dashboard home tile and the profile Overview meter — and the
 * one thing that must not happen is the same attorney being shown two different
 * percentages on two screens, so the criteria live here and nowhere else.
 *
 * The four items are carried over unchanged from the dashboard implementation.
 * Adding or reweighting one moves every attorney's score, so treat a change
 * here as a product decision rather than a refactor.
 */

export type ProfileStrengthItem = {
  /** Shown verbatim in the "how to improve" list. */
  label: string
  done: boolean
}

export type ProfileStrengthInput = {
  photoUrl?: string | null
  /** The practice description, already resolved from whichever source has it. */
  bio?: string | null
  languages?: ReadonlyArray<string | null | undefined> | null
  totalSettlements?: number | null
}

export type ProfileStrength = {
  items: ProfileStrengthItem[]
  /** Whole percent, 0-100. With four equal items it moves in steps of 25. */
  percent: number
  /** The unfinished items, in checklist order. */
  missing: ProfileStrengthItem[]
}

export function computeProfileStrength(input: ProfileStrengthInput): ProfileStrength {
  const items: ProfileStrengthItem[] = [
    { label: 'Headshot', done: Boolean(input.photoUrl) },
    { label: 'Practice Description', done: Boolean(String(input.bio || '').trim()) },
    {
      label: 'Spanish Language',
      done: (input.languages || []).some((language) =>
        String(language || '').toLowerCase().includes('spanish'),
      ),
    },
    { label: 'Settlement History', done: Number(input.totalSettlements || 0) > 0 },
  ]

  const done = items.filter((item) => item.done).length
  return {
    items,
    percent: Math.round((done / items.length) * 100),
    missing: items.filter((item) => !item.done),
  }
}
