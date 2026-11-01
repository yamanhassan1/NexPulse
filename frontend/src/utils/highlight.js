// A small, dependency-free syntax tokenizer.
//
// This is not a parser: it scans for comments, strings, numbers, words and
// punctuation and labels them for colouring. That is enough to make code
// readable, and it cannot throw on invalid input.

const JS_KEYWORDS = new Set([
  "import", "from", "export", "default", "const", "let", "var", "function", "return",
  "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "new",
  "class", "extends", "super", "this", "try", "catch", "finally", "throw", "typeof",
  "instanceof", "in", "of", "async", "await", "yield", "delete", "void", "null",
  "undefined", "true", "false", "interface", "type", "enum", "implements", "public",
  "private", "protected", "readonly", "as", "satisfies", "declare", "namespace",
])

const PY_KEYWORDS = new Set([
  "def", "class", "return", "if", "elif", "else", "for", "while", "break", "continue",
  "import", "from", "as", "with", "try", "except", "finally", "raise", "lambda",
  "None", "True", "False", "and", "or", "not", "in", "is", "pass", "global", "yield",
  "async", "await", "self",
])

const SHELL_KEYWORDS = new Set([
  "if", "then", "else", "elif", "fi", "for", "in", "do", "done", "while", "case",
  "esac", "function", "return", "export", "local", "echo", "cd", "set", "unset",
])

const SQL_KEYWORDS = new Set([
  "select", "from", "where", "insert", "into", "values", "update", "set", "delete",
  "create", "table", "alter", "drop", "join", "left", "right", "inner", "outer",
  "on", "group", "by", "order", "having", "limit", "offset", "as", "and", "or", "not",
])

const GENERIC_KEYWORDS = new Set([
  "public", "private", "protected", "class", "interface", "extends", "implements",
  "return", "if", "else", "for", "while", "switch", "case", "break", "continue",
  "new", "this", "super", "static", "final", "void", "int", "long", "double", "float",
  "boolean", "char", "string", "true", "false", "null", "nil", "package", "import",
  "func", "fn", "let", "var", "const", "match", "struct", "enum", "impl", "trait",
  "use", "mod", "pub", "async", "await", "try", "catch", "throw", "throws",
])

const EXTENSION_LANGUAGE = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "css",
  sass: "css",
  less: "css",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  vue: "markup",
  svelte: "markup",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  yml: "yaml",
  yaml: "yaml",
  toml: "yaml",
  env: "yaml",
  ini: "yaml",
  conf: "yaml",
  sql: "sql",
  java: "generic",
  kt: "generic",
  kts: "generic",
  go: "generic",
  rs: "generic",
  c: "generic",
  h: "generic",
  cpp: "generic",
  hpp: "generic",
  cs: "generic",
  swift: "generic",
  php: "generic",
  rb: "generic",
}

export const languageOf = (name = "") => {
  const base = name.split("/").pop() ?? ""
  const dot = base.lastIndexOf(".")
  const extension = dot > 0 ? base.slice(dot + 1).toLowerCase() : ""

  if (EXTENSION_LANGUAGE[extension]) return EXTENSION_LANGUAGE[extension]

  const lower = base.toLowerCase()
  if (["dockerfile", "makefile", ".env", ".gitignore"].includes(lower)) return "shell"
  return "plain"
}

const isDigit = (character) => character >= "0" && character <= "9"
const isWordStart = (character) => /[A-Za-z_$@]/.test(character)
const isWordPart = (character) => /[A-Za-z0-9_$]/.test(character)

const scanString = (source, start) => {
  const quote = source[start]
  let index = start + 1

  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2
      continue
    }
    if (source[index] === quote) return index + 1
    // An unterminated single-line string should stop at the newline instead of
    // swallowing the rest of the file.
    if (source[index] === "\n" && quote !== "`") return index
    index += 1
  }

  return index
}

const pushToken = (tokens, type, text) => {
  if (!text) return
  tokens.push({ type, text })
}

const tokenizeCode = (source, { lineComment, blockComment, quotes, keywords, keyMode }) => {
  const tokens = []
  let plain = ""
  let index = 0

  const flush = () => {
    if (plain) {
      pushToken(tokens, "plain", plain)
      plain = ""
    }
  }

  while (index < source.length) {
    const character = source[index]

    if (lineComment && source.startsWith(lineComment, index)) {
      flush()
      const end = source.indexOf("\n", index)
      const stop = end === -1 ? source.length : end
      pushToken(tokens, "comment", source.slice(index, stop))
      index = stop
      continue
    }

    if (blockComment && source.startsWith(blockComment[0], index)) {
      flush()
      const end = source.indexOf(blockComment[1], index + blockComment[0].length)
      const stop = end === -1 ? source.length : end + blockComment[1].length
      pushToken(tokens, "comment", source.slice(index, stop))
      index = stop
      continue
    }

    if (quotes.includes(character)) {
      flush()
      const stop = scanString(source, index)
      let lookahead = stop
      while (lookahead < source.length && /\s/.test(source[lookahead])) lookahead += 1
      const isKey = keyMode === "json" ? source[lookahead] === ":" : keyMode === "property" && source[lookahead] === ":"
      pushToken(tokens, isKey ? "key" : "string", source.slice(index, stop))
      index = stop
      continue
    }

    if (isDigit(character)) {
      flush()
      let stop = index + 1
      while (stop < source.length && /[0-9a-fA-FxX._]/.test(source[stop])) stop += 1
      pushToken(tokens, "number", source.slice(index, stop))
      index = stop
      continue
    }

    if (isWordStart(character)) {
      flush()
      let stop = index + 1
      while (stop < source.length && isWordPart(source[stop])) stop += 1
      const word = source.slice(index, stop)

      let lookahead = stop
      while (lookahead < source.length && /[ \t]/.test(source[lookahead])) lookahead += 1

      if (keyMode === "property" && source[lookahead] === ":") {
        pushToken(tokens, "key", word)
      } else if (keywords.has(word)) {
        pushToken(tokens, "keyword", word)
      } else if (/^[A-Z][A-Z0-9_]*$/.test(word) && word.length > 1) {
        pushToken(tokens, "constant", word)
      } else if (/^[A-Z]/.test(word)) {
        pushToken(tokens, "class", word)
      } else if (source[lookahead] === "(") {
        pushToken(tokens, "fn", word)
      } else {
        pushToken(tokens, "plain", word)
      }

      index = stop
      continue
    }

    if ("+-*/%=<>!&|^~?:".includes(character)) {
      flush()
      pushToken(tokens, "operator", character)
      index += 1
      continue
    }

    if ("{}[]();,".includes(character)) {
      flush()
      pushToken(tokens, "punct", character)
      index += 1
      continue
    }

    plain += character
    index += 1
  }

  flush()
  return tokens
}

const tokenizeMarkup = (source) => {
  const tokens = []
  let plain = ""
  let index = 0

  const flush = () => {
    if (plain) {
      pushToken(tokens, "plain", plain)
      plain = ""
    }
  }

  while (index < source.length) {
    if (source.startsWith("<!--", index)) {
      flush()
      const end = source.indexOf("-->", index)
      const stop = end === -1 ? source.length : end + 3
      pushToken(tokens, "comment", source.slice(index, stop))
      index = stop
      continue
    }

    if (source[index] === "<") {
      flush()
      let cursor = index + 1
      if (source[cursor] === "/") cursor += 1
      let nameEnd = cursor
      while (nameEnd < source.length && /[-\w:.]/.test(source[nameEnd])) nameEnd += 1
      pushToken(tokens, "punct", source.slice(index, cursor))
      pushToken(tokens, "tag", source.slice(cursor, nameEnd))
      index = nameEnd

      while (index < source.length && source[index] !== ">") {
        if (source[index] === '"' || source[index] === "'") {
          // Flush pending text first: without this the spaces and "=" between
          // attributes are emitted after the token, which reorders the code.
          flush()
          const stop = scanString(source, index)
          pushToken(tokens, "string", source.slice(index, stop))
          index = stop
          continue
        }
        if (/[-\w:]/.test(source[index])) {
          flush()
          let stop = index + 1
          while (stop < source.length && /[-\w:.]/.test(source[stop])) stop += 1
          pushToken(tokens, "attr", source.slice(index, stop))
          index = stop
          continue
        }
        if (source[index] === ">") break
        plain += source[index]
        index += 1
      }

      if (source[index] === ">") {
        flush()
        pushToken(tokens, "punct", ">")
        index += 1
      }
      continue
    }

    plain += source[index]
    index += 1
  }

  flush()
  return tokens
}

const tokenizeMarkdown = (source) => {
  const tokens = []
  const lines = source.split("\n")

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) pushToken(tokens, "plain", "\n")

    if (/^\s*#{1,6}\s/.test(line)) {
      pushToken(tokens, "keyword", line)
      return
    }
    if (/^\s*```/.test(line)) {
      pushToken(tokens, "punct", line)
      return
    }
    if (/^\s*([-*+]|\d+\.)\s/.test(line)) {
      // Match only the indent and marker; the space after it belongs to the text.
      const match = /^(\s*)([-*+]|\d+\.)/.exec(line)
      pushToken(tokens, "plain", match[1])
      pushToken(tokens, "keyword", match[2])
      pushToken(tokens, "plain", line.slice(match[0].length))
      return
    }
    if (/^\s*>/.test(line)) {
      pushToken(tokens, "comment", line)
      return
    }

    // Inline code and emphasis.
    const parts = line.split(/(`[^`]*`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
    parts.forEach((part) => {
      if (/^`[^`]*`$/.test(part)) pushToken(tokens, "string", part)
      else if (/^\*\*[^*]+\*\*$/.test(part) || /^\*[^*]+\*$/.test(part)) pushToken(tokens, "fn", part)
      else pushToken(tokens, "plain", part)
    })
  })

  return tokens
}

/**
 * Splits source into { type, text } runs.
 * Types: plain | comment | string | number | keyword | fn | key | tag | attr | punct
 */
export const tokenize = (source = "", language = "plain") => {
  if (!source) return []
  if (language === "plain") return [{ type: "plain", text: source }]
  if (language === "markup") return tokenizeMarkup(source)
  if (language === "markdown") return tokenizeMarkdown(source)

  if (language === "json") {
    return tokenizeCode(source, { quotes: ['"'], keywords: new Set(["true", "false", "null"]), keyMode: "json" })
  }

  if (language === "css") {
    return tokenizeCode(source, {
      blockComment: ["/*", "*/"],
      quotes: ['"', "'"],
      keywords: new Set(["import", "media", "keyframes", "supports", "font-face"]),
      keyMode: "property",
    })
  }

  if (language === "python") {
    return tokenizeCode(source, { lineComment: "#", quotes: ['"', "'"], keywords: PY_KEYWORDS })
  }

  if (language === "shell") {
    return tokenizeCode(source, { lineComment: "#", quotes: ['"', "'"], keywords: SHELL_KEYWORDS })
  }

  if (language === "yaml") {
    return tokenizeCode(source, { lineComment: "#", quotes: ['"', "'"], keywords: new Set(["true", "false", "null", "yes", "no"]) })
  }

  if (language === "sql") {
    return tokenizeCode(source, { lineComment: "--", quotes: ["'", '"'], keywords: SQL_KEYWORDS })
  }

  if (language === "typescript" || language === "javascript") {
    return tokenizeCode(source, {
      lineComment: "//",
      blockComment: ["/*", "*/"],
      quotes: ['"', "'", "`"],
      keywords: JS_KEYWORDS,
    })
  }

  return tokenizeCode(source, {
    lineComment: "//",
    blockComment: ["/*", "*/"],
    quotes: ['"', "'", "`"],
    keywords: GENERIC_KEYWORDS,
  })
}
