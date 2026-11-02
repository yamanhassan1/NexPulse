import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeHtml, renderJson, renderMarkdown } from './markdown.js'

test('escapeHtml neutralises every html-significant character', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  assert.equal(escapeHtml("a & b"), 'a &amp; b')
})

test('renderMarkdown renders headings and paragraphs', () => {
  const html = renderMarkdown('# Title\n\nSome text')

  assert.match(html, /<h1>Title<\/h1>/)
  assert.match(html, /<p>Some text<\/p>/)
})

test('renderMarkdown escapes raw html from the document', () => {
  const html = renderMarkdown('<img src=x onerror="alert(1)">')

  assert.equal(html.includes('<img'), false)
  assert.match(html, /&lt;img/)
})

test('renderMarkdown renders fenced code, lists and quotes', () => {
  const html = renderMarkdown('```js\nconst a = "<b>"\n```\n\n- one\n- two\n\n> quoted')

  // Code is escaped inside the block, including the quotes.
  assert.match(html, /<pre><code>const a = &quot;&lt;b&gt;&quot;<\/code><\/pre>/)
  assert.match(html, /<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/)
  assert.match(html, /<blockquote>quoted<\/blockquote>/)
})

test('renderMarkdown supports inline code, bold and links', () => {
  const html = renderMarkdown('Use `npm test` and **be bold** and [docs](https://example.com)')

  assert.match(html, /<code>npm test<\/code>/)
  assert.match(html, /<strong>be bold<\/strong>/)
  assert.match(html, /href="https:\/\/example.com"/)
})

test('renderMarkdown drops dangerous link targets', () => {
  const html = renderMarkdown('[click](javascript:alert(1))')

  // The scheme must never survive into an href; the label stays as plain text.
  assert.equal(html.includes('javascript:'), false)
  assert.equal(html.includes('<a '), false)
  assert.match(html, /click/)
})

test('renderMarkdown leaves an unterminated fence intact', () => {
  const html = renderMarkdown('```\nconst a = 1')

  assert.match(html, /<pre><code>const a = 1<\/code><\/pre>/)
})

test('renderJson pretty-prints valid json and passes through invalid', () => {
  assert.equal(renderJson('{"a":1}'), '{\n  "a": 1\n}')
  assert.equal(renderJson('{ nope'), '{ nope')
})
