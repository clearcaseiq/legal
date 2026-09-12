/**
 * A texted photo arrives with no category, and `category` is what decides
 * whether its dollars reach medical specials, whether it clears an attorney's
 * document request, and whether it is flagged HIPAA. Leaving every texted file
 * in `other` would file the document and then ignore it.
 */
import { describe, expect, it } from 'vitest'

import { promotedCategory } from './evidence-processing'

describe('a document nobody categorised', () => {
  it('takes the classification when it arrived by text', () => {
    expect(promotedCategory('other', 'sms', 'medical_records')).toBe('medical_records')
  })

  it('stays put when the classifier had no opinion either', () => {
    expect(promotedCategory('other', 'sms', 'other')).toBeNull()
    expect(promotedCategory('other', 'sms', '')).toBeNull()
  })

  it('ignores a classification that is not a category we file under', () => {
    expect(promotedCategory('other', 'sms', 'something_invented')).toBeNull()
  })
})

describe('a document someone categorised', () => {
  it('is never overwritten by a keyword match', () => {
    // The classifier is a fallback for when nobody was asked, not a second
    // opinion on a choice a person already made.
    expect(promotedCategory('photos', 'sms', 'medical_records')).toBeNull()
  })

  it('is left alone on the upload path entirely', () => {
    // Uploads carry an uploader-chosen category, including a deliberate "other".
    expect(promotedCategory('other', 'drag_drop', 'medical_records')).toBeNull()
    expect(promotedCategory('other', 'file_picker', 'bills')).toBeNull()
    expect(promotedCategory('other', null, 'bills')).toBeNull()
  })
})

describe('a document sent through the texted upload link', () => {
  // The link's uploader offers the requested documents but does not force a
  // choice, so a claimant who just sends a photo arrives uncategorised for the
  // same reason a texter does — and needs the same rescue.
  it('takes the classification when the sender picked nothing', () => {
    expect(promotedCategory('other', 'upload_link', 'bills')).toBe('bills')
  })

  it('keeps the category when the sender said which document it was', () => {
    expect(promotedCategory('photos', 'upload_link', 'medical_records')).toBeNull()
  })
})
