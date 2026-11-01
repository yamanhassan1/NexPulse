import test from 'node:test'
import assert from 'node:assert/strict'
import { PROJECT_COLORS, getProjectColor } from './folderColor.js'

test('same name always yields the same colour', () => {
  assert.equal(getProjectColor('NexPulse'), getProjectColor('NexPulse'))
  assert.equal(getProjectColor('NexPulse'), getProjectColor('  nexpulse  '))
})

test('every colour comes from the shared palette', () => {
  const names = ['api', 'web', 'src', 'docs', 'tests', 'design', 'alpha', 'beta', 'gamma']

  names.forEach((name) => {
    assert.ok(PROJECT_COLORS.includes(getProjectColor(name)), `${name} should use a palette colour`)
  })
})

test('empty or missing names fall back to the first colour', () => {
  assert.equal(getProjectColor(), PROJECT_COLORS[0])
  assert.equal(getProjectColor(''), PROJECT_COLORS[0])
})

test('recognisable folder names get their semantic colour', () => {
  assert.equal(getProjectColor('src'), '#34d399')
  assert.equal(getProjectColor('api'), '#fbbf24')
  assert.equal(getProjectColor('docs'), '#60a5fa')
})

test('different names spread across the palette', () => {
  const distinct = new Set(
    ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'].map(getProjectColor),
  )

  assert.ok(distinct.size > 1, 'hashing should not collapse everything to one colour')
})
