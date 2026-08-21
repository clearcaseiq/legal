/**
 * The placeholder avatar has rendered the wrong letters twice now: first "AT"
 * (the first two letters of the literal word "Attorney") and then "TE" for
 * "Toya Marteen, Esq." once the real name was passed through, because
 * ui-avatars takes the first and last word and the last word was the honorific.
 * These cases pin the letters that actually reach the circle.
 */
import { it, expect } from 'vitest'
import { nameInitials, fallbackAvatar } from './avatar'

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
