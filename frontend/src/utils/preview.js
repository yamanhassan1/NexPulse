import { findProjectPath } from "./completions.js"

const PREVIEW_KINDS = {
  html: "html",
  htm: "html",
  md: "markdown",
  markdown: "markdown",
  json: "json",
  svg: "svg",
}

export const previewKindFor = (name = "") => {
  const base = name.split("/").pop() ?? ""
  const dot = base.lastIndexOf(".")
  const extension = dot > 0 ? base.slice(dot + 1).toLowerCase() : ""
  return PREVIEW_KINDS[extension] ?? null
}

const LINK_RE = /<link\b([^>]*)>/gi
const SCRIPT_RE =
  /<script\b([^>]*?)\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))([^>]*)>[\s\S]*?<\/script\s*>/gi
const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i

const attrValue = (tag, name) => {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)
  return match ? match[1] ?? match[2] ?? match[3] ?? "" : ""
}

const decode = (value) => {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

/** External URLs, in-page anchors and data URIs are left for the browser. */
export const isLocalPreviewRef = (ref = "") => {
  const value = ref.trim()
  return Boolean(value) && !EXTERNAL_RE.test(value)
}

/** Converts a reference like `../styles.css?x=1` to a project-relative path. */
export const resolvePreviewPath = (ref, filePath = "") => {
  if (!isLocalPreviewRef(ref)) return null

  const clean = decode(ref.split(/[?#]/, 1)[0] ?? "")
  if (!clean) return null

  const parts = clean.startsWith("/")
    ? []
    : filePath.split("/").slice(0, -1)

  const resolved = []
  for (const part of [...parts, ...clean.replace(/^\/+/, "").split("/")]) {
    if (!part || part === ".") continue
    if (part === "..") {
      resolved.pop()
      continue
    }
    resolved.push(part)
  }

  return resolved.length ? resolved.join("/") : null
}

const styleRefs = (html) => {
  const refs = []
  for (const match of html.matchAll(LINK_RE)) {
    const tag = match[0]
    const rel = attrValue(tag, "rel").toLowerCase()
    const href = attrValue(tag, "href")
    if (!rel.split(/\s+/).includes("stylesheet") || !isLocalPreviewRef(href)) continue
    refs.push({ kind: "style", ref: href })
  }
  return refs
}

const scriptRefs = (html) => {
  const refs = []
  for (const match of html.matchAll(SCRIPT_RE)) {
    const src = match[2] ?? match[3] ?? match[4] ?? ""
    if (isLocalPreviewRef(src)) refs.push({ kind: "script", ref: src })
  }
  return refs
}

/** Local stylesheets and scripts referenced by an HTML document. */
export const collectPreviewRefs = (html, filePath = "", projectEntries = []) =>
  [...styleRefs(html), ...scriptRefs(html)].map((entry) => ({
    ...entry,
    path: findProjectPath(resolvePreviewPath(entry.ref, filePath), projectEntries),
  }))

const readContent = (contents, path) => {
  if (!path || !contents) return undefined
  if (typeof contents.get === "function") return contents.get(path)
  return contents[path]
}

const escapeAttribute = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

/**
 * Replaces local stylesheet and script references with their file contents.
 * External URLs and unresolved local paths are left untouched but reported.
 */
export const inlinePreviewDocument = ({ html, filePath = "", projectEntries = [], contents }) => {
  const missing = []

  let output = html.replace(LINK_RE, (tag) => {
    const rel = attrValue(tag, "rel").toLowerCase()
    const href = attrValue(tag, "href")
    if (!rel.split(/\s+/).includes("stylesheet") || !isLocalPreviewRef(href)) return tag

    const path = findProjectPath(resolvePreviewPath(href, filePath), projectEntries)
    const css = readContent(contents, path)
    if (css === undefined) {
      missing.push(href)
      return tag
    }

    return `<style data-preview-src="${escapeAttribute(path)}">\n${css.replace(
      /<\/style/gi,
      "<\\/style",
    )}\n</style>`
  })

  output = output.replace(SCRIPT_RE, (tag, before, double, single, bare, after) => {
    const src = double ?? single ?? bare ?? ""
    if (!isLocalPreviewRef(src)) return tag

    const path = findProjectPath(resolvePreviewPath(src, filePath), projectEntries)
    const js = readContent(contents, path)
    if (js === undefined) {
      missing.push(src)
      return tag
    }

    const attrs = `${before ?? ""}${after ?? ""}`.replace(/\s+/g, " ").trim()
    return `<script${attrs ? ` ${attrs}` : ""}>\n${js.replace(
      /<\/script/gi,
      "<\\/script",
    )}\n</script>`
  })

  return { html: output, missing: [...new Set(missing)] }
}
