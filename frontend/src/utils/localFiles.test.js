import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildImportPayload,
  describeSkipped,
  extensionOf,
  guessContentType,
  isTextPath,
  rootFolderName,
  shouldSkipPath,
} from './localFiles.js'

// Minimal stand-in for a browser File: the util needs size, text() and
// arrayBuffer() (used for the base64 path).
const fakeTextFile = (content, type = '') => ({
  size: content.length,
  type,
  text: async () => content,
  arrayBuffer: async () => new TextEncoder().encode(content).buffer,
})

const fakeBinaryFile = (bytes, type = 'image/png') => ({
  size: bytes.length,
  type,
  text: async () => 'not used',
  arrayBuffer: async () => Uint8Array.from(bytes).buffer,
})

test('extensionOf handles nested paths and extension-less names', () => {
  assert.equal(extensionOf('src/components/App.jsx'), 'jsx')
  assert.equal(extensionOf('Makefile'), '')
  assert.equal(extensionOf('.env'), '')
})

test('isTextPath keeps code and flags binaries', () => {
  assert.equal(isTextPath('src/App.jsx'), true)
  assert.equal(isTextPath('Dockerfile'), true)
  assert.equal(isTextPath('assets/logo.png'), false)
  assert.equal(isTextPath('build/app.zip'), false)
})

test('guessContentType knows common binaries', () => {
  assert.equal(guessContentType('logo.png'), 'image/png')
  assert.equal(guessContentType('font.woff2'), 'font/woff2')
  assert.equal(guessContentType('notes.md'), 'text/plain; charset=utf-8')
  assert.equal(guessContentType('blob.bin'), 'application/octet-stream')
})

test('shouldSkipPath ignores dependency and build folders', () => {
  assert.equal(shouldSkipPath('node_modules/react/index.js'), true)
  assert.equal(shouldSkipPath('project/.git/config'), true)
  assert.equal(shouldSkipPath('project/src/App.jsx'), false)
})

test('buildImportPayload keeps text as utf8 and binaries as base64', async () => {
  const entries = [
    { path: 'proj/src/App.jsx', file: fakeTextFile('export default 1') },
    { path: 'proj/README.md', file: fakeTextFile('# hi') },
    { path: 'proj/logo.png', file: fakeBinaryFile([1, 2, 3]) },
    { path: 'proj/node_modules/x/index.js', file: fakeTextFile('nope') },
  ]

  const { files, skipped } = await buildImportPayload(entries, { stripRoot: true })

  assert.deepEqual(
    files.map((file) => file.path),
    ['src/App.jsx', 'README.md', 'logo.png'],
  )
  assert.deepEqual(
    files.map((file) => file.encoding),
    ['utf8', 'utf8', 'base64'],
  )
  assert.equal(files[2].content, 'AQID')
  assert.equal(files[2].contentType, 'image/png')
  assert.equal(skipped.ignored, 1)
})

test('buildImportPayload keeps the root folder when stripRoot is false', async () => {
  const { files } = await buildImportPayload([{ path: 'proj/a.js', file: fakeTextFile('x') }])

  assert.deepEqual(files.map((file) => file.path), ['proj/a.js'])
})

test('buildImportPayload skips oversized files', async () => {
  const entries = [
    {
      path: 'proj/big.mov',
      file: { size: 40 * 1024 * 1024, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) },
    },
  ]

  const { files, skipped } = await buildImportPayload(entries)

  assert.equal(files.length, 0)
  assert.equal(skipped.tooLarge, 1)
})

test('rootFolderName uses the first path segment', () => {
  assert.equal(rootFolderName([]), '')
  assert.equal(rootFolderName([{ path: 'my-app/src/a.js' }]), 'my-app')
})

test('describeSkipped only mentions non-zero buckets', () => {
  assert.equal(describeSkipped({ ignored: 0 }), '')
  assert.match(describeSkipped({ ignored: 2 }), /2 ignored/)
  assert.match(describeSkipped({ tooLarge: 1 }), /size limit/)
})
