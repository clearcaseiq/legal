import { describe, expect, it } from 'vitest'
import { namesConflict } from './documentNameCheck'

describe('namesConflict', () => {
  it('flags a document naming an entirely different person', () => {
    expect(namesConflict('Maria Gonzalez', 'John Smith')).toBe(true)
  })

  it('accepts married/maiden names and nicknames that share a token', () => {
    expect(namesConflict('Jane Smith', 'Jane Doe')).toBe(false)
    expect(namesConflict('Robert Jones', 'Bob Jones')).toBe(false)
  })

  it('ignores case, punctuation, initials and honorifics', () => {
    expect(namesConflict('SMITH, JOHN A', 'John Smith')).toBe(false)
    expect(namesConflict('Dr. A Lee', 'Mr. A Park')).toBe(true)
  })

  it('stays silent when either name is unreadable', () => {
    expect(namesConflict(null, 'John Smith')).toBe(false)
    expect(namesConflict('John Smith', '')).toBe(false)
  })
})
