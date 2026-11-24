import { loader } from "@monaco-editor/react"
import Editor from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "../../hooks/themeContext"
import { fileUri, setActiveEditorGetter, setMonacoModelDisposer } from "./editorConfig"
import { registerEditorKeybindings } from "./editorKeybindings"
import { suggestCompletions, wordPrefixAt } from "../../utils/completions"
import { lineHeightPx } from "../../utils/editorSettings"

loader.config({ monaco })

const MONACO_FONT_FAMILY = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
const LARGE_FILE_THRESHOLD = 250_000
const NEXPULSE_THEME_ID = "nexpulse"

const toHex6 = (color, fallback) => {
  if (typeof color !== "string") return fallback
  const trimmed = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
  }
  return fallback
}

const stripHash = (hex) => hex.replace(/^#/, "")

const defineNexPulseTheme = (monacoInstance, theme) => {
  if (!monacoInstance?.editor?.defineTheme || !theme) return
  const isLight = theme.type === "light"
  const bg = toHex6(theme.bg, isLight ? "#ffffff" : "#282c34")
  const fg = toHex6(theme.fg, isLight ? "#24292f" : "#abb2bf")
  const sidebar = toHex6(theme.sidebar, bg)
  const selection = toHex6(theme.selection, isLight ? "#ddf4ff" : "#3e4451")
  const activeLine = toHex6(theme.activeLine, bg)
  const lineNumber = toHex6(theme.lineNumber || theme.dim, isLight ? "#6e7781" : "#5c6370")
  const cursor = toHex6(theme.cursor || theme.accent, isLight ? "#0969da" : "#61afef")
  const s = theme.syntax || {}

  monacoInstance.editor.defineTheme(NEXPULSE_THEME_ID, {
    base: isLight ? "vs" : "vs-dark",
    inherit: true,
    rules: [
      s.comment ? { token: "comment", foreground: stripHash(toHex6(s.comment, lineNumber)), fontStyle: "italic" } : null,
      s.keyword ? { token: "keyword", foreground: stripHash(toHex6(s.keyword, fg)) } : null,
      s.string ? { token: "string", foreground: stripHash(toHex6(s.string, fg)) } : null,
      s.number ? { token: "number", foreground: stripHash(toHex6(s.number, fg)) } : null,
      s.fn ? { token: "identifier.function", foreground: stripHash(toHex6(s.fn, fg)) } : null,
      s.klass ? { token: "type", foreground: stripHash(toHex6(s.klass, fg)) } : null,
      s.operator ? { token: "operator", foreground: stripHash(toHex6(s.operator, fg)) } : null,
      s.tag ? { token: "tag", foreground: stripHash(toHex6(s.tag, fg)) } : null,
      s.attr ? { token: "attribute.name", foreground: stripHash(toHex6(s.attr, fg)) } : null,
    ].filter(Boolean),
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
      "editorGutter.background": sidebar,
      "editorLineNumber.foreground": lineNumber,
      "editorLineNumber.activeForeground": fg,
      "editor.lineHighlightBackground": activeLine,
      "editor.selectionBackground": selection,
      "editorCursor.foreground": cursor,
    },
  })
}

const buildKindMap = (monacoInstance) => {
  const languages = monacoInstance?.languages
  const CompletionItemKind = languages?.CompletionItemKind
  const InsertAsSnippet = languages?.CompletionItemInsertTextRule?.InsertAsSnippet

  if (!CompletionItemKind?.Snippet || InsertAsSnippet === undefined) {
    throw new Error("Monaco CompletionItemKind API is unavailable")
  }

  const kindMap = {
    text: CompletionItemKind.Text,
    method: CompletionItemKind.Method,
    function: CompletionItemKind.Function,
    constructor: CompletionItemKind.Constructor,
    field: CompletionItemKind.Field,
    variable: CompletionItemKind.Variable,
    class: CompletionItemKind.Class,
    interface: CompletionItemKind.Interface,
    module: CompletionItemKind.Module,
    property: CompletionItemKind.Property,
    unit: CompletionItemKind.Unit,
    value: CompletionItemKind.Value,
    enum: CompletionItemKind.Enum,
    keyword: CompletionItemKind.Keyword,
    snippet: CompletionItemKind.Snippet,
    color: CompletionItemKind.Color,
    file: CompletionItemKind.File,
    reference: CompletionItemKind.Reference,
    folder: CompletionItemKind.Folder,
    enumMember: CompletionItemKind.EnumMember,
    constant: CompletionItemKind.Constant,
    struct: CompletionItemKind.Struct,
    event: CompletionItemKind.Event,
    operator: CompletionItemKind.Operator,
    typeParameter: CompletionItemKind.TypeParameter,
    tag: CompletionItemKind.Class,
    attr: CompletionItemKind.Property,
    default: CompletionItemKind.Text,
  }

  return { kindMap, insertTextRules: InsertAsSnippet }
}

function MonacoEditor({
  value = "",
  language = "plaintext",
  filePath = "",
  projectId = "",
  settings,
  readOnly = false,
  ariaLabel = "Code",
  onChange,
  onCursorChange,
  onSelectionChange,
  projectEntries = [],
}) {
  const { theme } = useTheme()

  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const kindMapRef = useRef(null)
  const onCursorChangeRef = useRef(onCursorChange)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const onChangeRef = useRef(onChange)
  const themeRef = useRef(theme)
  const settingsRef = useRef(settings)
  const languageRef = useRef(language)
  const filePathRef = useRef(filePath)
  const projectEntriesRef = useRef(projectEntries)
  const insertTextRulesRef = useRef(null)
  const editorKeybindingsRef = useRef(null)
  const editorEventDisposablesRef = useRef([])
  const [monacoReady, setMonacoReady] = useState(false)

  useEffect(() => {
    themeRef.current = theme
    if (monacoReady && monacoRef.current) {
      defineNexPulseTheme(monacoRef.current, theme)
      monacoRef.current.editor.setTheme(NEXPULSE_THEME_ID)
    }
  }, [theme, monacoReady])

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange
  }, [onCursorChange])

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    filePathRef.current = filePath
  }, [filePath])

  useEffect(() => {
    projectEntriesRef.current = projectEntries
  }, [projectEntries])

  useEffect(
    () => () => {
      editorKeybindingsRef.current?.dispose()
      editorKeybindingsRef.current = null
      editorEventDisposablesRef.current.forEach((disposable) => disposable?.dispose?.())
      editorEventDisposablesRef.current = []
      setActiveEditorGetter(null)
      setMonacoModelDisposer(null)
      // Dispose open file models when leaving the editor workspace to prevent memory leaks.
      monacoRef.current?.editor?.getModels?.().forEach((model) => model?.dispose?.())
    },
    [],
  )

  const normalizedValue = useMemo(() => {
    const str = String(value ?? "")
    return str.indexOf("\r") !== -1 ? str.replace(/\r\n?/g, "\n") : str
  }, [value])

  const isLargeFile = normalizedValue.length > LARGE_FILE_THRESHOLD
  const lineHeight = lineHeightPx(settings)
  const monacoLanguage = useMemo(() => {
    if (language === "markup") return "html"
    if (language === "plain" || language === "generic") return "plaintext"
    return language
  }, [language])
  const modelPath = useMemo(() => fileUri(projectId, filePath), [projectId, filePath])

  const options = useMemo(
    () => ({
      automaticLayout: true,
      ariaLabel,
      fontSize: settings?.fontSize ?? 13,
      fontFamily: MONACO_FONT_FAMILY,
      lineHeight,
      wordWrap: isLargeFile ? "off" : settings?.wordWrap ? "on" : "off",
      tabSize: settings?.tabSize ?? 2,
      insertSpaces: true,
      lineNumbers:
        settings?.showLineNumbers === false
          ? "off"
          : settings?.relativeLineNumbers
            ? "relative"
            : "on",
      minimap: { enabled: !isLargeFile && settings?.showMinimap !== false },
      renderLineHighlight: isLargeFile || settings?.showActiveLine === false ? "none" : "line",
      renderLineHighlightOnlyWhenFocus: false,
      fontLigatures: Boolean(settings?.ligatures),
      readOnly: readOnly === true,
      guides: { indentation: !isLargeFile && settings?.indentGuides !== false },
      rulers: settings?.rulers ? [100] : [],
      padding: { top: 8 },
      scrollBeyondLastLine: false,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: isLargeFile ? "off" : "on",
      matchBrackets: isLargeFile ? "never" : "always",
      occurrencesHighlight: isLargeFile ? "off" : "singleFile",
      folding: !isLargeFile,
      largeFileOptimizations: true,
      smoothScrolling: true,
      autoIndent: "advanced",
    }),
    [settings, readOnly, lineHeight, ariaLabel, isLargeFile],
  )

  const beforeMount = useCallback((monacoInstance) => {
    if (!monacoInstance?.editor || !monacoInstance?.languages?.CompletionItemKind) {
      throw new Error("Monaco CompletionItemKind API is unavailable")
    }

    monacoRef.current = monacoInstance
    const { kindMap, insertTextRules } = buildKindMap(monacoInstance)
    kindMapRef.current = kindMap
    insertTextRulesRef.current = insertTextRules
    defineNexPulseTheme(monacoInstance, themeRef.current)
    setMonacoReady(true)

    editorKeybindingsRef.current?.dispose()
    editorKeybindingsRef.current = registerEditorKeybindings(monacoInstance)

    setMonacoModelDisposer((uriString) => {
      const uri = monacoInstance.Uri.parse(uriString)
      monacoInstance.editor.getModel(uri)?.dispose()
    })
  }, [])

  const onMount = useCallback((editor, monacoInstance) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance
    setActiveEditorGetter(() => editorRef.current)

    editorEventDisposablesRef.current.forEach((disposable) => disposable?.dispose?.())
    editorEventDisposablesRef.current = []

    editorEventDisposablesRef.current.push(
      editor.onDidChangeCursorPosition((event) => {
        onCursorChangeRef.current?.({ line: event.position.lineNumber, column: event.position.column })
      }),
    )

    editorEventDisposablesRef.current.push(
      editor.onDidChangeCursorSelection((event) => {
        const selection = event.selection
        if (!selection) {
          onSelectionChangeRef.current?.(0)
          return
        }
        const model = editor.getModel()
        const length = model
          ? Math.abs(model.getOffsetAt(selection.getEndPosition()) - model.getOffsetAt(selection.getStartPosition()))
          : 0
        onSelectionChangeRef.current?.(length)
      }),
    )
  }, [])

  // Register one completion provider per active Monaco language; refs supply live
  // file/tree context without tearing down and re-registering on every tree change.
  useEffect(() => {
    if (!monacoReady) return undefined

    const monacoInstance = monacoRef.current
    if (!monacoInstance) return undefined

    const provider = {
      provideCompletionItems(model, position) {
        if (model.getValueLength() > LARGE_FILE_THRESHOLD) {
          return { suggestions: [] }
        }
        const activeSettings = settingsRef.current
        if (activeSettings?.suggestions === false) {
          return { suggestions: [] }
        }

        const text = model.getValue()
        const offset = model.getOffsetAt(position)
        const items = suggestCompletions({
          text,
          offset,
          language: languageRef.current,
          filePath: filePathRef.current,
          projectEntries: projectEntriesRef.current,
        })

        const defaultWord = wordPrefixAt(text, offset)
        const suggestions = items.map((item) => {
          const startOffset = Number.isInteger(item.replaceStart) ? item.replaceStart : defaultWord.start
          const endOffset = Number.isInteger(item.replaceStart) ? offset : defaultWord.end

          const startPosition = model.getPositionAt(startOffset)
          const endPosition = model.getPositionAt(endOffset)

          return {
            label: item.label,
            kind: kindMapRef.current?.[item.kind] ?? kindMapRef.current?.default,
            detail: item.detail,
            insertText: item.insert ?? item.label,
            insertTextRules: insertTextRulesRef.current,
            sortText: String(item.score ?? 0),
            range: new monacoInstance.Range(
              startPosition.lineNumber,
              startPosition.column,
              endPosition.lineNumber,
              endPosition.column,
            ),
          }
        })

        return { suggestions }
      },
    }

    const disposable = monacoInstance.languages.registerCompletionItemProvider(monacoLanguage, provider)
    return () => disposable.dispose()
  }, [monacoReady, monacoLanguage])

  const handleChange = useCallback((next) => {
    onChangeRef.current?.(next)
  }, [])

  return (
    <Editor
      path={modelPath}
      value={normalizedValue}
      language={monacoLanguage}
      theme={NEXPULSE_THEME_ID}
      options={options}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={handleChange}
      width="100%"
      height="100%"
      keepCurrentModel
      saveViewState
    />
  )
}

export default memo(MonacoEditor)
