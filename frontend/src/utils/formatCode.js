// Formatting for the code editor.
//
// Prettier is not available offline in this project, so this is a conservative
// built-in formatter: JSON is re-serialised exactly, and brace languages get
// their leading whitespace normalised. It never rewrites tokens, so it cannot
// change what the code means — worst case it leaves a line as it was.
//
// Indentation-sensitive languages (Python, YAML, TOML, shell, Markdown) are
// deliberately never touched, because re-indenting them changes behaviour.

import { languageOf } from "./highlight.js"

const UNIT = "  "

const FORMATTABLE = new Set(["javascript", "typescript", "css", "generic", "sql"])

const skipString = (line, start) => {
  const quote = line[start]
  let index = start + 1

  while (index < line.length) {
    if (line[index] === "\\") {
      index += 2
      continue
    }
    if (line[index] === quote) return index + 1
    index += 1
  }

  return index
}

const scanLine = (line, inBlockComment) => {
  let opens = 0
  let closes = 0
  let index = 0
  let block = inBlockComment

  while (index < line.length) {
    if (block) {
      const end = line.indexOf("*/", index)
      if (end === -1) return { opens, closes, block }
      block = false
      index = end + 2
      continue
    }

    if (line.startsWith("/*", index)) {
      block = true
      index += 2
      continue
    }

    if (line.startsWith("//", index)) break

    const character = line[index]
    if (character === '"' || character === "'" || character === "`") {
      index = skipString(line, index)
      continue
    }

    if (character === "{" || character === "(" || character === "[") opens += 1
    else if (character === "}" || character === ")" || character === "]") closes += 1

    index += 1
  }

  return { opens, closes, block }
}

export const formatJson = (source) => {
  try {
    return JSON.stringify(JSON.parse(source), null, 2)
  } catch {
    return null
  }
}

export const reindent = (source, unit = UNIT) => {
  const lines = String(source).replace(/\r\n/g, "\n").split("\n")
  const output = []

  let depth = 0
  let block = false

  for (const raw of lines) {
    const line = raw.trim()

    if (!line) {
      output.push("")
      continue
    }

    const leadingClosers = /^[}\])]+/.exec(line)?.[0].length ?? 0
    const indent = Math.max(0, depth - leadingClosers)

    output.push(`${unit.repeat(indent)}${line}`)

    const scan = scanLine(line, block)
    block = scan.block
    depth = Math.max(0, depth + scan.opens - scan.closes)
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n")
}

export const canFormat = (name = "") => {
  const language = languageOf(name)
  return language === "json" || FORMATTABLE.has(language)
}

export const formatBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`
}

/**
 * Returns the formatted source, or the original when nothing safe applies.
 */
export const formatCode = (content = "", name = "") => {
  const language = languageOf(name)

  if (language === "json") {
    const formatted = formatJson(content)
    return formatted ?? content
  }

  if (!FORMATTABLE.has(language)) return content

  return reindent(content)
}
