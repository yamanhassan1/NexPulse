import test from 'node:test'
import assert from 'node:assert/strict'
import { languageOf, tokenize } from './highlight.js'

test('languageOf maps extensions to a language', () => {
  assert.equal(languageOf('src/App.jsx'), 'javascript')
  assert.equal(languageOf('types.ts'), 'typescript')
  assert.equal(languageOf('package.json'), 'json')
  assert.equal(languageOf('theme.scss'), 'css')
  assert.equal(languageOf('index.html'), 'markup')
  assert.equal(languageOf('README.md'), 'markdown')
  assert.equal(languageOf('docker-compose.yml'), 'yaml')
  assert.equal(languageOf('Dockerfile'), 'shell')
  assert.equal(languageOf('.env'), 'shell')
  assert.equal(languageOf('LICENSE'), 'plain')
})

test('tokenize finds comments, strings, keywords and numbers', () => {
  const tokens = tokenize('// note\nconst x = "hi" + 42\n', 'javascript')
  const types = tokens.map((token) => token.type)

  assert.ok(types.includes('comment'))
  assert.ok(types.includes('keyword'))
  assert.ok(types.includes('string'))
  assert.ok(types.includes('number'))
})

test('tokenize marks function calls', () => {
  const tokens = tokenize('doThing(1)', 'javascript')
  const fn = tokens.find((token) => token.type === 'fn')

  assert.equal(fn.text, 'doThing')
})

test('tokenize treats JSON keys and values differently', () => {
  const tokens = tokenize('{"name": "nexpulse"}', 'json')

  assert.equal(tokens.find((token) => token.type === 'key').text, '"name"')
  assert.equal(tokens.find((token) => token.type === 'string').text, '"nexpulse"')
})

test('tokenize handles markup tags and attributes', () => {
  const tokens = tokenize('<div class="a">hi</div>', 'markup')
  const tag = tokens.find((token) => token.type === 'tag')

  assert.equal(tag.text, 'div')
  assert.ok(tokens.some((token) => token.type === 'attr' && token.text === 'class'))
})

test('tokenize survives unterminated strings and comments', () => {
  assert.doesNotThrow(() => tokenize('const a = "unterminated', 'javascript'))
  assert.doesNotThrow(() => tokenize('/* never closed', 'javascript'))
  assert.doesNotThrow(() => tokenize('', 'javascript'))
})

test('plain text is a single token', () => {
  const tokens = tokenize('hello world', 'plain')

  assert.deepEqual(tokens, [{ type: 'plain', text: 'hello world' }])
})

test('markdown marks headings and inline code', () => {
  const tokens = tokenize('# Title\n\nSome `code` here', 'markdown')

  assert.ok(tokens.some((token) => token.type === 'keyword' && token.text.includes('# Title')))
  assert.ok(tokens.some((token) => token.type === 'string' && token.text === '`code`'))
})

// Regression: tokenizers that push a token without flushing pending text
// reorder the source. That showed up as stray "=" characters in HTML/JSX files.
test('highlighting never adds, drops or reorders characters', () => {
  const samples = {
    javascript: 'const a = 1;\nif (a === 1) { return `x${a}` }\n// == comment\n',
    typescript: 'interface A { x?: string }\nconst y: number = 2 == 2 ? 1 : 0\n',
    json: '{"a": [1, true], "b": "c==d"}',
    css: 'a { color: #fff; width: calc(100% - 2px); }',
    markup: '<div class="a" data-x=\'1\'>t == u</div>\n<br/>',
    markdown: '# t\n\n- `x == y`\n\n**bold**\n',
    python: 'def f(a=None):\n  return a == 1\n',
    shell: 'if [ -f x ]; then echo "ok"; fi\n',
    yaml: 'a: 1\nb: x == y\n',
    sql: 'select * from t where a = 1;',
  }

  Object.entries(samples).forEach(([language, source]) => {
    const output = tokenize(source, language).map((token) => token.text).join('')
    assert.equal(output, source, `${language} highlighting changed the text`)
  })
})

test('html attributes stay in source order', () => {
  const source = '<div class="a">t</div>'
  const output = tokenize(source, 'markup').map((token) => token.text).join('')

  assert.equal(output, source)
  assert.equal(output.includes('=>'), false)
})
