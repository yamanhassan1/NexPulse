// A deliberately small Markdown renderer for the preview panel.
//
// Everything is HTML-escaped first; the renderer only ever emits its own tags,
// so file content cannot inject markup. Links are restricted to http(s) and
// relative URLs — `javascript:` and `data:` are dropped.

const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ESCAPES[char])

const safeHref = (raw = "") => {
  const href = raw.trim()
  if (/^(https?:\/\/|\/|\.\/|\.\.\/|#)/i.test(href)) return escapeHtml(href)
  return ""
}

const inline = (text = "") => {
  let html = escapeHtml(text)

  // Inline code first so its contents are not re-processed. The private-use
  // markers cannot appear in normal text and avoid control characters.
  const codes = []
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code)
    return `\uE000${codes.length - 1}\uE001`
  })

  html = html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")

  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
    const safe = safeHref(href)
    if (!safe) return label
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })

  return html.replace(/\uE000(\d+)\uE001/g, (_, index) => `<code>${codes[Number(index)]}</code>`)
}

/**
 * Renders the supported subset: headings, fenced code, lists, quotes, rules,
 * paragraphs, inline emphasis, code and links.
 */
export const renderMarkdown = (source = "") => {
  const lines = String(source).replace(/\r\n/g, "\n").split("\n")
  const out = []

  let paragraph = []
  let listType = null
  let inFence = false
  let fenceLines = []

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(" "))}</p>`)
      paragraph = []
    }
  }

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  const openList = (type) => {
    if (listType === type) return
    closeList()
    out.push(`<${type}>`)
    listType = type
  }

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (inFence) {
        out.push(`<pre><code>${escapeHtml(fenceLines.join("\n"))}</code></pre>`)
        fenceLines = []
        inFence = false
      } else {
        flushParagraph()
        closeList()
        inFence = true
      }
      continue
    }

    if (inFence) {
      fenceLines.push(line)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      closeList()
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      closeList()
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushParagraph()
      closeList()
      out.push("<hr />")
      continue
    }

    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushParagraph()
      closeList()
      out.push(`<blockquote>${inline(quote[1])}</blockquote>`)
      continue
    }

    const unordered = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (unordered) {
      flushParagraph()
      openList("ul")
      out.push(`<li>${inline(unordered[1])}</li>`)
      continue
    }

    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      flushParagraph()
      openList("ol")
      out.push(`<li>${inline(ordered[1])}</li>`)
      continue
    }

    paragraph.push(line.trim())
  }

  if (inFence) {
    out.push(`<pre><code>${escapeHtml(fenceLines.join("\n"))}</code></pre>`)
  }

  flushParagraph()
  closeList()

  return out.join("\n")
}

/** JSON gets pretty-printed when it parses; otherwise the raw text is shown. */
export const renderJson = (source = "") => {
  try {
    return JSON.stringify(JSON.parse(source), null, 2)
  } catch {
    return source
  }
}
