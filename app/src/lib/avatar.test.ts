/**
 * The placeholder avatar has rendered the wrong letters twice now: first "AT"
 * (the first two letters of the literal word "Attorney") and then "TE" for
 * "Toya Marteen, Esq." once the real name was passed through, because
 * ui-avatars takes the first and last word and the last word was the honorific.
 * These cases pin the letters that actually reach the circle.
 */
import { it, expect } from 'vitest'
import { nameInitials, fallbackAvatar, attorneyDisplayName } from './avatar'

it('uses first and last name initials', () => {
  expect(nameInitials('Jane Smith')).toBe('JS')
})

it('ignores a trailing honorific so the surname wins', () => {
  expect(nameInitials('Toya Marteen, Esq.')).toBe('TM')
  expect(nameInitials('Toya Marteen Esq')).toBe('TM')
  expect(nameInitials('Robert Downey Jr.')).toBe('RD')
  expect(nameInitials('Alan Reyes III')).toBe('AR')
  expect(nameInitials('Priya Raman, J.D.')).toBe('PR')
})

it('ignores a leading title', () => {
  expect(nameInitials('Dr. Alice Nguyen')).toBe('AN')
})

it('handles middle names by taking the first and the surname', () => {
  expect(nameInitials('Maria de la Cruz')).toBe('MC')
})

it('falls back to a single letter for a one-word name', () => {
  // Never two letters of one word — that is exactly how "Attorney" became "AT".
  expect(nameInitials('Cher')).toBe('C')
  expect(nameInitials('Attorney')).toBe('A')
})

it('keeps a bare honorific rather than returning nothing', () => {
  expect(nameInitials('Esq')).toBe('E')
})

it('returns nothing for an empty or punctuation-only name', () => {
  expect(nameInitials('')).toBe('')
  expect(nameInitials('   ,. ')).toBe('')
})

it('handles non-latin names', () => {
  expect(nameInitials('陈 美玲')).toBe('陈美')
})

it('sends finished initials to ui-avatars, never a full name', () => {
  const url = fallbackAvatar('Toya Marteen, Esq.')
  expect(url).toContain('name=TM')
  expect(url).not.toContain('Marteen')
})

it('uses a neutral letter when there is no name at all', () => {
  expect(fallbackAvatar(null)).toContain('name=A')
  expect(fallbackAvatar('')).toContain('name=A')
})

/**
 * Registration stores the honorific in the name, so the dashboard appending its
 * own produced "Kia Marteen, Esq., Esq." Imported and seeded attorneys have
 * bare names, so the suffix still has to be added when it is missing.
 */
it('adds the honorific only when it is not already there', () => {
  expect(attorneyDisplayName('Kia Marteen, Esq.')).toBe('Kia Marteen, Esq.')
  expect(attorneyDisplayName('William M. Roth Esq')).toBe('William M. Roth Esq')
  expect(attorneyDisplayName('Jane Smith')).toBe('Jane Smith, Esq.')
  expect(attorneyDisplayName('  Jane Smith  ')).toBe('Jane Smith, Esq.')
})

it('treats generational suffixes as part of the name, not the honorific', () => {
  expect(attorneyDisplayName('Alan Reyes III')).toBe('Alan Reyes III, Esq.')
  expect(attorneyDisplayName('Robert Downey Jr.')).toBe('Robert Downey Jr., Esq.')
})

it('returns nothing rather than a bare honorific for a missing name', () => {
  expect(attorneyDisplayName(null)).toBe('')
  expect(attorneyDisplayName('   ')).toBe('')
})
