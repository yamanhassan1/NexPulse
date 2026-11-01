import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FOLDER_ICON_BODIES,
  getFolderIconBody,
  getFolderIconKey,
} from './materialFolders.js'

test('known folder names resolve to their Material icon', () => {
  assert.equal(getFolderIconKey('src'), 'src')
  assert.equal(getFolderIconKey('node_modules'), 'node')
  assert.equal(getFolderIconKey('.git'), 'git')
  assert.equal(getFolderIconKey('docs'), 'docs')
})

test('matching is case and whitespace insensitive', () => {
  assert.equal(getFolderIconKey('  SRC '), 'src')
  assert.equal(getFolderIconKey('Pages'), 'views')
})

test('unknown names fall back to the neutral folder', () => {
  assert.equal(getFolderIconKey('some-random-folder'), 'base')
  assert.equal(getFolderIconKey(), 'base')
})

test('every icon body is inline SVG and fills a colour', () => {
  Object.entries(FOLDER_ICON_BODIES).forEach(([key, body]) => {
    assert.equal(typeof body, 'string', `${key} should be a string`)
    assert.ok(body.startsWith('<'), `${key} should start with an SVG element`)
    assert.ok(body.includes('fill='), `${key} should define a fill`)
  })
})

test('every mapped key has artwork behind it', () => {
  const mapped = ['src', 'views', 'routes', 'hook', 'utils', 'node', 'git', 'docs', 'base']

  mapped.forEach((key) => {
    assert.ok(getFolderIconBody(key), `missing body for ${key}`)
  })
})
