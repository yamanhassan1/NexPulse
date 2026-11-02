import test from "node:test"
import assert from "node:assert/strict"
import {
  collectPreviewRefs,
  inlinePreviewDocument,
  isLocalPreviewRef,
  previewKindFor,
  resolvePreviewPath,
} from "./preview.js"

const entries = [
  { path: "app/index.html", type: "file" },
  { path: "app/assets/index.js", type: "file" },
  { path: "app/styles.css", type: "file" },
]

const contents = {
  "app/assets/index.js": 'document.body.dataset.ready = "true"',
  "app/styles.css": "body { color: tomato; }",
}

test("only offers previews for renderable document types", () => {
  assert.equal(previewKindFor("index.html"), "html")
  assert.equal(previewKindFor("docs/readme.md"), "markdown")
  assert.equal(previewKindFor("data.json"), "json")
  assert.equal(previewKindFor("logo.svg"), "svg")
  assert.equal(previewKindFor("server.js"), null)
  assert.equal(previewKindFor("App.jsx"), null)
  assert.equal(previewKindFor("styles.css"), null)
  assert.equal(previewKindFor("Dockerfile"), null)
})

test("resolves local preview paths relative to the page", () => {
  assert.equal(resolvePreviewPath("./styles.css?x=1", "app/index.html"), "app/styles.css")
  assert.equal(resolvePreviewPath("../index.js", "app/assets/main.js"), "app/index.js")
  assert.equal(resolvePreviewPath("/app/styles.css", "app/index.html"), "app/styles.css")
  assert.equal(resolvePreviewPath("https://example.com/x.css", "app/index.html"), null)
})

test("distinguishes local references from URLs and anchors", () => {
  assert.equal(isLocalPreviewRef("./app.js"), true)
  assert.equal(isLocalPreviewRef("/app.js"), true)
  assert.equal(isLocalPreviewRef("https://example.com/app.js"), false)
  assert.equal(isLocalPreviewRef("//example.com/app.js"), false)
  assert.equal(isLocalPreviewRef("#main"), false)
  assert.equal(isLocalPreviewRef("data:text/javascript,1"), false)
})

test("collects the local stylesheets and scripts on a page", () => {
  const html = `
    <link rel="stylesheet" href="./styles.css" />
    <link rel="icon" href="./favicon.ico" />
    <script src="./assets/index.js" defer></script>
    <script src="https://example.com/analytics.js"></script>
  `

  assert.deepEqual(collectPreviewRefs(html, "app/index.html", entries), [
    { kind: "style", ref: "./styles.css", path: "app/styles.css" },
    { kind: "script", ref: "./assets/index.js", path: "app/assets/index.js" },
  ])
})

test("inlines linked CSS and JS while preserving script attributes", () => {
  const html = `
    <link rel="stylesheet" href="./styles.css" />
    <script src="./assets/index.js" type="module" defer></script>
  `

  const result = inlinePreviewDocument({
    html,
    filePath: "app/index.html",
    projectEntries: entries,
    contents,
  })

  assert.match(result.html, /<style data-preview-src="app\/styles.css">/)
  assert.match(result.html, /body \{ color: tomato; \}/)
  assert.match(result.html, /<script type="module" defer>/)
  assert.match(result.html, /document\.body\.dataset\.ready/)
  assert.deepEqual(result.missing, [])
})

test("leaves external and missing references alone and reports the missing ones", () => {
  const html = `
    <link rel="stylesheet" href="https://example.com/theme.css" />
    <link rel="stylesheet" href="./missing.css" />
    <script src="./missing.js"></script>
  `

  const result = inlinePreviewDocument({
    html,
    filePath: "app/index.html",
    projectEntries: entries,
    contents,
  })

  assert.match(result.html, /https:\/\/example\.com\/theme\.css/)
  assert.match(result.html, /\.\/missing\.css/)
  assert.match(result.html, /\.\/missing\.js/)
  assert.deepEqual(result.missing, ["./missing.css", "./missing.js"])
})

test("escapes closing script tags inside inlined JavaScript", () => {
  const result = inlinePreviewDocument({
    html: '<script src="./assets/index.js"></script>',
    filePath: "app/index.html",
    projectEntries: entries,
    contents: { "app/assets/index.js": 'const html = "</script>"' },
  })

  assert.match(result.html, /<\\\/script>/)
})
