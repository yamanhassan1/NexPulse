// Pure text operations behind the editor's keyboard commands.
// Every function takes the whole document plus a selection and returns the new
// document and selection, so it can be unit tested without a DOM.

export const lineStartsOf = (text = "") => {
  const starts = [0]
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") starts.push(index + 1)
  }
  return starts
}

/** 1-based line/column for a caret offset. */
export const positionAt = (text = "", offset = 0) => {
  const starts = lineStartsOf(text)
  let line = 0
  for (let index = 0; index < starts.length; index += 1) {
    if (starts[index] <= offset) line = index
    else break
  }
  return { line: line + 1, column: offset - starts[line] + 1 }
}

export const offsetAt = (text = "", line = 1, column = 1) => {
  const starts = lineStartsOf(text)
  const start = starts[Math.min(Math.max(line - 1, 0), starts.length - 1)] ?? 0
  return Math.min(start + Math.max(column - 1, 0), text.length)
}

const lineBounds = (text, start, end) => {
  const from = text.lastIndexOf("\n", Math.max(start - 1, 0)) + 1
  let to = text.indexOf("\n", end)
  if (to === -1) to = text.length
  return { from, to }
}

export const toggleComment = (text = "", start = 0, end = 0, marker = "//") => {
  const { from, to } = lineBounds(text, start, end)
  const block = text.slice(from, to)
  const lines = block.split("\n")

  const meaningful = lines.filter((line) => line.trim())
  if (!meaningful.length) return { text, selection: { start, end } }

  const commented = meaningful.every((line) => line.trimStart().startsWith(marker))
  const offsetInBlock = start - from

  const next = lines
    .map((line) => {
      if (!line.trim()) return line
      if (commented) {
        const leading = line.match(/^\s*/)[0]
        const rest = line.slice(leading.length)
        const removed = rest.slice(marker.length).replace(/^ /, "")
        return `${leading}${removed}`
      }
      const leading = line.match(/^\s*/)[0]
      return `${leading}${marker} ${line.slice(leading.length)}`
    })
    .join("\n")

  const delta = commented ? -(marker.length + 1) : marker.length + 1
  return {
    text: text.slice(0, from) + next + text.slice(to),
    selection: { start, end: Math.max(start, end + delta * lines.length) },
    selectionStart: Math.max(from, start + (offsetInBlock > 0 ? delta : 0)),
  }
}

const BLOCK_COMMENT_PAIRS = {
  markup: ["<!--", "-->"],
  javascript: ["/*", "*/"],
  typescript: ["/*", "*/"],
  css: ["/*", "*/"],
  scss: ["/*", "*/"],
  less: ["/*", "*/"],
  sql: ["/*", "*/"],
  java: ["/*", "*/"],
  c: ["/*", "*/"],
  cpp: ["/*", "*/"],
  csharp: ["/*", "*/"],
  go: ["/*", "*/"],
  rust: ["/*", "*/"],
}

export const blockCommentPairFor = (language = "") => BLOCK_COMMENT_PAIRS[language] ?? null

export const toggleBlockComment = (text = "", start = 0, end = 0, pair = null) => {
  if (!pair) return { text, selection: { start, end } }
  const [open, close] = pair
  const before = text.slice(0, start)
  const selected = text.slice(start, end)
  const after = text.slice(end)

  if (before.endsWith(open) && after.startsWith(close)) {
    const nextStart = start - open.length
    return {
      text: text.slice(0, nextStart) + selected + text.slice(end + close.length),
      selection: { start: nextStart, end: end - open.length },
    }
  }

  if (selected.startsWith(open) && selected.endsWith(close) && selected.length >= open.length + close.length) {
    return {
      text: before + selected.slice(open.length, -close.length) + after,
      selection: { start, end: end - open.length - close.length },
    }
  }

  return {
    text: before + open + selected + close + after,
    selection: { start: start + open.length, end: end + open.length },
  }
}

export const indentLines = (text = "", start = 0, end = 0, tabSize = 2, direction = 1) => {
  const { from, to } = lineBounds(text, start, end)
  const pad = " ".repeat(tabSize)
  const lines = text.slice(from, to).split("\n")

  const next = lines
    .map((line) => {
      if (direction > 0) return line.trim() ? pad + line : line
      if (line.startsWith(pad)) return line.slice(tabSize)
      if (line.startsWith("\t")) return line.slice(1)
      return line.replace(/^ {1,2}/, "")
    })
    .join("\n")

  const delta = next.length - (to - from)
  return {
    text: text.slice(0, from) + next + text.slice(to),
    selection: { start, end: Math.max(start, end + delta) },
  }
}

export const moveLines = (text = "", start = 0, end = 0, direction = 1) => {
  const starts = lineStartsOf(text)
  const first = positionAt(text, start).line - 1
  const last = positionAt(text, end).line - 1

  if (direction < 0 && first === 0) return { text, selection: { start, end } }
  if (direction > 0 && last >= starts.length - 1) return { text, selection: { start, end } }

  const lines = text.split("\n")
  const block = lines.splice(first, last - first + 1)
  const target = direction < 0 ? first - 1 : first + 1
  lines.splice(target, 0, ...block)

  const nextText = lines.join("\n")
  // Recompute from the new document: the block simply starts one line earlier
  // or later, keeping the caret at the same column offset.
  const newStarts = lineStartsOf(nextText)
  const inLine = start - starts[first]
  const shift = newStarts[target] + inLine - start

  return {
    text: nextText,
    selection: { start: start + shift, end: end + shift },
  }
}

export const duplicateLines = (text = "", start = 0, end = 0, direction = 1) => {
  const starts = lineStartsOf(text)
  const first = positionAt(text, start).line - 1
  const last = positionAt(text, end).line - 1
  const lines = text.split("\n")
  const block = lines.slice(first, last + 1)
  const target = direction < 0 ? first : last + 1
  lines.splice(target, 0, ...block)

  const nextText = lines.join("\n")
  const newStarts = lineStartsOf(nextText)
  const inLine = start - starts[first]
  const shift = newStarts[target] + inLine - start

  return {
    text: nextText,
    selection: { start: start + shift, end: end + shift },
  }
}

export const insertLine = (text = "", start = 0, end = start, direction = 1) => {
  const { from, to } = lineBounds(text, start, end)
  const line = text.slice(from, to)
  const indentation = line.match(/^[ \t]*/)[0]

  if (direction < 0) {
    const caret = from + indentation.length
    return {
      text: `${text.slice(0, from)}${indentation}\n${text.slice(from)}`,
      selection: { start: caret, end: caret },
    }
  }

  const caret = to + 1 + indentation.length
  return {
    text: `${text.slice(0, to)}\n${indentation}${text.slice(to)}`,
    selection: { start: caret, end: caret },
  }
}

export const deleteLines = (text = "", start = 0, end = 0) => {
  const { from, to } = lineBounds(text, start, end)
  const removeTo = to < text.length ? to + 1 : to
  const nextText = text.slice(0, from) + text.slice(removeTo)
  const caret = Math.min(from, nextText.length)

  return { text: nextText, selection: { start: caret, end: caret } }
}

/**
 * Indent for a new line: keeps the current indentation and adds one level when
 * the caret sits just after an opening bracket.
 */
export const autoIndentOnEnter = (text = "", offset = 0, tabSize = 2, end = offset) => {
  const before = text.slice(0, offset)
  const lineStart = before.lastIndexOf("\n") + 1
  const line = before.slice(lineStart)
  const indentation = line.match(/^\s*/)[0]
  const trimmed = line.trimEnd()
  const opens = (trimmed.match(/[{[(]\s*$/)) ? 1 : 0
  const indent = indentation + " ".repeat(opens * tabSize)
  const replaceEnd = Math.min(Math.max(end, offset), text.length)

  const nextText = `${text.slice(0, offset)}\n${indent}${text.slice(replaceEnd)}`
  const caret = offset + 1 + indent.length

  return { text: nextText, selection: { start: caret, end: caret } }
}

export const computeMatches = (text = "", query = "", { matchCase = false, regex = false } = {}) => {
  if (!query) return []

  const matches = []

  if (regex) {
    try {
      const pattern = new RegExp(query, matchCase ? "g" : "gi")
      let result = pattern.exec(text)
      let guard = 0
      while (result && guard < 5000) {
        if (!result[0]) break
        matches.push({ start: result.index, end: result.index + result[0].length })
        result = pattern.exec(text)
        guard += 1
      }
      return matches
    } catch {
      return []
    }
  }

  const haystack = matchCase ? text : text.toLowerCase()
  const needle = matchCase ? query : query.toLowerCase()

  let from = 0
  while (matches.length < 5000) {
    const index = haystack.indexOf(needle, from)
    if (index === -1) break
    matches.push({ start: index, end: index + needle.length })
    from = index + needle.length
  }

  return matches
}

const OPENERS = { "(": ")", "[": "]", "{": "}" }
const CLOSERS = { ")": "(", "]": "[", "}": "{" }

const skipString = (text, index) => {
  const quote = text[index]
  let cursor = index + 1
  while (cursor < text.length) {
    if (text[cursor] === "\\") {
      cursor += 2
      continue
    }
    if (text[cursor] === quote) return cursor
    if (text[cursor] === "\n" && quote !== "`") return cursor
    cursor += 1
  }
  return cursor
}

/**
 * Finds the bracket pair around the caret, e.g. caret right after "(" or before
 * ")". Returns absolute offsets so the view can highlight the two characters.
 */
export const bracketPairAt = (text = "", offset = 0) => {
  const candidates = [offset - 1, offset]

  for (const position of candidates) {
    if (position < 0 || position >= text.length) continue
    const character = text[position]

    if (OPENERS[character]) {
      let depth = 0
      for (let cursor = position; cursor < text.length; cursor += 1) {
        const current = text[cursor]
        if (current === '"' || current === "'" || current === "`") {
          cursor = skipString(text, cursor)
          continue
        }
        if (current === character) depth += 1
        else if (current === OPENERS[character]) {
          depth -= 1
          if (depth === 0) return { open: position, close: cursor }
        }
      }
    }

    if (CLOSERS[character]) {
      let depth = 0
      for (let cursor = position; cursor >= 0; cursor -= 1) {
        const current = text[cursor]
        if (current === CLOSERS[character]) depth += 1
        else if (current === character) {
          depth -= 1
          if (depth === 0) return { open: cursor, close: position }
        }
      }
    }
  }

  return null
}

export const commentMarkerFor = (language = "plain") => {
  if (language === "python" || language === "shell" || language === "yaml") return "#"
  if (language === "sql") return "--"
  if (language === "markup" || language === "markdown") return "<!--"
  return "//"
}
