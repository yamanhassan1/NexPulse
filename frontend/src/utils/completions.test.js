import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findProjectPath,
  isInsideCommentOrString,
  resolveProjectPath,
  suggestCompletions,
  wordPrefixAt,
} from './completions.js'

const labelsFor = (text, language = 'javascript') =>
  suggestCompletions({ text, offset: text.length, language }).map((item) => item.label)

test('wordPrefixAt finds the word and its member object', () => {
  assert.deepEqual(wordPrefixAt('console.lo', 10), {
    start: 8,
    end: 10,
    word: 'lo',
    before: '.',
    object: 'console',
  })
})

test('wordPrefixAt accepts kebab-case words used by CSS and HTML', () => {
  assert.equal(wordPrefixAt('margin-top', 10).word, 'margin-top')
  assert.equal(wordPrefixAt('aria-label', 10).word, 'aria-label')
})

test('suggests JavaScript keywords and ranks prefixes first', () => {
  const labels = labelsFor('imp')

  assert.equal(labels[0], 'import')
  assert.ok(labels.includes('import'))
})

test('filters member completions by the typed prefix', () => {
  assert.deepEqual(labelsFor('console.lo'), ['log'])
  assert.equal(labelsFor('console.')[0], 'log')
})

test('returns nothing inside comments and strings', () => {
  assert.deepEqual(
    suggestCompletions({ text: '// console.lo', offset: 13, language: 'javascript' }),
    [],
  )
  assert.deepEqual(
    suggestCompletions({ text: '"console.lo"', offset: 11, language: 'javascript' }),
    [],
  )
  assert.equal(isInsideCommentOrString('const a = "x"', 12, 'javascript'), true)
  assert.equal(isInsideCommentOrString('const a = "x"', 13, 'javascript'), false)
})

test('completes HTML tags and attributes with useful inserts', () => {
  const tags = suggestCompletions({ text: '<di', offset: 3, language: 'markup' })
  const div = tags.find((item) => item.label === 'div')
  assert.equal(div.insert, 'div>$0</div>')

  const attributes = suggestCompletions({ text: '<div cla', offset: 8, language: 'markup' })
  const className = attributes.find((item) => item.label === 'class')
  assert.equal(className.insert, 'class="$0"')
})

test('completes JSX tags and attributes inside JavaScript files', () => {
  const tags = suggestCompletions({ text: '<di', offset: 3, language: 'javascript' })
  const div = tags.find((item) => item.label === 'div')
  assert.equal(div.insert, 'div>$0</div>')

  const attributes = suggestCompletions({ text: '<div cla', offset: 8, language: 'javascript' })
  const className = attributes.find((item) => item.label === 'class')
  assert.equal(className.insert, 'class="$0"')
})

test('does not mistake comparisons or generics for JSX', () => {
  assert.ok(!labelsFor('if (a < b').includes('button'))
  assert.ok(!labelsFor('const x = Array<str').includes('strong'))
})

test('the ! trigger expands to an HTML5 boilerplate', () => {
  assert.equal(wordPrefixAt('!', 1).word, '!')

  const items = suggestCompletions({ text: '!', offset: 1, language: 'markup' })
  assert.equal(items[0].label, '!')
  assert.ok(items[0].insert.startsWith('<!DOCTYPE html>'))
  assert.ok(items[0].insert.includes('<body>'))
})

test('suggests project files when typing an import path', () => {
  const text = 'import Button from "./com'
  const items = suggestCompletions({
    text,
    offset: text.length,
    language: 'javascript',
    filePath: 'app/src/App.jsx',
    projectEntries: [
      { path: 'app/src/App.jsx', type: 'file' },
      { path: 'app/src/components/Button.jsx', type: 'file' },
      { path: 'app/src/components', type: 'folder' },
      { path: 'app/package.json', type: 'file' },
    ],
  })
  const button = items.find((item) => item.label === './components/Button')

  assert.equal(button.insert, './components/Button')
  assert.equal(button.replaceStart, text.indexOf('./com'))
  assert.ok(!items.some((item) => item.label.includes('App')))
})

test('suggests project paths for HTML href and src attributes', () => {
  const text = '<link rel="stylesheet" href="'
  const items = suggestCompletions({
    text,
    offset: text.length,
    language: 'markup',
    filePath: 'app/index.html',
    projectEntries: [
      { path: 'app/index.html', type: 'file' },
      { path: 'app/styles.css', type: 'file' },
    ],
  })

  assert.equal(items[0].label, './styles.css')
  assert.equal(items[0].replaceStart, text.length)
})

test('resolves a linked script path from an HTML file', () => {
  const text = '<script src="./assets/index.js"></script>'
  const offset = text.indexOf('index.js')

  assert.equal(
    resolveProjectPath({ text, offset, filePath: 'app/index.html' }),
    'app/assets/index.js',
  )
  assert.equal(
    findProjectPath('app/assets/index.js', [
      { path: 'app/index.html', type: 'file' },
      { path: 'app/assets/index.js', type: 'file' },
    ]),
    'app/assets/index.js',
  )
})

test('resolves extensionless imports to the real project file', () => {
  const text = 'import App from "./App"'
  const offset = text.indexOf('App"') + 1
  const target = resolveProjectPath({ text, offset, filePath: 'app/src/main.jsx' })

  assert.equal(target, 'app/src/App')
  assert.equal(
    findProjectPath(target, [
      { path: 'app/src/main.jsx', type: 'file' },
      { path: 'app/src/App.jsx', type: 'file' },
    ]),
    'app/src/App.jsx',
  )
})

test('does not resolve bare package imports as project files', () => {
  const text = 'import React from "react"'
  const offset = text.indexOf('react')

  assert.equal(resolveProjectPath({ text, offset, filePath: 'app/src/App.jsx' }), null)
})

test('completes CSS properties with a value placeholder', () => {
  const display = suggestCompletions({ text: 'disp', offset: 4, language: 'css' }).find(
    (item) => item.label === 'display',
  )

  assert.equal(display.insert, 'display: $0;')
})

test('suggests Python snippets before duplicate keywords', () => {
  const def = suggestCompletions({ text: 'de', offset: 2, language: 'python' })[0]

  assert.equal(def.label, 'def')
  assert.equal(def.kind, 'snippet')
  assert.ok(def.insert.includes('$0'))
})

test('adds TypeScript-only completions for TypeScript files', () => {
  const labels = labelsFor('inter', 'typescript')

  assert.ok(labels.includes('interface'))
})

test('plain text has no completions', () => {
  assert.deepEqual(suggestCompletions({ text: 'hello', offset: 5, language: 'plain' }), [])
})

test('empty prefixes return candidates so Ctrl+Space can use them', () => {
  const items = suggestCompletions({ text: '', offset: 0, language: 'javascript' })

  assert.ok(items.length > 0)
  assert.ok(items.every((item) => item.score === 50))
})
