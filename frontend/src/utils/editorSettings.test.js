import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SETTINGS,
  lineHeightPx,
  normaliseSettings,
} from './editorSettings.js'

test('defaults are sane', () => {
  assert.equal(DEFAULT_SETTINGS.fontSize, 13)
  assert.equal(DEFAULT_SETTINGS.tabSize, 2)
  assert.equal(DEFAULT_SETTINGS.wordWrap, false)
})

test('normaliseSettings fills in missing keys', () => {
  const settings = normaliseSettings({ fontSize: 16 })

  assert.equal(settings.fontSize, 16)
  assert.equal(settings.tabSize, DEFAULT_SETTINGS.tabSize)
  assert.equal(settings.formatOnSave, true)
})

test('out-of-range values are clamped, not trusted', () => {
  assert.equal(normaliseSettings({ fontSize: 999 }).fontSize, 24)
  assert.equal(normaliseSettings({ fontSize: 1 }).fontSize, 10)
  assert.equal(normaliseSettings({ fontSize: 'abc' }).fontSize, DEFAULT_SETTINGS.fontSize)
  assert.equal(normaliseSettings({ tabSize: 99 }).tabSize, 8)
  assert.equal(normaliseSettings({ lineHeight: 9 }).lineHeight, 2.2)
})

test('booleans normalise strictly', () => {
  assert.equal(normaliseSettings({ wordWrap: 1 }).wordWrap, true)
  assert.equal(normaliseSettings({ wordWrap: 0 }).wordWrap, false)
  // Explicit false must survive; only undefined falls back to the default.
  assert.equal(normaliseSettings({ showLineNumbers: false }).showLineNumbers, false)
  assert.equal(normaliseSettings({}).showLineNumbers, true)
})

test('lineHeightPx is a whole number of pixels', () => {
  assert.equal(lineHeightPx({ fontSize: 13, lineHeight: 1.6 }), 21)
  assert.equal(lineHeightPx({ fontSize: 16, lineHeight: 1.5 }), 24)
  assert.equal(Number.isInteger(lineHeightPx({ fontSize: 11, lineHeight: 1.7 })), true)
})
