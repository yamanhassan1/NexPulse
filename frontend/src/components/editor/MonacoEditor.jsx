import { loader } from "@monaco-editor/react"
import Editor from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "../../hooks/themeContext"
import { fileUri, setActiveEditorGetter } from "./editorConfig"
import { registerEditorKeybindings } from "./editorKeybindings"
import { suggestCompletions, wordPrefixAt } from "../../utils/completions"
import { lineHeightPx } from "../../utils/editorSettings"

loader.config({ monaco })

const MONACO_FONT_FAMILY = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

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
  onEditorCommand,
  projectEntries = [],
}) {
  const { theme } = useTheme()

  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const kindMapRef = useRef(null)
  const onEditorCommandRef = useRef(onEditorCommand)
  const onCursorChangeRef = useRef(onCursorChange)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const themeRef = useRef(theme)
  const settingsRef = useRef(settings)
  const insertTextRulesRef = useRef(null)
  const editorKeybindingsRef = useRef(null)
  const editorEventDisposablesRef = useRef([])
  const [monacoReady, setMonacoReady] = useState(false)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    onEditorCommandRef.current = onEditorCommand
  }, [onEditorCommand])

  useEffect(() => {
    onCursorChangeRef.current = onCursorChange
  }, [onCursorChange])

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(
    () => () => {
      editorKeybindingsRef.current?.dispose()
      editorKeybindingsRef.current = null
      editorEventDisposablesRef.current.forEach((disposable) => disposable?.dispose?.())
      editorEventDisposablesRef.current = []
    },
    [],
  )

  const normalizedValue = useMemo(() => String(value ?? "").replace(/\r\n?/g, "\n"), [value])
  const lineHeight = lineHeightPx(settings)
  const monacoLanguage = useMemo(() => {
    if (language === "markup") return "html"
    if (language === "plain" || language === "generic") return "plaintext"
    return language
  }, [language])
  const themeId = useMemo(() => (theme?.type === "light" ? "vs" : "vs-dark"), [theme?.type])
  const modelPath = useMemo(() => fileUri(projectId, filePath), [projectId, filePath])

  const options = useMemo(
    () => ({
      automaticLayout: true,
      ariaLabel,
      fontSize: settings?.fontSize ?? 13,
      fontFamily: MONACO_FONT_FAMILY,
      lineHeight,
      wordWrap: settings?.wordWrap ? "on" : "off",
      tabSize: settings?.tabSize ?? 2,
      insertSpaces: true,
      lineNumbers: settings?.showLineNumbers === false ? "off" : "on",
      minimap: { enabled: settings?.showMinimap !== false },
      renderLineHighlight: settings?.showActiveLine === false ? "none" : "line",
      renderLineHighlightOnlyWhenFocus: false,
      fontLigatures: settings?.ligatures ? true : false,
      readOnly: readOnly === true,
      guides: { indentation: settings?.indentGuides !== false },
      rulers: settings?.rulers ? [100] : [],
      padding: { top: 8 },
      scrollBeyondLastLine: false,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      matchBrackets: "always",
      smoothScrolling: true,
      autoIndent: "advanced",
    }),
    [settings, readOnly, lineHeight, ariaLabel],
  )

  const beforeMount = useCallback((monacoInstance) => {
    if (!monacoInstance?.editor || !monacoInstance?.languages?.CompletionItemKind) {
      throw new Error("Monaco CompletionItemKind API is unavailable")
    }

    monacoRef.current = monacoInstance
    const { kindMap, insertTextRules } = buildKindMap(monacoInstance)
    kindMapRef.current = kindMap
    insertTextRulesRef.current = insertTextRules
    setMonacoReady(true)

    editorKeybindingsRef.current?.dispose()
    editorKeybindingsRef.current = registerEditorKeybindings(monacoInstance)
  }, [])

  const onMount = useCallback((editor, monacoInstance) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance
    setActiveEditorGetter(() => editorRef.current)

    editorEventDisposablesRef.current.forEach((disposable) => disposable?.dispose?.())
    editorEventDisposablesRef.current = []

    editorEventDisposablesRef.current.push(editor.onDidChangeCursorPosition((event) => {
      onCursorChangeRef.current?.({ line: event.position.lineNumber, column: event.position.column })
    }))

    editorEventDisposablesRef.current.push(editor.onDidChangeCursorSelection((event) => {
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
    }))
  }, [])

  useEffect(() => {
    if (!monacoReady) return undefined

    const monacoInstance = monacoRef.current
    if (!monacoInstance) return undefined

    const provider = {
      provideCompletionItems(model, position) {
        const text = model.getValue()
        const offset = model.getOffsetAt(position)
        const activeSettings = settingsRef.current
        const items = activeSettings?.suggestions === false ? [] : suggestCompletions({ text, offset, language, filePath, projectEntries })

        const suggestions = items.map((item) => {
          const suggestion = {
            label: item.label,
            kind: kindMapRef.current?.[item.kind] ?? kindMapRef.current?.default,
            detail: item.detail,
            insertText: item.insert ?? item.label,
            insertTextRules: insertTextRulesRef.current,
            sortText: String(item.score ?? 0),
          }

          const startOffset = Number.isInteger(item.replaceStart) ? item.replaceStart : wordPrefixAt(text, offset).start
          const endOffset = Number.isInteger(item.replaceStart) ? offset : wordPrefixAt(text, offset).end

          const startPosition = model.getPositionAt(startOffset)
          const endPosition = model.getPositionAt(endOffset)
          suggestion.range = new monacoInstance.Range(startPosition, endPosition)

          return suggestion
        })

        return { suggestions }
      },
    }

    const disposable = monacoInstance.languages.registerCompletionItemProvider(monacoLanguage, provider)
    return () => disposable.dispose()
  }, [monacoReady, language, monacoLanguage, filePath, projectEntries])

  const handleChange = useCallback(
    (next) => {
      onChange?.(next)
    },
    [onChange],
  )

  return (
    <Editor
      path={modelPath}
      value={normalizedValue}
      language={monacoLanguage}
      theme={themeId}
      options={options}
      beforeMount={beforeMount}
      onMount={onMount}
      onChange={handleChange}
      width="100%"
      height="100%"
      keepCurrentModel={false}
      saveViewState
    />
  )
}

export default MonacoEditor
