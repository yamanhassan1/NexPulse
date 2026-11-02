// A small, dependency-free completion engine.
//
// It is intentionally text-based: it looks at the word around the caret and
// returns ranked candidates for the current language. Snippets may contain a
// `$0` marker that tells the editor where to put the caret after inserting.

const JS_KEYWORDS = [
  "import", "from", "export", "default", "const", "let", "var", "function",
  "return", "if", "else", "for", "while", "do", "switch", "case", "break",
  "continue", "new", "class", "extends", "super", "this", "try", "catch",
  "finally", "throw", "typeof", "instanceof", "in", "of", "async", "await",
  "yield", "delete", "void", "null", "undefined", "true", "false",
]

const TS_KEYWORDS = [
  "interface", "type", "enum", "implements", "public", "private", "protected",
  "readonly", "as", "satisfies", "declare", "namespace", "any", "unknown",
  "never", "string", "number", "boolean", "object",
]

const JS_GLOBALS = [
  "console", "document", "window", "Math", "JSON", "Object", "Array", "String",
  "Number", "Boolean", "Promise", "Date", "RegExp", "Map", "Set", "WeakMap",
  "fetch", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "localStorage", "sessionStorage", "navigator",
  "location", "history", "process", "require", "module", "exports", "URL",
  "URLSearchParams", "FormData", "AbortController", "Error", "Intl",
]

const JS_SNIPPETS = [
  ["log", "Log to the console", "console.log($0)"],
  ["warn", "Log a warning", "console.warn($0)"],
  ["error", "Log an error", "console.error($0)"],
  ["useState", "React state hook", "const [value, setValue] = useState($0)"],
  ["useEffect", "React effect hook", "useEffect(() => {\n  $0\n}, [])"],
  ["useMemo", "React memo hook", "const value = useMemo(() => $0, [])"],
  ["useCallback", "React callback hook", "const handler = useCallback(() => {\n  $0\n}, [])"],
  ["useRef", "React ref hook", "const ref = useRef($0)"],
  ["useReducer", "React reducer hook", "const [state, dispatch] = useReducer(reducer, $0)"],
  ["useContext", "React context hook", "const value = useContext($0)"],
  ["useLayoutEffect", "React layout effect", "useLayoutEffect(() => {\n  $0\n}, [])"],
  ["createContext", "Create a React context", "const Context = createContext($0)"],
  ["forwardRef", "Forward a React ref", "const Component = forwardRef(($0, ref) => {\n  return null\n})"],
  ["memo", "Memoise a component", "const Component = memo($0)"],
  ["fetch", "Fetch JSON", "fetch($0)\n  .then((response) => response.json())\n  .then((data) => console.log(data))"],
  ["then", "Promise continuation", "then(($0) => {\n  \n})"],
  ["async", "Async arrow function", "const fn = async ($0) => {\n  \n}"],
  ["trycatch", "Try / catch block", "try {\n  $0\n} catch (error) {\n  console.error(error)\n}"],
  ["forEach", "For each item", "for (const item of items) {\n  $0\n}"],
  ["map", "Map over a list", "items.map((item) => $0)"],
  ["raf", "Animation frame", "requestAnimationFrame(() => {\n  $0\n})"],
  ["component", "Function component", "function Component() {\n  return (\n    <div>$0</div>\n  )\n}\n\nexport default Component"],
  ["import", "Import a local module", "import { $0 } from \"\""],
  ["importdefault", "Default import", "import $0 from \"\""],
  ["asyncfunction", "Async function", "async function fn($0) {\n  \n}"],
]

const REACT_HOOKS = [
  "useState", "useEffect", "useMemo", "useCallback", "useRef", "useReducer",
  "useContext", "useLayoutEffect", "useImperativeHandle", "useId", "useTransition",
  "useDeferredValue", "createContext", "forwardRef", "memo", "lazy", "Suspense",
]

const PY_KEYWORDS = [
  "def", "class", "return", "if", "elif", "else", "for", "while", "break",
  "continue", "import", "from", "as", "with", "try", "except", "finally",
  "raise", "lambda", "None", "True", "False", "and", "or", "not", "in", "is",
  "pass", "global", "yield", "async", "await", "self", "assert", "del",
]

const PY_SNIPPETS = [
  ["def", "Function", "def function_name($0):\n    "],
  ["class", "Class", "class ClassName:\n    def __init__(self, $0):\n        "],
  ["ifmain", "Main guard", "if __name__ == \"__main__\":\n    $0"],
  ["tryexcept", "Try / except", "try:\n    $0\nexcept Exception as error:\n    print(error)"],
  ["with", "Open a file", "with open(\"$0\", \"r\", encoding=\"utf-8\") as file:\n    "],
  ["print", "Print", "print($0)"],
  ["forin", "For loop", "for item in items:\n    $0"],
]

const CSS_PROPERTIES = [
  "display", "position", "top", "right", "bottom", "left", "width", "height",
  "max-width", "min-width", "max-height", "min-height", "margin", "margin-top",
  "margin-right", "margin-bottom", "margin-left", "padding", "padding-top",
  "padding-right", "padding-bottom", "padding-left", "color", "background",
  "background-color", "background-image", "border", "border-color",
  "border-width", "border-style", "border-radius", "box-shadow", "outline",
  "font-family", "font-size", "font-weight", "font-style", "line-height",
  "letter-spacing", "text-align", "text-decoration", "text-transform",
  "white-space", "overflow", "overflow-x", "overflow-y", "z-index", "opacity",
  "transform", "transition", "animation", "cursor", "object-fit", "object-position",
  "flex", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
  "align-items", "align-content", "align-self", "justify-content", "justify-items",
  "gap", "row-gap", "column-gap", "grid", "grid-template-columns",
  "grid-template-rows", "grid-column", "grid-row", "place-items", "user-select",
  "pointer-events", "visibility", "resize", "aspect-ratio", "box-sizing",
]

const HTML_TAGS = [
  "a", "abbr", "address", "article", "aside", "audio", "b", "blockquote", "body",
  "br", "button", "canvas", "caption", "code", "col", "colgroup", "data", "datalist",
  "dd", "details", "dialog", "div", "dl", "dt", "em", "fieldset", "figcaption",
  "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header",
  "hr", "html", "i", "iframe", "img", "input", "label", "legend", "li", "link",
  "main", "map", "mark", "meta", "meter", "nav", "noscript", "object", "ol",
  "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "s",
  "samp", "script", "section", "select", "slot", "small", "source", "span", "strong",
  "style", "sub", "summary", "sup", "svg", "table", "tbody", "td", "template",
  "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul",
  "var", "video",
]

const VOID_TAGS = new Set([
  "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
])

const HTML_BOILERPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
</head>
<body>
  $0
</body>
</html>`

const HTML_SNIPPETS = [
  ["!", "HTML5 boilerplate", HTML_BOILERPLATE],
  ["html5", "HTML5 boilerplate", HTML_BOILERPLATE],
  ["linkcss", "Stylesheet link", '<link rel="stylesheet" href="$0" />'],
  ["scriptjs", "Script tag", '<script src="$0"></script>'],
]

const HTML_ATTRS = [
  "class", "className", "id", "style", "src", "href", "alt", "title", "type",
  "name", "value", "placeholder", "disabled", "checked", "selected", "required",
  "readOnly", "multiple", "autofocus", "target", "rel", "action", "method", "for",
  "role", "aria-label", "aria-hidden", "data-testid", "onClick", "onChange",
  "onSubmit", "onInput", "onKeyDown", "onKeyUp", "onMouseEnter", "onMouseLeave",
  "onFocus", "onBlur",
]

const EVENT_ATTRS = new Set([
  "onClick", "onChange", "onSubmit", "onInput", "onKeyDown", "onKeyUp",
  "onMouseEnter", "onMouseLeave", "onFocus", "onBlur",
])

const BOOLEAN_ATTRS = new Set([
  "disabled", "checked", "selected", "required", "readOnly", "multiple", "autofocus",
])

const STRING_ATTRS = new Set([
  "class", "className", "id", "style", "src", "href", "alt", "title", "type",
  "name", "value", "placeholder", "target", "rel", "action", "method", "for",
  "role", "aria-label", "aria-hidden", "data-testid",
])

const SHELL_COMMANDS = [
  "cd", "ls", "pwd", "echo", "mkdir", "touch", "rm", "cp", "mv", "cat", "grep",
  "find", "chmod", "chown", "git", "npm", "pnpm", "yarn", "node", "docker",
  "curl", "export", "source", "sudo", "apt", "brew", "tail", "head", "less",
]

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "CREATE", "TABLE", "ALTER", "DROP", "JOIN", "LEFT", "RIGHT",
  "INNER", "OUTER", "ON", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
  "AS", "AND", "OR", "NOT", "NULL", "DISTINCT", "COUNT", "SUM", "AVG", "MIN",
  "MAX", "INDEX", "PRIMARY", "KEY", "FOREIGN", "REFERENCES",
]

const GENERIC_KEYWORDS = [
  "public", "private", "protected", "class", "interface", "extends", "implements",
  "return", "if", "else", "for", "while", "switch", "case", "break", "continue",
  "new", "this", "super", "static", "final", "void", "int", "long", "double",
  "float", "boolean", "char", "string", "true", "false", "null", "nil", "package",
  "import", "func", "fn", "let", "var", "const", "match", "struct", "enum",
  "impl", "trait", "use", "mod", "pub", "async", "await", "try", "catch", "throw",
]

const MEMBERS = {
  console: [
    ["log", "Log values", "log($0)"],
    ["warn", "Log a warning", "warn($0)"],
    ["error", "Log an error", "error($0)"],
    ["info", "Log information", "info($0)"],
    ["table", "Log a table", "table($0)"],
    ["time", "Start a timer", "time($0)"],
    ["timeEnd", "Stop a timer", "timeEnd($0)"],
    ["clear", "Clear the console", "clear()"],
  ],
  Math: [
    ["random", "Random number", "random()"],
    ["floor", "Round down", "floor($0)"],
    ["ceil", "Round up", "ceil($0)"],
    ["round", "Round", "round($0)"],
    ["max", "Maximum", "max($0)"],
    ["min", "Minimum", "min($0)"],
    ["abs", "Absolute value", "abs($0)"],
    ["pow", "Power", "pow($0)"],
  ],
  JSON: [
    ["parse", "Parse JSON", "parse($0)"],
    ["stringify", "Serialise JSON", "stringify($0)"],
  ],
  Object: [
    ["keys", "Object keys", "keys($0)"],
    ["values", "Object values", "values($0)"],
    ["entries", "Object entries", "entries($0)"],
    ["assign", "Merge objects", "assign($0)"],
    ["freeze", "Freeze an object", "freeze($0)"],
  ],
  Array: [
    ["isArray", "Check for an array", "isArray($0)"],
    ["from", "Create an array", "from($0)"],
    ["of", "Create an array", "of($0)"],
  ],
  document: [
    ["querySelector", "Find an element", "querySelector(\"$0\")"],
    ["querySelectorAll", "Find all elements", "querySelectorAll(\"$0\")"],
    ["getElementById", "Find by id", "getElementById(\"$0\")"],
    ["createElement", "Create an element", "createElement(\"$0\")"],
    ["addEventListener", "Listen for an event", "addEventListener(\"$0\", (event) => {\n  \n})"],
    ["body", "Document body", "body"],
  ],
  window: [
    ["addEventListener", "Listen for an event", "addEventListener(\"$0\", (event) => {\n  \n})"],
    ["removeEventListener", "Remove a listener", "removeEventListener(\"$0\", handler)"],
    ["location", "Window location", "location"],
    ["localStorage", "Local storage", "localStorage"],
    ["innerWidth", "Viewport width", "innerWidth"],
    ["innerHeight", "Viewport height", "innerHeight"],
  ],
  process: [
    ["env", "Environment variables", "env.$0"],
    ["argv", "Command line arguments", "argv"],
    ["exit", "Exit the process", "exit($0)"],
    ["cwd", "Current directory", "cwd()"],
  ],
  res: [
    ["status", "Set status code", "status($0)"],
    ["json", "Send JSON", "json($0)"],
    ["send", "Send a response", "send($0)"],
    ["redirect", "Redirect", "redirect($0)"],
    ["set", "Set a header", "set(\"$0\", value)"],
  ],
  req: [
    ["body", "Request body", "body"],
    ["params", "Route params", "params"],
    ["query", "Query string", "query"],
    ["headers", "Request headers", "headers"],
    ["method", "HTTP method", "method"],
  ],
}

export const languageCompletions = (language = "plain") => {
  if (language === "javascript" || language === "typescript") {
    const items = [
      ...JS_SNIPPETS.map(([label, detail, insert]) => ({ label, detail, insert, kind: "snippet" })),
      ...JS_KEYWORDS.map((label) => ({ label, detail: "Keyword", insert: label, kind: "keyword" })),
      ...REACT_HOOKS.map((label) => ({ label, detail: "React", insert: label, kind: "function" })),
      ...JS_GLOBALS.map((label) => ({ label, detail: "Global", insert: label, kind: "variable" })),
    ]
    if (language === "typescript") {
      items.push(
        ...TS_KEYWORDS.map((label) => ({ label, detail: "TypeScript", insert: label, kind: "keyword" })),
        { label: "interface", detail: "TypeScript", insert: "interface Name {\n  $0\n}", kind: "snippet" },
        { label: "type", detail: "TypeScript", insert: "type Name = $0", kind: "snippet" },
      )
    }
    return items
  }

  if (language === "python") {
    return [
      ...PY_SNIPPETS.map(([label, detail, insert]) => ({ label, detail, insert, kind: "snippet" })),
      ...PY_KEYWORDS.map((label) => ({ label, detail: "Keyword", insert: label, kind: "keyword" })),
    ]
  }

  if (language === "css") {
    return CSS_PROPERTIES.map((label) => ({
      label,
      detail: "CSS property",
      insert: `${label}: $0;`,
      kind: "property",
    }))
  }

  if (language === "markup") {
    return [
      ...HTML_SNIPPETS.map(([label, detail, insert]) => ({ label, detail, insert, kind: "snippet" })),
      ...HTML_TAGS.map((label) => ({ label, detail: "HTML tag", kind: "tag" })),
      ...HTML_ATTRS.map((label) => ({ label, detail: "HTML attribute", kind: "attr" })),
    ]
  }

  if (language === "shell") {
    return SHELL_COMMANDS.map((label) => ({ label, detail: "Command", insert: label, kind: "function" }))
  }

  if (language === "sql") {
    return SQL_KEYWORDS.map((label) => ({ label, detail: "SQL keyword", insert: label, kind: "keyword" }))
  }

  if (language === "json") {
    return ["true", "false", "null"].map((label) => ({
      label,
      detail: "JSON value",
      insert: label,
      kind: "constant",
    }))
  }

  if (language === "yaml") {
    return ["true", "false", "null", "yes", "no"].map((label) => ({
      label,
      detail: "YAML value",
      insert: label,
      kind: "constant",
    }))
  }

  if (language === "generic") {
    return GENERIC_KEYWORDS.map((label) => ({
      label,
      detail: "Keyword",
      insert: label,
      kind: "keyword",
    }))
  }

  return []
}

/**
 * The word (and optional member object) immediately before a caret.
 * `before` is the character in front of the word, which lets callers tell
 * `<div` from `foo.div` without a full parse.
 */
export const wordPrefixAt = (text = "", offset = 0) => {
  const end = Math.min(Math.max(offset, 0), text.length)
  let start = end
  while (start > 0 && /[A-Za-z0-9_$-]/.test(text[start - 1])) start -= 1
  // `!` is an Emmet-style trigger (HTML5 boilerplate), so it belongs to the
  // replaceable prefix rather than sitting in front of an empty word.
  if (start > 0 && text[start - 1] === "!") start -= 1

  const before = start > 0 ? text[start - 1] : ""
  let object = ""

  if (before === ".") {
    let cursor = start - 1
    while (cursor > 0 && /[A-Za-z0-9_$]/.test(text[cursor - 1])) cursor -= 1
    object = text.slice(cursor, start - 1)
  }

  return { start, end, word: text.slice(start, end), before, object }
}

const COMMENT_RULES = {
  javascript: { line: ["//"], block: [["/*", "*/"]], quotes: ['"', "'", "`"] },
  typescript: { line: ["//"], block: [["/*", "*/"]], quotes: ['"', "'", "`"] },
  css: { line: [], block: [["/*", "*/"]], quotes: ['"', "'"] },
  python: { line: ["#"], block: [], quotes: ['"', "'"] },
  shell: { line: ["#"], block: [], quotes: ['"', "'"] },
  yaml: { line: ["#"], block: [], quotes: ['"', "'"] },
  sql: { line: ["--"], block: [["/*", "*/"]], quotes: ["'", '"'] },
  markup: { line: [], block: [["<!--", "-->"]], quotes: ['"', "'"] },
  markdown: { line: [], block: [["<!--", "-->"]], quotes: [] },
  generic: { line: ["//"], block: [["/*", "*/"]], quotes: ['"', "'", "`"] },
  plain: { line: [], block: [], quotes: [] },
}

/** True when the caret sits inside a comment or a quoted string. */
export const isInsideCommentOrString = (text = "", offset = 0, language = "plain") => {
  const rules = COMMENT_RULES[language] ?? COMMENT_RULES.plain
  const end = Math.min(Math.max(offset, 0), text.length)
  let mode = null
  let quote = ""

  for (let index = 0; index < end; index += 1) {
    const character = text[index]

    if (mode === "line") {
      if (character === "\n") mode = null
      continue
    }

    if (mode === "block") {
      const pair = rules.block.find(([, close]) => text.startsWith(close, index))
      if (pair) {
        mode = null
        index += pair[1].length - 1
      }
      continue
    }

    if (mode === "string") {
      if (character === "\\") {
        index += 1
        continue
      }
      if (character === quote) mode = null
      continue
    }

    const line = rules.line.find((marker) => text.startsWith(marker, index))
    if (line) {
      mode = "line"
      index += line.length - 1
      continue
    }

    const block = rules.block.find(([open]) => text.startsWith(open, index))
    if (block) {
      mode = "block"
      index += block[0].length - 1
      continue
    }

    if (rules.quotes.includes(character)) {
      mode = "string"
      quote = character
    }
  }

  return mode !== null
}

const fuzzyScore = (label, word) => {
  const target = label.toLowerCase()
  const query = word.toLowerCase()

  if (!query) return 50
  if (target === query) return 200
  if (target.startsWith(query)) return 140 - (target.length - query.length)
  if (target.includes(query)) return 70 - target.indexOf(query)

  let cursor = 0
  let gaps = 0
  for (let index = 0; index < target.length && cursor < query.length; index += 1) {
    if (target[index] === query[cursor]) {
      cursor += 1
      if (cursor > 1) gaps += index > 0 && target[index - 1] !== query[cursor - 2] ? 1 : 0
    }
  }

  if (cursor < query.length) return -1
  return 30 - gaps - Math.floor(target.length / 8)
}

const memberItems = (object, word) => {
  const members = MEMBERS[object]
  if (!members) return []

  const items = members.map(([label, detail, insert]) => ({
    label,
    detail: `${object}.${label}${detail ? ` · ${detail}` : ""}`,
    insert,
    kind: "function",
  }))

  if (!word) return items

  const query = word.toLowerCase()
  return items
    .filter((item) => item.label.toLowerCase().includes(query))
    .sort(
      (a, b) =>
        Number(b.label.toLowerCase().startsWith(query)) -
        Number(a.label.toLowerCase().startsWith(query)),
    )
}

const htmlContext = (text, offset, start) => {
  const open = text.lastIndexOf("<", Math.max(offset - 1, 0))
  const close = text.lastIndexOf(">", Math.max(offset - 1, 0))
  if (open <= close) return null

  const afterOpen = open + 1
  const isClosing = text[afterOpen] === "/"
  const nameStart = isClosing ? afterOpen + 1 : afterOpen
  if (start <= nameStart) {
    return { scope: "tag", isClosing }
  }
  return { scope: "attribute", isClosing }
}

// JSX uses the same tag/attribute grammar as HTML, but plain JavaScript also
// uses `<` for comparisons and generics. Requiring a tag-name character right
// after the angle bracket and a non-identifier before it keeps `a < b` and
// `Array<string>` from opening an HTML completion list.
const jsxContext = (text, offset, start) => {
  const open = text.lastIndexOf("<", Math.max(offset - 1, 0))
  if (open === -1) return null

  const close = text.lastIndexOf(">", Math.max(offset - 1, 0))
  if (open <= close) return null

  const next = text[open + 1]
  if (!next || !/[A-Za-z/]/.test(next)) return null
  if (open > 0 && /[A-Za-z0-9_$]/.test(text[open - 1])) return null

  const isClosing = next === "/"
  const nameStart = isClosing ? open + 2 : open + 1
  if (start <= nameStart) return { scope: "tag", isClosing }
  return { scope: "attribute", isClosing }
}

const attributeInsert = (label) => {
  if (EVENT_ATTRS.has(label)) return `${label}={$0}`
  if (BOOLEAN_ATTRS.has(label)) return label
  if (STRING_ATTRS.has(label)) return `${label}="$0"`
  return `${label}="$0"`
}

const buildHtmlItems = (base, context) => {
  if (context?.scope === "attribute") {
    return base
      .filter((item) => item.kind === "attr")
      .map((item) => ({ ...item, insert: attributeInsert(item.label) }))
  }

  const withoutAttributes = base.filter((item) => item.kind !== "attr")
  if (!context) return withoutAttributes

  return base
    .filter((item) => item.kind === "tag")
    .map((item) => {
      if (context?.isClosing) return { ...item, insert: `${item.label}>`, detail: "Closing tag" }
      if (VOID_TAGS.has(item.label)) return { ...item, insert: `${item.label} />`, detail: "Void tag" }
      return { ...item, insert: `${item.label}>$0</${item.label}>`, detail: "HTML tag" }
    })
}

/* ------------------------------------------------- project-aware paths */

const stringAt = (text, offset) => {
  const lineStart = text.lastIndexOf("\n", Math.max(offset - 1, 0)) + 1
  let quote = ""
  let start = -1

  for (let index = lineStart; index < offset; index += 1) {
    const character = text[index]

    if (!quote) {
      if (character === '"' || character === "'" || character === "`") {
        quote = character
        start = index
      }
      continue
    }

    if (character === "\\") {
      index += 1
      continue
    }
    if (character === quote) {
      quote = ""
      start = -1
    }
  }

  return quote ? { quote, start } : null
}

const PATH_CONTEXTS = [
  { pattern: /(?:^|[^\w$])from\s*$/i, kind: "module" },
  { pattern: /(?:^|[^\w$])import\s*$/i, kind: "module" },
  { pattern: /(?:require|import)\s*\(\s*$/i, kind: "module" },
  { pattern: /url\(\s*$/i, kind: "asset" },
  { pattern: /(?:src|href|poster|action|data)\s*=\s*$/i, kind: "asset" },
]

const pathContextAt = (text, offset) => {
  const string = stringAt(text, offset)
  if (!string) return null

  const before = text.slice(Math.max(0, string.start - 80), string.start)
  const context = PATH_CONTEXTS.find((item) => item.pattern.test(before))
  if (!context) return null

  return {
    start: string.start + 1,
    typed: text.slice(string.start + 1, offset),
    kind: context.kind,
  }
}

const splitPath = (value = "") => value.split("/").filter(Boolean)

const fullStringAt = (text, offset) => {
  const string = stringAt(text, offset)
  if (!string) return null

  let end = offset
  while (end < text.length) {
    if (text[end] === "\\") {
      end += 2
      continue
    }
    if (text[end] === string.quote) break
    if (text[end] === "\n" && string.quote !== "`") break
    end += 1
  }

  return { ...string, end, value: text.slice(string.start + 1, end) }
}

const normalisePath = (parts) => {
  const output = []

  for (const part of parts) {
    if (!part || part === ".") continue
    if (part === "..") {
      if (output.length) output.pop()
      continue
    }
    output.push(part)
  }

  return output.join("/")
}

/** Resolve the path string under the caret to a project-relative path. */
export const resolveProjectPath = ({ text = "", offset = 0, filePath = "" } = {}) => {
  const string = fullStringAt(text, offset)
  if (!string || !filePath) return null

  const before = text.slice(Math.max(0, string.start - 80), string.start)
  const context = PATH_CONTEXTS.find((item) => item.pattern.test(before))
  if (!context) return null

  const typed = string.value.split(/[?#]/)[0]
  if (!typed) return null
  if (context.kind === "module" && !typed.startsWith(".") && !typed.startsWith("/")) {
    return null
  }

  const root = splitPath(filePath)[0]
  if (typed.startsWith("/")) {
    return normalisePath([root, ...typed.split("/")])
  }

  const base = splitPath(filePath).slice(0, -1)
  return normalisePath([...base, ...typed.split("/")])
}

const PROJECT_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts",
  ".json", ".css", ".scss", ".sass", ".less", ".html", ".svg",
]
const INDEX_FILES = ["index", "main", "app"]

/** Find an existing project entry for a resolved path, trying common imports. */
export const findProjectPath = (target, projectEntries = []) => {
  if (!target) return null

  const entries = projectEntries
    .map((entry) => (typeof entry === "string" ? { path: entry, type: "file" } : entry))
    .filter((entry) => entry?.path && entry.type !== "folder")
  const wanted = target.toLowerCase()
  const exact = entries.find((entry) => entry.path.toLowerCase() === wanted)
  if (exact) return exact.path

  for (const extension of PROJECT_EXTENSIONS) {
    const candidate = entries.find((entry) => entry.path.toLowerCase() === `${wanted}${extension}`)
    if (candidate) return candidate.path
  }

  for (const index of INDEX_FILES) {
    for (const extension of PROJECT_EXTENSIONS) {
      const candidate = entries.find(
        (entry) => entry.path.toLowerCase() === `${wanted}/${index}${extension}`,
      )
      if (candidate) return candidate.path
    }
  }

  return null
}

const relativeProjectPath = (fromFile, toPath) => {
  const from = splitPath(fromFile).slice(0, -1)
  const to = splitPath(toPath)
  let common = 0

  while (common < from.length && common < to.length && from[common] === to[common]) {
    common += 1
  }

  return [...Array(from.length - common).fill(".."), ...to.slice(common)].join("/")
}

const MODULE_EXTENSION = /\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$/i

const projectPathItems = ({ text, offset, filePath, projectEntries }) => {
  const context = pathContextAt(text, offset)
  if (!context || !filePath) return null

  const currentDir = splitPath(filePath).slice(0, -1).join("/")
  const query = context.typed.toLowerCase()
  const seen = new Set()

  const items = projectEntries
    .map((entry) => (typeof entry === "string" ? { path: entry, type: "file" } : entry))
    .filter((entry) => entry?.path && entry.path !== filePath && entry.path !== currentDir)
    .map((entry) => {
      const relative = relativeProjectPath(filePath, entry.path)
      const rootRelative = splitPath(entry.path).slice(1).join("/")
      const target = context.typed.startsWith("/") ? `/${rootRelative}` : relative
      const isFolder = entry.type === "folder"
      const insert = isFolder
        ? `${target.replace(/\/$/, "")}/`
        : context.kind === "module"
          ? target.replace(MODULE_EXTENSION, "")
          : target
      const label = insert.startsWith(".") || insert.startsWith("/") ? insert : `./${insert}`

      if (seen.has(label)) return null
      seen.add(label)

      const lower = label.toLowerCase()
      const bare = lower.replace(/^\.\//, "")
      const score = !query
        ? 50
        : lower.startsWith(query)
          ? 100 - lower.length
          : bare.startsWith(query)
            ? 80 - lower.length
            : lower.includes(query)
              ? 40 - lower.length
              : -1

      if (score < 0) return null

      return {
        label,
        detail: isFolder ? "Project folder" : "Project file",
        insert: label,
        kind: isFolder ? "folder" : "file",
        score,
        replaceStart: context.start,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))

  return items
}

/**
 * Ranked completion candidates for a caret position.
 * Returns an empty list inside comments, strings and plain text.
 */
export const suggestCompletions = ({
  text = "",
  offset = 0,
  language = "plain",
  limit = 50,
  filePath = "",
  projectEntries = [],
} = {}) => {
  const safeOffset = Math.min(Math.max(offset, 0), text.length)
  if (language === "plain") return []

  // Paths live inside quotes, so check for an import/link context before the
  // comment-and-string guard rejects the caret.
  const paths = projectPathItems({ text, offset: safeOffset, filePath, projectEntries })
  if (paths?.length) return paths.slice(0, limit)

  if (isInsideCommentOrString(text, safeOffset, language)) return []

  const prefix = wordPrefixAt(text, safeOffset)
  if (prefix.before === "." && prefix.object) {
    return memberItems(prefix.object, prefix.word).slice(0, limit)
  }

  const base = languageCompletions(language)
  if (!base.length) return []

  let items = base
  if (language === "markup") {
    items = buildHtmlItems(base, htmlContext(text, safeOffset, prefix.start))
  } else if (language === "javascript" || language === "typescript") {
    const context = jsxContext(text, safeOffset, prefix.start)
    if (context) items = buildHtmlItems(languageCompletions("markup"), context)
  }

  const ranked = items
    .map((item) => {
      const score = fuzzyScore(item.filter ?? item.label, prefix.word)
      return score < 0 ? null : { ...item, score }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))

  const seen = new Set()
  return ranked
    .filter((item) => {
      const key = item.label
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

export { MEMBERS, HTML_TAGS, CSS_PROPERTIES }
