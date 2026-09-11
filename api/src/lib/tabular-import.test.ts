import { describe, expect, it } from 'vitest'
import {
  TabularParseError,
  detectDelimiter,
  flattenRow,
  parseTabularText,
  sniffFormat,
  stripBom,
} from './tabular-import'

describe('deciding what the file is', () => {
  it('reads JSON as JSON whatever the file was named', () => {
    expect(sniffFormat('{"a":1}')).toBe('json')
    expect(sniffFormat('[{"a":1}]')).toBe('json')
  })

  it('reads anything else as delimited', () => {
    expect(sniffFormat('name,email\nDana,d@x.com')).toBe('delimited')
  })

  it('sees past leading whitespace', () => {
    expect(sniffFormat('\n\n  {"a":1}')).toBe('json')
  })

  it('sees past a byte order mark', () => {
    expect(sniffFormat('\uFEFF{"a":1}')).toBe('json')
    expect(stripBom('\uFEFFa,b')).toBe('a,b')
  })
})

describe('quoted cells', () => {
  it('keeps a newline inside a quoted cell in that cell', () => {
    // The bug this parser was written for. Splitting on newlines first turned
    // one multi-line description into two malformed rows and shifted every
    // later column one place left for the rest of the file.
    const csv = 'Client,Description,DOL\n' + 'Dana,"Rear-ended at a light.\nTaken by ambulance.",2024-03-04\n'

    const table = parseTabularText(csv)

    expect(table.rows).toHaveLength(1)
    expect(table.rows[0].Description).toBe('Rear-ended at a light.\nTaken by ambulance.')
    expect(table.rows[0].DOL).toBe('2024-03-04')
  })

  it('does not let the row after a multi-line cell shift', () => {
    const csv =
      'Client,Description,DOL\n' +
      'Dana,"Line one\nLine two",2024-03-04\n' +
      'Sam,Simple,2024-05-06\n'

    const table = parseTabularText(csv)

    expect(table.rows).toHaveLength(2)
    expect(table.rows[1]).toMatchObject({ Client: 'Sam', DOL: '2024-05-06' })
  })

  it('keeps a delimiter inside a quoted cell', () => {
    const table = parseTabularText('Client,Injuries\nDana,"Neck, back, shoulder"\n')
    expect(table.rows[0].Injuries).toBe('Neck, back, shoulder')
  })

  it('reads a doubled quote as one quote', () => {
    const table = parseTabularText('Client,Note\nDana,"She said ""no"" twice"\n')
    expect(table.rows[0].Note).toBe('She said "no" twice')
  })

  it('handles CRLF line endings', () => {
    const table = parseTabularText('a,b\r\n1,2\r\n')
    expect(table.rows).toEqual([{ a: '1', b: '2' }])
  })

  it('ignores blank lines rather than making empty rows of them', () => {
    const table = parseTabularText('a,b\n1,2\n\n\n3,4\n')
    expect(table.rows).toHaveLength(2)
  })
})

describe('the delimiter', () => {
  it('finds a semicolon export', () => {
    expect(detectDelimiter('name;email;dol')).toBe(';')
    expect(parseTabularText('name;email\nDana;d@x.com').rows[0]).toEqual({
      name: 'Dana',
      email: 'd@x.com',
    })
  })

  it('finds a tab export', () => {
    expect(detectDelimiter('name\temail\tdol')).toBe('\t')
  })

  it('is not fooled by commas inside a quoted header', () => {
    // A semicolon file whose first column is quoted and contains commas used
    // to be read as a comma file, which produced one nonsense row per line.
    expect(detectDelimiter('"Client, full name";email;dol')).toBe(';')
  })

  it('prefers a comma when nothing else appears', () => {
    expect(detectDelimiter('onlyonecolumn')).toBe(',')
  })
})

describe('column names', () => {
  it('names a blank header by position instead of collapsing them', () => {
    const table = parseTabularText('a,,b\n1,2,3\n')
    expect(table.headers).toEqual(['a', 'Column 2', 'b'])
    expect(table.rows[0]).toMatchObject({ a: '1', 'Column 2': '2', b: '3' })
  })

  it('keeps both of two columns with the same name', () => {
    const table = parseTabularText('email,email\na@x.com,b@x.com\n')
    expect(table.headers).toEqual(['email', 'email (2)'])
  })

  it('fills a short row rather than dropping its columns', () => {
    const table = parseTabularText('a,b,c\n1,2\n')
    expect(table.rows[0]).toEqual({ a: '1', b: '2', c: '' })
  })
})

describe('JSON shapes', () => {
  it('reads an array of cases', () => {
    const table = parseTabularText('[{"email":"a@x.com"},{"email":"b@x.com"}]')
    expect(table.rows).toHaveLength(2)
  })

  it('reads cases out of an envelope', () => {
    const table = parseTabularText('{"matters":[{"email":"a@x.com"}]}')
    expect(table.rows).toHaveLength(1)
  })

  it('reads one object as one case', () => {
    const table = parseTabularText('{"client":{"email":"a@x.com"}}')
    expect(table.rows).toEqual([{ 'client.email': 'a@x.com' }])
  })

  it('reads one object per line', () => {
    const table = parseTabularText('{"email":"a@x.com"}\n{"email":"b@x.com"}\n')
    expect(table.format).toBe('ndjson')
    expect(table.rows).toHaveLength(2)
  })

  it('takes the union of keys across sparse rows', () => {
    // An export that omits empty fields rather than nulling them would
    // otherwise lose every column the first case happens not to have.
    const table = parseTabularText('[{"a":1},{"b":2}]')
    expect(table.headers).toEqual(['a', 'b'])
  })
})

describe('flattening', () => {
  it('keys nested objects by dotted path', () => {
    expect(flattenRow({ case: { incident_date: '2024-03-04' } })).toEqual({
      'case.incident_date': '2024-03-04',
    })
  })

  it('joins an array into one cell', () => {
    expect(flattenRow({ injuries: ['Neck', 'Back'] })).toEqual({ injuries: 'Neck; Back' })
  })

  it('keeps a null as an empty cell rather than the text "null"', () => {
    expect(flattenRow({ a: null })).toEqual({ a: '' })
  })
})

describe('what it says when it cannot read a file', () => {
  const reason = (content: string) => {
    try {
      parseTabularText(content)
      return null
    } catch (error) {
      return error instanceof TabularParseError ? error.message : `wrong error: ${error}`
    }
  }

  it('says a file is empty', () => {
    expect(reason('')).toBe('This file is empty.')
  })

  it('explains a JSON file it could not read', () => {
    expect(reason('{"a": }')).toMatch(/looks like JSON but could not be read/)
  })

  it('says so when JSON holds no cases', () => {
    expect(reason('[]')).toMatch(/no cases/)
  })

  it('suspects the separator when only one column turns up', () => {
    // Rather than handing back a mapping screen with one unusable column,
    // which is what "No columns detected in this file" used to mean.
    expect(reason('Matter Report\nDana Reyes\nSam Okafor\n')).toMatch(/Only one column was found/)
  })

  it('names the separator it tried', () => {
    expect(reason('a|b\n1|2\n')).toBeNull()
    expect(reason('just one\nrow here\n')).toContain('","')
  })

  it('fails with a reason rather than throwing something raw', () => {
    expect(() => parseTabularText('{"a": }')).toThrow(TabularParseError)
  })
})
