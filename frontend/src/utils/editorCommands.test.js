import test from 'node:test'
import assert from 'node:assert/strict'
import {
  autoIndentOnEnter,
  bracketPairAt,
  commentMarkerFor,
  computeMatches,
  deleteLines,
  indentLines,
  moveLines,
  offsetAt,
  positionAt,
  toggleComment,
} from './editorCommands.js'

test('positionAt and offsetAt are inverses on a sample document', () => {
  const text = 'const a = 1\nconst b = 2\n'
  assert.deepEqual(positionAt(text, 0), { line: 1, column: 1 })
  assert.deepEqual(positionAt(text, 12), { line: 2, column: 1 })
  assert.equal(offsetAt(text, 2, 1), 12)
  assert.equal(offsetAt(text, 1, 7), 6)
})

test('toggleComment comments and uncomments a selection', () => {
  const text = 'const a = 1\nconst b = 2'
  const commented = toggleComment(text, 0, text.length, '//')

  assert.equal(commented.text, '// const a = 1\n// const b = 2')

  const back = toggleComment(commented.text, 0, commented.text.length, '//')
  assert.equal(back.text, text)
})

test('toggleComment keeps indentation and skips blank lines', () => {
  const text = '  if (x) {\n\n    y()\n  }'
  const result = toggleComment(text, 0, text.length, '//')

  assert.equal(result.text, '  // if (x) {\n\n    // y()\n  // }')
})

test('indentLines adds and removes a tab level', () => {
  const text = 'a\nb'
  const indented = indentLines(text, 0, text.length, 2, 1)
  assert.equal(indented.text, '  a\n  b')

  const dedented = indentLines(indented.text, 0, indented.text.length, 2, -1)
  assert.equal(dedented.text, 'a\nb')
})

test('moveLines swaps the selected block with its neighbour', () => {
  const text = 'one\ntwo\nthree'
  const down = moveLines(text, 4, 6, 1)

  assert.equal(down.text, 'one\nthree\ntwo')
  assert.deepEqual(down.selection, { start: 10, end: 12 })

  const up = moveLines(down.text, 10, 12, -1)
  assert.equal(up.text, text)
})

test('moveLines refuses to move past the document edges', () => {
  const text = 'one\ntwo'
  assert.equal(moveLines(text, 0, 2, -1).text, text)
  assert.equal(moveLines(text, 8, 10, 1).text, text)
})

test('deleteLines removes whole lines and places the caret sensibly', () => {
  const text = 'one\ntwo\nthree'
  const result = deleteLines(text, 4, 6)

  assert.equal(result.text, 'one\nthree')
  assert.deepEqual(result.selection, { start: 4, end: 4 })
})

test('autoIndentOnEnter keeps indentation and opens a block', () => {
  const text = 'if (x) {\n  run()'
  const result = autoIndentOnEnter(text, text.length, 2)

  assert.equal(result.text, 'if (x) {\n  run()\n  ')
  assert.equal(result.selection.start, result.text.length)
})

test('autoIndentOnEnter at top level adds nothing', () => {
  const result = autoIndentOnEnter('const a = 1', 12, 2)
  assert.equal(result.text, 'const a = 1\n')
})

test('computeMatches finds all occurrences, case-insensitively by default', () => {
  const matches = computeMatches('Foo foo FOO', 'foo')

  assert.equal(matches.length, 3)
  assert.deepEqual(matches[0], { start: 0, end: 3 })
})

test('computeMatches respects matchCase and regex', () => {
  assert.equal(computeMatches('Foo foo', 'foo', { matchCase: true }).length, 1)
  assert.equal(computeMatches('a1 a2 a3', 'a\\d', { regex: true }).length, 3)
  assert.equal(computeMatches('abc', '[', { regex: true }).length, 0)
})

test('computeMatches returns nothing for an empty query', () => {
  assert.deepEqual(computeMatches('abc', ''), [])
})

test('bracketPairAt finds the matching pair around the caret', () => {
  // "call(a, (b))" — the outer "(" at 4 closes at the final ")" at 11.
  const text = 'call(a, (b))'
  const pair = bracketPairAt(text, 5)

  assert.deepEqual(pair, { open: 4, close: 11 })
})

test('bracketPairAt ignores brackets inside strings', () => {
  // 'call(")", x)' — the ")" inside the string must not close the call; the
  // real closing bracket is the final character at index 11.
  const text = 'call(")", x)'
  const pair = bracketPairAt(text, 5)

  assert.deepEqual(pair, { open: 4, close: 11 })
})

test('bracketPairAt returns null outside any bracket', () => {
  assert.equal(bracketPairAt('plain text', 3), null)
})

test('commentMarkerFor picks the right marker per language', () => {
  assert.equal(commentMarkerFor('javascript'), '//')
  assert.equal(commentMarkerFor('python'), '#')
  assert.equal(commentMarkerFor('sql'), '--')
})
