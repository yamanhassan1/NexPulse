import test from 'node:test'
import assert from 'node:assert/strict'
import { countIndentLevels, guideColumns, visibleLineRange } from './indentGuides.js'

test('countIndentLevels counts space indentation', () => {
  assert.equal(countIndentLevels('', 2), 0)
  assert.equal(countIndentLevels('x', 2), 0)
  assert.equal(countIndentLevels('  x', 2), 1)
  assert.equal(countIndentLevels('    x', 2), 2)
  assert.equal(countIndentLevels('     x', 2), 2, 'partial indentation is not a level')
  assert.equal(countIndentLevels('    x', 4), 1)
})

test('countIndentLevels expands tabs to the next tab stop', () => {
  assert.equal(countIndentLevels('\tx', 2), 1)
  assert.equal(countIndentLevels('\t\tx', 2), 2)
  assert.equal(countIndentLevels('  \tx', 4), 1)
  assert.equal(countIndentLevels('\tx', 4), 1)
})

test('countIndentLevels ignores whitespace after code', () => {
  assert.equal(countIndentLevels('const a = 1  ', 2), 0)
})

test('guideColumns returns one column per level', () => {
  assert.deepEqual(guideColumns('', 2), [])
  assert.deepEqual(guideColumns('    x', 2), [2, 4])
  assert.deepEqual(guideColumns('        x', 2), [2, 4, 6, 8])
})

test('guideColumns clamps absurd indentation', () => {
  const deep = `${' '.repeat(200)}x`
  assert.equal(guideColumns(deep, 2, 12).length, 12)
})

test('visibleLineRange covers the viewport', () => {
  const range = visibleLineRange({ scrollTop: 0, viewportHeight: 200, lineHeight: 20, paddingTop: 12, lineCount: 100 })
  assert.equal(range.first, 0)
  assert.ok(range.last >= 9)
})

test('visibleLineRange shifts with scroll and never exceeds the document', () => {
  const range = visibleLineRange({ scrollTop: 400, viewportHeight: 200, lineHeight: 20, paddingTop: 12, lineCount: 50 })
  assert.ok(range.first >= 19)
  assert.ok(range.last <= 49)
})

test('visibleLineRange handles an empty document', () => {
  assert.deepEqual(visibleLineRange({ lineCount: 0 }), { first: 0, last: -1 })
})
