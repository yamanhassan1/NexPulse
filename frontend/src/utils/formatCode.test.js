import test from 'node:test'
import assert from 'node:assert/strict'
import { canFormat, formatBytes, formatCode, formatJson, reindent } from './formatCode.js'

test('formatJson pretty-prints valid JSON', () => {
  assert.equal(formatJson('{"a":1,"b":[2]}'), '{\n  "a": 1,\n  "b": [\n    2\n  ]\n}')
})

test('formatJson returns null on invalid JSON', () => {
  assert.equal(formatJson('{ nope'), null)
})

test('reindent fixes leading whitespace only', () => {
  const input = 'function a() {\nreturn 1\n}\n'
  const output = reindent(input)

  assert.equal(output, 'function a() {\n  return 1\n}\n')
  // Token content is untouched, only indentation changes.
  assert.equal(output.replace(/\s+/g, ''), input.replace(/\s+/g, ''))
})

test('reindent does not count braces inside strings or comments', () => {
  const input = 'const s = "}"\n// }\nif (a) {\nb()\n}'
  const output = reindent(input)

  assert.equal(output, 'const s = "}"\n// }\nif (a) {\n  b()\n}')
})

test('reindent collapses runs of blank lines', () => {
  assert.equal(reindent('a\n\n\n\nb'), 'a\n\nb')
})

test('formatCode formats json files by name', () => {
  assert.equal(formatCode('{"x":1}', 'config.json'), '{\n  "x": 1\n}')
})

test('formatCode leaves indentation-sensitive languages alone', () => {
  const yaml = 'root:\n    child: 1'
  const python = 'def f():\n        return 1'
  const markdown = '# Title\n    indented text'

  assert.equal(formatCode(yaml, 'config.yml'), yaml)
  assert.equal(formatCode(python, 'main.py'), python)
  assert.equal(formatCode(markdown, 'README.md'), markdown)
})

test('formatCode keeps invalid JSON untouched', () => {
  assert.equal(formatCode('{ nope', 'broken.json'), '{ nope')
})

test('canFormat only allows languages we can format safely', () => {
  assert.equal(canFormat('a.js'), true)
  assert.equal(canFormat('a.css'), true)
  assert.equal(canFormat('a.json'), true)
  assert.equal(canFormat('a.yml'), false)
  assert.equal(canFormat('a.py'), false)
  assert.equal(canFormat('a.md'), false)
  assert.equal(canFormat('LICENSE'), false)
})

test('formatBytes is human readable', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(2048), '2.0 KB')
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB')
})
