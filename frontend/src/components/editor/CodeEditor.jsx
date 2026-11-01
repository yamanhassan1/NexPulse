import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Replace, Search, X } from "lucide-react"
import EditorStatusBar from "./EditorStatusBar"
import CommandPalette from "./CommandPalette"
import { tokenize } from "../../utils/highlight"
import {
  autoIndentOnEnter,
  bracketPairAt,
  commentMarkerFor,
  computeMatches,
  deleteLines,
  indentLines,
  moveLines,
  positionAt,
  toggleComment,
} from "../../utils/editorCommands"
import { lineHeightPx } from "../../utils/editorSettings"
import { guideColumns, visibleLineRange } from "../../utils/indentGuides"

const PAIRS = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" }

function CodeEditor({
  value = "",
  onChange,
  language = "plain",
  fileName = "",
  settings,
  onSettingsChange,
  saveStatus = "saved",
  onSave,
  eol = "LF",
  readOnly = false,
  ariaLabel = "Code",
}) {
  const textareaRef = useRef(null)
  const highlightRef = useRef(null)
  const gutterRef = useRef(null)
  const guideRef = useRef(null)

  const [caret, setCaret] = useState({ offset: 0, start: 0, end: 0 })
  const [find, setFind] = useState(null) // { query, replace, matchCase, regex, index }
  const [palette, setPalette] = useState(false)

  const lineHeight = lineHeightPx(settings)
  const fontStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: `${lineHeight}px`,
    tabSize: settings.tabSize,
    fontVariantLigatures: settings.ligatures ? "contextual" : "none",
    whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
  }

  const lineCount = useMemo(() => value.split("\n").length, [value])
  // Highlighting a very large file costs more than it gives; fall back to plain
  // text above this size so typing never stalls.
  const tokens = useMemo(
    () =>
      value.length > 120000
        ? [{ type: "plain", text: value }]
        : tokenize(value, language),
    [value, language],
  )
  const position = useMemo(() => positionAt(value, caret.end), [value, caret.end])
  const brackets = useMemo(() => bracketPairAt(value, caret.end), [value, caret.end])
  const matches = useMemo(
    () => (find?.query ? computeMatches(value, find.query, find) : []),
    [find, value],
  )

  const activeMatch = find && matches.length ? find.index % matches.length : -1

  /* ---------------------------------------------------------------- render */

  const bracketOffsets = brackets ? [brackets.open, brackets.close] : []

  const highlighted = useMemo(() => {
    const nodes = []
    let offset = 0
    let key = 0

    tokens.forEach((token) => {
      const start = offset
      const end = offset + token.text.length
      offset = end

      const hits = bracketOffsets.filter((at) => at >= start && at < end)

      if (!hits.length) {
        nodes.push(
          token.type === "plain" ? (
            token.text
          ) : (
            <span key={key++} className={`tok-${token.type}`}>
              {token.text}
            </span>
          ),
        )
        return
      }

      let cursor = start
      hits.forEach((at) => {
        if (at > cursor) {
          nodes.push(
            <span key={key++} className={`tok-${token.type}`}>
              {value.slice(cursor, at)}
            </span>,
          )
        }
        nodes.push(
          <span key={key++} className="bracket-match">
            {value.slice(at, at + 1)}
          </span>,
        )
        cursor = at + 1
      })
      if (cursor < end) {
        nodes.push(
          <span key={key++} className={`tok-${token.type}`}>
            {value.slice(cursor, end)}
          </span>,
        )
      }
    })

    nodes.push("\n")
    return nodes
    // bracketOffsets is derived from `brackets`, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, value, brackets])

  /* ------------------------------------------------------- indent guides */

  const pendingDraw = useRef(0)
  const drawRef = useRef(() => {})

  const drawGuides = useCallback(() => {
    const canvas = guideRef.current
    const textarea = textareaRef.current
    if (!canvas || !textarea) return

    const width = textarea.clientWidth
    const height = textarea.clientHeight
    if (!width || !height) return

    const ratio = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
    }

    const context = canvas.getContext("2d")
    if (!context) return

    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)

    if (!settings.indentGuides && !settings.rulers) return

    const style = window.getComputedStyle(textarea)
    const isDark = document.documentElement.classList.contains("dark")
    context.font = `${settings.fontSize}px ${style.fontFamily}`
    const charWidth = context.measureText("0").width || settings.fontSize * 0.6

    const paddingTop = 12
    const paddingLeft = 16
    const scrollTop = textarea.scrollTop
    const scrollLeft = textarea.scrollLeft
    const lines = value.split("\n")
    const { first, last } = visibleLineRange({
      scrollTop,
      viewportHeight: height,
      lineHeight,
      paddingTop,
      lineCount: lines.length,
    })

    // Guides are anchored to a line's visual row; wrapping breaks that 1:1
    // mapping, so they are skipped rather than drawn in the wrong place.
    if (settings.indentGuides && !settings.wordWrap) {
      context.strokeStyle = isDark ? "rgba(255, 255, 255, 0.075)" : "rgba(15, 23, 42, 0.09)"
      context.lineWidth = 1

      for (let index = first; index <= last; index += 1) {
        const columns = guideColumns(lines[index] ?? "", settings.tabSize)
        if (!columns.length) continue

        const top = Math.round(paddingTop + index * lineHeight - scrollTop) + 0.5
        for (const column of columns) {
          const x = Math.round(paddingLeft + column * charWidth - scrollLeft) + 0.5
          if (x < 0 || x > width) continue
          context.beginPath()
          context.moveTo(x, top)
          context.lineTo(x, top + lineHeight)
          context.stroke()
        }
      }
    }

    if (settings.rulers) {
      const x = Math.round(paddingLeft + 100 * charWidth - scrollLeft) + 0.5
      if (x >= 0 && x <= width) {
        context.strokeStyle = isDark ? "rgba(255, 255, 255, 0.13)" : "rgba(15, 23, 42, 0.13)"
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, height)
        context.stroke()
      }
    }
  }, [lineHeight, settings, value])

  const scheduleDraw = useCallback(() => {
    if (pendingDraw.current) return
    pendingDraw.current = requestAnimationFrame(() => {
      pendingDraw.current = 0
      drawRef.current()
    })
  }, [])

  useEffect(() => {
    drawRef.current = drawGuides
    drawGuides()
  }, [drawGuides])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(() => scheduleDraw())
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [scheduleDraw])

  // Web fonts change the character width, and the theme changes the line
  // colour — both invalidate the canvas.
  useEffect(() => {
    document.fonts?.ready.then(() => scheduleDraw()).catch(() => {})
    const observer = new MutationObserver(() => scheduleDraw())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [scheduleDraw])

  /* ------------------------------------------------------------- scrolling */

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop
      highlightRef.current.scrollLeft = textarea.scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop
    scheduleDraw()
  }, [scheduleDraw])

  /* ----------------------------------------------------------- editing ops */

  const readCaret = () => {
    const textarea = textareaRef.current
    if (!textarea) return { start: 0, end: 0 }
    return { start: textarea.selectionStart, end: textarea.selectionEnd }
  }

  const applyResult = useCallback(
    (result) => {
      if (!result) return

      const nextText = result.text
      const start = result.selectionStart ?? result.selection?.start ?? 0
      const end = result.selectionStart ?? result.selection?.end ?? start
      const textarea = textareaRef.current

      const moveCaret = () => {
        requestAnimationFrame(() => {
          if (!textarea) return
          textarea.focus()
          textarea.setSelectionRange(start, end)
          setCaret({ offset: end, start, end })
          syncScroll()
        })
      }

      // Prefer the browser's own editing pipeline: replacing `value` from React
      // resets the native undo stack, which would make Ctrl+Z useless after
      // formatting or toggling a comment. We compute the minimal changed range
      // and let the browser perform that one edit.
      if (textarea && !readOnly && typeof document.execCommand === "function") {
        let prefix = 0
        while (prefix < value.length && prefix < nextText.length && value[prefix] === nextText[prefix]) {
          prefix += 1
        }

        let suffix = 0
        while (
          suffix < value.length - prefix &&
          suffix < nextText.length - prefix &&
          value[value.length - 1 - suffix] === nextText[nextText.length - 1 - suffix]
        ) {
          suffix += 1
        }

        const from = prefix
        const to = value.length - suffix
        const insert = nextText.slice(prefix, nextText.length - suffix)

        textarea.focus()
        textarea.setSelectionRange(from, to)

        let applied = false
        try {
          applied = document.execCommand("insertText", false, insert)
        } catch {
          // Some browsers throw instead of returning false; fall through to the
          // React update below so the command still works.
        }

        if (applied) {
          moveCaret()
          return
        }
      }

      onChange?.(nextText)
      moveCaret()
    },
    [onChange, readOnly, syncScroll, value],
  )

  const runCommand = useCallback(
    (name) => {
      const { start, end } = readCaret()
      setPalette(false)

      if (name === "comment") {
        applyResult(toggleComment(value, start, end, commentMarkerFor(language)))
      } else if (name === "indent") {
        applyResult(indentLines(value, start, end, settings.tabSize, 1))
      } else if (name === "outdent") {
        applyResult(indentLines(value, start, end, settings.tabSize, -1))
      } else if (name === "moveUp") {
        applyResult(moveLines(value, start, end, -1))
      } else if (name === "moveDown") {
        applyResult(moveLines(value, start, end, 1))
      } else if (name === "deleteLine") {
        applyResult(deleteLines(value, start, end))
      } else if (name === "find") {
        setFind((current) => ({
          matchCase: false,
          regex: false,
          index: 0,
          query: current?.query ?? "",
          ...(current ?? {}),
          showReplace: false,
        }))
      } else if (name === "replace") {
        setFind((current) => ({
          matchCase: false,
          regex: false,
          index: 0,
          query: current?.query ?? "",
          ...(current ?? {}),
          showReplace: true,
        }))
      } else if (name === "selectNext") {
        const word = value.slice(start, end) || (/[\w$]+/.exec(value.slice(start))?.[0] ?? "")
        if (!word) return
        const all = computeMatches(value, word)
        const next = all.find((match) => match.start >= end) ?? all[0]
        if (!next) return
        onChange?.(value)
        requestAnimationFrame(() => {
          const textarea = textareaRef.current
          if (!textarea) return
          textarea.focus()
          textarea.setSelectionRange(all[0].start, next.end)
          setCaret({ offset: next.end, start: all[0].start, end: next.end })
        })
      } else if (name === "wordWrap") {
        onSettingsChange?.({ ...settings, wordWrap: !settings.wordWrap })
      } else if (name === "palette") {
        setPalette(true)
      } else if (name === "save") {
        onSave?.()
      } else if (name === "fontUp") {
        onSettingsChange?.({ ...settings, fontSize: Math.min(24, settings.fontSize + 1) })
      } else if (name === "fontDown") {
        onSettingsChange?.({ ...settings, fontSize: Math.max(10, settings.fontSize - 1) })
      } else if (name === "ligatures") {
        onSettingsChange?.({ ...settings, ligatures: !settings.ligatures })
      } else if (name === "relative") {
        onSettingsChange?.({ ...settings, relativeLineNumbers: !settings.relativeLineNumbers })
      }
    },
    [applyResult, language, onChange, onSave, onSettingsChange, settings, value],
  )

  const handleKeyDown = (event) => {
    if (readOnly) return
    const meta = event.metaKey || event.ctrlKey
    const { start, end } = readCaret()

    // Tab indents instead of leaving the editor.
    if (event.key === "Tab") {
      event.preventDefault()
      applyResult(indentLines(value, start, end, settings.tabSize, event.shiftKey ? -1 : 1))
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      applyResult(autoIndentOnEnter(value, start, settings.tabSize))
      return
    }

    if (event.key === "Escape" && find) {
      event.preventDefault()
      setFind(null)
      return
    }

    if (meta && event.key === "/") {
      event.preventDefault()
      runCommand("comment")
      return
    }
    if (meta && event.shiftKey && event.key.toLowerCase() === "k") {
      event.preventDefault()
      runCommand("deleteLine")
      return
    }
    if (meta && event.key.toLowerCase() === "d") {
      event.preventDefault()
      runCommand("selectNext")
      return
    }
    if (meta && event.key.toLowerCase() === "f") {
      event.preventDefault()
      runCommand("find")
      return
    }
    if (meta && event.key.toLowerCase() === "h") {
      event.preventDefault()
      runCommand("replace")
      return
    }
    if (meta && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault()
      setPalette(true)
      return
    }
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault()
      runCommand(event.key === "ArrowUp" ? "moveUp" : "moveDown")
      return
    }

    // Auto-close brackets and quotes when typing at an empty caret.
    if (PAIRS[event.key] && start === end && !event.ctrlKey && !event.metaKey) {
      const nextCharacter = value[start] ?? ""
      if (!/[\w]/.test(nextCharacter)) {
        event.preventDefault()
        const closing = PAIRS[event.key]
        const nextValue = `${value.slice(0, start)}${event.key}${closing}${value.slice(end)}`
        onChange?.(nextValue)
        requestAnimationFrame(() => {
          const textarea = textareaRef.current
          if (!textarea) return
          textarea.setSelectionRange(start + 1, start + 1)
          setCaret({ offset: start + 1, start: start + 1, end: start + 1 })
        })
      }
    }
  }

  const handleSelect = () => {
    const { start, end } = readCaret()
    setCaret({ offset: end, start, end })
  }

  /* --------------------------------------------------------------- find UI */

  const stepMatch = (direction) => {
    if (!matches.length) return
    const nextIndex = (activeMatch + direction + matches.length) % matches.length
    setFind((current) => ({ ...current, index: nextIndex }))
    const match = matches[nextIndex]
    const textarea = textareaRef.current
    if (!textarea || !match) return
    textarea.focus()
    textarea.setSelectionRange(match.start, match.end)
    setCaret({ offset: match.end, start: match.start, end: match.end })
    const line = positionAt(value, match.start).line
    textarea.scrollTop = Math.max(0, (line - 4) * lineHeight)
    syncScroll()
  }

  const replaceCurrent = () => {
    if (!find?.query || activeMatch < 0) return
    const match = matches[activeMatch]
    if (!match) return
    onChange?.(`${value.slice(0, match.start)}${find.replacement ?? ""}${value.slice(match.end)}`)
  }

  const replaceAll = () => {
    if (!find?.query || !matches.length) return
    let next = ""
    let cursor = 0
    matches.forEach((match) => {
      next += value.slice(cursor, match.start) + (find.replacement ?? "")
      cursor = match.end
    })
    next += value.slice(cursor)
    onChange?.(next)
  }

  /* ------------------------------------------------------------- shortcuts */

  useEffect(() => {
    if (!find) return
    const onEscape = (event) => {
      if (event.key === "Escape") setFind(null)
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [find])

  const gutterWidth = `${Math.max(String(lineCount).length, 2) + 2}ch`

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface dark:bg-ink-950">
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {settings.showLineNumbers && (
          <div
            ref={gutterRef}
            aria-hidden="true"
            className="editor-gutter font-mono"
            style={{ ...fontStyle, width: gutterWidth, paddingTop: 12 }}
          >
            {Array.from({ length: lineCount }, (_, index) => {
              const number = index + 1
              const isActive = number === position.line
              const label = settings.relativeLineNumbers && !isActive
                ? Math.abs(number - position.line)
                : number
              return (
                <div
                  key={number}
                  data-active={isActive}
                  className="editor-gutter-line"
                  style={{ height: lineHeight }}
                >
                  {label || ""}
                </div>
              )
            })}
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <canvas
            ref={guideRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          <pre
            ref={highlightRef}
            aria-hidden="true"
            className="code-layer !overflow-hidden pointer-events-none select-none"
            style={fontStyle}
          >
            {/* Painted first and kept at z-index 0 so the code always renders on
                top of it — otherwise the band covers the line you clicked.
                With wrapping on, one logical line spans several visual rows and
                the pixel maths below stops being exact, so the band is skipped. */}
            {settings.showActiveLine && !settings.wordWrap && (
              <div
                className="editor-active-line"
                style={{ top: 12 + (position.line - 1) * lineHeight, height: lineHeight }}
              />
            )}
            <code>{highlighted}</code>
          </pre>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              onChange?.(event.target.value)
              handleSelect()
            }}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            onKeyUp={handleSelect}
            onScroll={syncScroll}
            onPaste={() => requestAnimationFrame(() => { handleSelect(); syncScroll() })}
            readOnly={readOnly}
            spellCheck={false}
            wrap={settings.wordWrap ? "soft" : "off"}
            aria-label={ariaLabel}
            className="code-layer code-input"
            style={fontStyle}
          />

          {find && (
            <div className="absolute right-3 top-2 z-20 w-[320px] rounded-lg border border-line bg-panel shadow-lg shadow-black/10 dark:border-line-dark dark:bg-ink-850 dark:shadow-black/40">
              <div className="flex items-center gap-1 border-b border-line px-2 py-1.5 dark:border-line-dark">
                <Search size={12} className="shrink-0 text-subtle dark:text-faint" />
                <input
                  autoFocus
                  value={find.query}
                  onChange={(event) => setFind((current) => ({ ...current, query: event.target.value, index: 0 }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      stepMatch(event.shiftKey ? -1 : 1)
                    }
                  }}
                  placeholder="Find"
                  aria-label="Find"
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-graphite outline-none dark:text-mist"
                />
                <span className="shrink-0 text-[10.5px] tabular-nums text-subtle dark:text-faint">
                  {matches.length ? `${activeMatch + 1}/${matches.length}` : "0/0"}
                </span>
                <button
                  type="button"
                  onClick={() => stepMatch(-1)}
                  aria-label="Previous match"
                  className="rounded p-0.5 text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => stepMatch(1)}
                  aria-label="Next match"
                  className="rounded p-0.5 text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setFind(null)}
                  aria-label="Close find"
                  className="rounded p-0.5 text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"
                >
                  <X size={13} />
                </button>
              </div>

              {find.showReplace && (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <Replace size={12} className="shrink-0 text-subtle dark:text-faint" />
                  <input
                    value={find.replacement ?? ""}
                    onChange={(event) => setFind((current) => ({ ...current, replacement: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        replaceCurrent()
                      }
                    }}
                    placeholder="Replace"
                    aria-label="Replace with"
                    className="min-w-0 flex-1 bg-transparent text-[12px] text-graphite outline-none dark:text-mist"
                  />
                  <button
                    type="button"
                    onClick={replaceCurrent}
                    className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-graphite dark:text-mist-muted dark:hover:bg-ink-800"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={replaceAll}
                    className="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-graphite dark:text-mist-muted dark:hover:bg-ink-800"
                  >
                    All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <EditorStatusBar
        language={language}
        fileName={fileName}
        position={position}
        selectionLength={Math.abs(caret.end - caret.start)}
        settings={settings}
        onSettingsChange={onSettingsChange}
        saveStatus={saveStatus}
        eol={eol}
        onOpenCommands={() => setPalette(true)}
      />

      {palette && (
        <CommandPalette
          commands={[
            { id: "save", label: "Save file", run: () => runCommand("save") },
            { id: "find", label: "Find", run: () => runCommand("find") },
            { id: "replace", label: "Replace", run: () => runCommand("replace") },
            { id: "comment", label: "Toggle line comment", run: () => runCommand("comment") },
            { id: "indent", label: "Indent lines", run: () => runCommand("indent") },
            { id: "outdent", label: "Outdent lines", run: () => runCommand("outdent") },
            { id: "moveUp", label: "Move line up", run: () => runCommand("moveUp") },
            { id: "moveDown", label: "Move line down", run: () => runCommand("moveDown") },
            { id: "deleteLine", label: "Delete line", run: () => runCommand("deleteLine") },
            { id: "selectNext", label: "Select next occurrence", run: () => runCommand("selectNext") },
            { id: "wordWrap", label: "Toggle word wrap", run: () => runCommand("wordWrap") },
            { id: "ligatures", label: "Toggle font ligatures", run: () => runCommand("ligatures") },
            { id: "relative", label: "Toggle relative line numbers", run: () => runCommand("relative") },
            { id: "fontUp", label: "Increase font size", run: () => runCommand("fontUp") },
            { id: "fontDown", label: "Decrease font size", run: () => runCommand("fontDown") },
          ]}
          onClose={() => setPalette(false)}
        />
      )}
    </div>
  )
}

export default CodeEditor
