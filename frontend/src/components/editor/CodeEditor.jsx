import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Replace, Search, X } from "lucide-react"
import EditorStatusBar from "./EditorStatusBar"
import EditorCompletions from "./EditorCompletions"
import CommandPalette from "./CommandPalette"
import { tokenize } from "../../utils/highlight"
import {
  findProjectPath,
  resolveProjectPath,
  suggestCompletions,
  wordPrefixAt,
} from "../../utils/completions"
import {
  autoIndentOnEnter,
  blockCommentPairFor,
  bracketPairAt,
  commentMarkerFor,
  computeMatches,
  deleteLines,
  duplicateLines,
  indentLines,
  insertLine,
  moveLines,
  positionAt,
  toggleBlockComment,
  toggleComment,
} from "../../utils/editorCommands"
import { lineHeightPx } from "../../utils/editorSettings"
import { guideColumns, visibleLineRange } from "../../utils/indentGuides"
import { matchesShortcut, shortcutLabel } from "../../utils/shortcuts"

const PAIRS = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" }

// Padding shared by both text layers and the guide canvas. Keep these in one
// place; any divergence shifts glyphs in one layer relative to the other.
const PAD_TOP = 12
const PAD_X = 16
const PAD_BOTTOM = 12

// Above this many lines, per-line wrap measurement costs more than the drift
// it removes. On huge files the gutter falls back to uniform row heights;
// word wrap can be toggled off to fully avoid the drift.
const MEASURE_LINE_LIMIT = 5000

function CodeEditor({
  value: sourceValue = "",
  onChange,
  language = "plain",
  fileName = "",
  settings,
  onSettingsChange,
  saveStatus = "saved",
  onSave,
  onNewFromTemplate,
  onOpenPath,
  projectEntries = [],
  filePath = "",
  eol = "LF",
  readOnly = false,
  ariaLabel = "Code",
}) {
  const textareaRef = useRef(null)
  const highlightRef = useRef(null)
  const gutterRef = useRef(null)
  const guideRef = useRef(null)
  const paneRef = useRef(null)
  const acceptedRef = useRef(false)

  const [caret, setCaret] = useState({ offset: 0, start: 0, end: 0 })
  const [find, setFind] = useState(null) // { query, replace, matchCase, regex, index }
  const [palette, setPalette] = useState(false)
  const [completionState, setCompletion] = useState(null)
  const [completionPos, setCompletionPos] = useState({ top: 0, left: 0 })
  // Suggestions belong to the buffer they were opened for; deriving this means
  // switching files closes the popup without an effect that cascades renders.
  const completion = completionState?.fileName === fileName ? completionState : null

  // Problem 2: one row height per logical line. `null` means "uniform, one row
  // per logical line" (used when word wrap is off or the file is too large).
  const [lineHeights, setLineHeights] = useState(null)
  // Problem 3: extra pixels of bottom padding the <pre> and gutter must add so
  // their scrollable range matches the textarea's (which includes a caret
  // buffer at EOF that a <pre> doesn't get for free).
  const [extraPad, setExtraPad] = useState(0)

  // A textarea normalises CRLF to LF internally. Keep every offset in this
  // component on that same LF text, then restore the file's line endings on
  // the way out, or commands move the caret through the wrong character
  // offsets.
  const value = useMemo(() => sourceValue.replace(/\r\n?/g, "\n"), [sourceValue])
  const emitChange = useCallback(
    (next) => {
      onChange?.(eol === "CRLF" ? next.replace(/\n/g, "\r\n") : next)
    },
    [eol, onChange],
  )

  const lineHeight = lineHeightPx(settings)

  /* ------------------------------------------------------- layer styles */

  const textLayerStyle = {
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    lineHeight: `${lineHeight}px`,
    letterSpacing: "normal",
    wordSpacing: "normal",
    tabSize: settings.tabSize,
    fontVariantLigatures: settings.ligatures ? "contextual" : "none",
    whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
    overflowWrap: "break-word",
    textIndent: 0,
    paddingTop: PAD_TOP,
    paddingRight: PAD_X,
    paddingLeft: PAD_X,
    margin: 0,
    border: 0,
    boxSizing: "border-box",
    outline: 0,
  }

  const textareaStyle = {
    ...textLayerStyle,
    paddingBottom: PAD_BOTTOM, // reference layer: its scrollHeight defines the target
    color: "transparent",
    WebkitTextFillColor: "transparent",
    caretColor: "var(--editor-caret-color, #528bff)",
    background: "transparent",
    resize: "none",
    overflow: "auto",
  }

  const highlightStyle = {
    ...textLayerStyle,
    // Managed by alignLayers (Problem 3), not React.
    paddingBottom: PAD_BOTTOM + extraPad,
    overflow: "hidden",
  }

  const gutterStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: `${lineHeight}px`,
    paddingTop: PAD_TOP,
    paddingBottom: PAD_BOTTOM + extraPad,
  }

  /* ------------------------------------------------------------- derived */

  const lineCount = useMemo(() => value.split("\n").length, [value])
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

    // No synthetic trailing "\n": `white-space: pre` already preserves the
    // one in `value`, and appending another makes the <pre> taller than the
    // textarea.
    return nodes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, value, brackets])

  /* ------------------------------------------------------- Problem 2: wraps */

  // Measure how many visual rows each logical line occupies in the rendered
  // <pre>. With word wrap on, one logical line can span several rows, and the
  // gutter must scroll to the same total height as the textarea or it drifts.
  const measureLineHeights = useCallback(() => {
    if (!settings.wordWrap) {
      setLineHeights(null)
      return
    }
    const code = highlightRef.current?.querySelector("code")
    if (!code) return

    const lines = value.split("\n")
    if (lines.length > MEASURE_LINE_LIMIT) {
      setLineHeights(null)
      return
    }

    // Flat list of every text node in the highlighted <code> with its start
    // offset within the full buffer. Concatenated text must equal `value`;
    // bail if it doesn't (defensive — it should always match).
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT)
    const nodes = []
    let total = 0
    let node = walker.nextNode()
    while (node) {
      const len = node.nodeValue.length
      if (len > 0) {
        nodes.push({ node, start: total, length: len })
        total += len
      }
      node = walker.nextNode()
    }
    if (total !== value.length) {
      setLineHeights(null)
      return
    }

    const range = document.createRange()
    const heights = new Array(lines.length)
    let sourcePos = 0
    let startIdx = 0 // shared scan cursor — lines are visited in order

    for (let i = 0; i < lines.length; i += 1) {
      const lineLen = lines[i].length
      if (lineLen === 0) {
        heights[i] = lineHeight
        sourcePos += 1 // the "\n" itself
        continue
      }

      const lineStart = sourcePos
      const lineEnd = sourcePos + lineLen

      while (
        startIdx < nodes.length &&
        nodes[startIdx].start + nodes[startIdx].length <= lineStart
      ) {
        startIdx += 1
      }
      let endIdx = startIdx
      while (endIdx + 1 < nodes.length && nodes[endIdx + 1].start < lineEnd) {
        endIdx += 1
      }

      if (startIdx >= nodes.length) {
        heights[i] = lineHeight
        sourcePos += lineLen + 1
        continue
      }

      const startInfo = nodes[startIdx]
      const endInfo = nodes[endIdx]
      const startLocal = Math.max(0, Math.min(startInfo.length, lineStart - startInfo.start))
      const endLocal = Math.max(0, Math.min(endInfo.length, lineEnd - endInfo.start))

      try {
        range.setStart(startInfo.node, startLocal)
        range.setEnd(endInfo.node, endLocal)
        const rects = range.getClientRects()
        heights[i] = Math.max(1, rects.length) * lineHeight
      } catch {
        heights[i] = lineHeight
      }

      sourcePos += lineLen + 1
    }

    // Only commit if something actually changed — avoids re-rendering the
    // gutter on every keystroke whose wrap points happen to be identical.
    setLineHeights((prev) => {
      if (
        prev &&
        prev.length === heights.length &&
        prev.every((h, idx) => h === heights[idx])
      ) {
        return prev
      }
      return heights
    })
  }, [value, settings.wordWrap, lineHeight])

  /* ------------------------------------------------------ Problem 3: scroll */

  /* ----------------------------------------------------------- scroll sync */

  const copyScrollInternal = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop
      highlightRef.current.scrollLeft = textarea.scrollLeft
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = textarea.scrollTop
    }
  }, [])

  const copyScroll = copyScrollInternal

  // Equalise scrollable height so textarea, <pre>, and gutter all clamp at the
  // same scrollTop. A textarea reserves a few pixels below its last line so
  // the caret is visible at EOF; without padding to match, the <pre> (and
  // gutter) clamp first and the code drifts a few pixels at the bottom of the
  // file. The delta is additive: on the next call the extra padding cancels
  // out and the residual becomes zero.
  const alignLayers = useCallback(() => {
    const textarea = textareaRef.current
    const highlight = highlightRef.current
    if (!textarea || !highlight) return

    // Scrollbar-width compensation (word-wrap column parity).
    const scrollbar = Math.max(0, textarea.offsetWidth - textarea.clientWidth)
    const right = scrollbar ? `${scrollbar}px` : "0px"
    if (highlight.style.right !== right) highlight.style.right = right

    const taRange = Math.max(0, textarea.scrollHeight - textarea.clientHeight)
    const preRange = Math.max(0, highlight.scrollHeight - highlight.clientHeight)
    const delta = taRange - preRange

    if (Math.abs(delta) > 1) {
      setExtraPad((prev) => Math.max(0, prev + delta))
    }

    copyScrollInternal()
  }, [copyScrollInternal])

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

    const scrollTop = textarea.scrollTop
    const scrollLeft = textarea.scrollLeft
    const lines = value.split("\n")
    const { first, last } = visibleLineRange({
      scrollTop,
      viewportHeight: height,
      lineHeight,
      paddingTop: PAD_TOP,
      lineCount: lines.length,
    })

    // Wrap breaks the 1:1 line↔row mapping, so guides are skipped when wrap
    // is on rather than drawn in the wrong column.
    if (settings.indentGuides && !settings.wordWrap) {
      context.strokeStyle = isDark ? "rgba(255, 255, 255, 0.075)" : "rgba(15, 23, 42, 0.09)"
      context.lineWidth = 1

      for (let index = first; index <= last; index += 1) {
        const columns = guideColumns(lines[index] ?? "", settings.tabSize)
        if (!columns.length) continue

        const top = Math.round(PAD_TOP + index * lineHeight - scrollTop) + 0.5
        for (const column of columns) {
          const x = Math.round(PAD_X + column * charWidth - scrollLeft) + 0.5
          if (x < 0 || x > width) continue
          context.beginPath()
          context.moveTo(x, top)
          context.lineTo(x, top + lineHeight)
          context.stroke()
        }
      }
    }

    if (settings.rulers) {
      const x = Math.round(PAD_X + 100 * charWidth - scrollLeft) + 0.5
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

  const syncScroll = useCallback(() => {
    copyScroll()
    setCompletion(null)
    scheduleDraw()
  }, [copyScroll, scheduleDraw])

  /* --------------------------------------------------------------- effects */

  useEffect(() => {
    drawRef.current = drawGuides
    drawGuides()
  }, [drawGuides])

  // Resize: realign padding (Problem 3) and re-measure wrap points (Problem 2).
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(() => {
      alignLayers()
      scheduleDraw()
      if (settings.wordWrap) measureLineHeights()
    })
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [alignLayers, scheduleDraw, measureLineHeights, settings.wordWrap])

  // Font metrics change char width; theme change swaps colours. Both
  // invalidate the canvas and (font) the wrap measurement.
  useEffect(() => {
    document.fonts?.ready
      .then(() => {
        alignLayers()
        measureLineHeights()
        scheduleDraw()
      })
      .catch(() => {})
    const observer = new MutationObserver(() => scheduleDraw())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [alignLayers, measureLineHeights, scheduleDraw])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const handleScroll = () => syncScroll()
    textarea.addEventListener("scroll", handleScroll)
    return () => textarea.removeEventListener("scroll", handleScroll)
  }, [syncScroll])

  // First pass runs synchronously (before paint) so padding is correct on the
  // very first frame. The rAF pass handles the browser's own auto-scroll-to-
  // caret between layout and paint — that auto-scroll changes
  // `textarea.scrollTop`, so we re-align after it and re-measure wrap points.
  useLayoutEffect(() => {
    alignLayers()
    scheduleDraw()

    const id = requestAnimationFrame(() => {
      alignLayers()
      measureLineHeights()
      scheduleDraw()
    })
    return () => cancelAnimationFrame(id)
  }, [
    alignLayers,
    measureLineHeights,
    scheduleDraw,
    value,
    lineHeight,
    settings.fontSize,
    settings.fontFamily,
    settings.ligatures,
    settings.tabSize,
    settings.wordWrap,
    extraPad,
  ])

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
          // Some browsers throw instead of returning false.
        }
        if (applied) {
          moveCaret()
          return
        }
      }

      emitChange(nextText)
      moveCaret()
    },
    [emitChange, readOnly, syncScroll, value],
  )

  const moveCaretTo = useCallback(
    (start, end = start) => {
      requestAnimationFrame(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.focus()
        textarea.setSelectionRange(start, end)
        setCaret({ offset: end, start, end })
        syncScroll()
      })
    },
    [syncScroll],
  )

  /* ---------------------------------------------------------- suggestions */

  const requestSuggestions = useCallback(
    (text, offset, force = false) => {
      if (!settings.suggestions) {
        setCompletion(null)
        return
      }
      if (acceptedRef.current) {
        acceptedRef.current = false
        setCompletion(null)
        return
      }

      const prefix = wordPrefixAt(text, offset)
      const items = suggestCompletions({ text, offset, language, filePath, projectEntries })

      const pathStart = Number.isInteger(items[0]?.replaceStart)
        ? items[0].replaceStart
        : null
      if (!force && !prefix.word && !prefix.object && pathStart === null) {
        setCompletion(null)
        return
      }
      if (!items.length) {
        setCompletion(null)
        return
      }

      setCompletion({
        items,
        index: 0,
        start: pathStart ?? prefix.start,
        end: offset,
        fileName,
      })
    },
    [fileName, filePath, language, projectEntries, settings.suggestions],
  )

  const acceptSuggestion = useCallback(
    (index) => {
      const active = completion?.items?.[index]
      if (!active) return

      const { start, end } = completion
      const lineStart = value.lastIndexOf("\n", Math.max(start - 1, 0)) + 1
      const indentation = (value.slice(lineStart).match(/^[ \t]*/)?.[0] ?? "")
      const marker = active.insert.indexOf("$0")
      const plain =
        marker === -1
          ? active.insert
          : active.insert.slice(0, marker) + active.insert.slice(marker + 2)
      const indented = plain
        .split("\n")
        .map((line, lineIndex) => (lineIndex === 0 ? line : indentation + line))
        .join("\n")

      let caretOffset = start + indented.length
      if (marker !== -1) {
        const beforeMarker = active.insert.slice(0, marker)
        const indentedBefore = beforeMarker
          .split("\n")
          .map((line, lineIndex) => (lineIndex === 0 ? line : indentation + line))
          .join("\n")
        caretOffset = start + indentedBefore.length
      }

      acceptedRef.current = true
      setCompletion(null)
      applyResult({
        text: value.slice(0, start) + indented + value.slice(end),
        selection: { start: caretOffset, end: caretOffset },
      })
      acceptedRef.current = false
    },
    [applyResult, completion, value],
  )

  const caretPoint = useCallback(
    (offset) => {
      const code = highlightRef.current?.querySelector("code")
      if (!code) return null

      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT)
      let remaining = offset
      let node = walker.nextNode()

      const rectOf = (target, from, to) => {
        const range = document.createRange()
        range.setStart(target, from)
        range.setEnd(target, to)
        return range.getBoundingClientRect()
      }

      while (node) {
        const length = node.nodeValue.length
        if (remaining <= length) {
          const collapsed = rectOf(node, remaining, remaining)
          if (collapsed.width || collapsed.height) {
            return { x: collapsed.left, y: collapsed.top, height: collapsed.height || lineHeight }
          }
          if (remaining > 0) {
            const previous = rectOf(node, remaining - 1, remaining)
            if (previous.width || previous.height) {
              return { x: previous.right, y: previous.top, height: previous.height || lineHeight }
            }
          }
          if (remaining < length) {
            const next = rectOf(node, remaining, remaining + 1)
            if (next.width || next.height) {
              return { x: next.left, y: next.top, height: next.height || lineHeight }
            }
          }
        }
        remaining -= length
        node = walker.nextNode()
      }
      return null
    },
    [lineHeight],
  )

  useLayoutEffect(() => {
    if (!completion) return
    const pane = paneRef.current
    const point = caretPoint(completion.end)
    if (!pane || !point) return

    const paneRect = pane.getBoundingClientRect()
    const width = 310
    const height = 268
    let left = point.x - paneRect.left
    let top = point.y - paneRect.top + point.height + 2

    if (left + width > pane.clientWidth - 8) {
      left = Math.max(8, pane.clientWidth - width - 8)
    }
    if (top + height > pane.clientHeight - 8) {
      top = Math.max(8, point.y - paneRect.top - height - 2)
    }
    setCompletionPos({ top, left })
  }, [caretPoint, completion, value])

  const runCommand = useCallback(
    (name) => {
      const { start, end } = readCaret()
      setPalette(false)

      if (name === "comment") {
        applyResult(toggleComment(value, start, end, commentMarkerFor(language)))
      } else if (name === "blockComment") {
        const pair = blockCommentPairFor(language)
        if (pair) applyResult(toggleBlockComment(value, start, end, pair))
      } else if (name === "indent") {
        applyResult(indentLines(value, start, end, settings.tabSize, 1))
      } else if (name === "outdent") {
        applyResult(indentLines(value, start, end, settings.tabSize, -1))
      } else if (name === "moveUp") {
        applyResult(moveLines(value, start, end, -1))
      } else if (name === "moveDown") {
        applyResult(moveLines(value, start, end, 1))
      } else if (name === "copyUp") {
        applyResult(duplicateLines(value, start, end, -1))
      } else if (name === "copyDown") {
        applyResult(duplicateLines(value, start, end, 1))
      } else if (name === "insertAbove") {
        applyResult(insertLine(value, start, end, -1))
      } else if (name === "insertBelow") {
        applyResult(insertLine(value, start, end, 1))
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
        emitChange(value)
        requestAnimationFrame(() => {
          const textarea = textareaRef.current
          if (!textarea) return
          textarea.focus()
          textarea.setSelectionRange(all[0].start, next.end)
          setCaret({ offset: next.end, start: all[0].start, end: next.end })
        })
      } else if (name === "selectAllOccurrences") {
        const word = value.slice(start, end) || (/[\w$]+/.exec(value.slice(start))?.[0] ?? "")
        if (!word) return
        const all = computeMatches(value, word)
        if (!all.length) return
        const first = all[0]
        const last = all[all.length - 1]
        requestAnimationFrame(() => {
          const textarea = textareaRef.current
          if (!textarea) return
          textarea.focus()
          textarea.setSelectionRange(first.start, last.end)
          setCaret({ offset: last.end, start: first.start, end: last.end })
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
    [applyResult, emitChange, language, onSave, onSettingsChange, settings, value],
  )

  const handleKeyDown = (event) => {
    if (readOnly) return
    const meta = event.metaKey || event.ctrlKey
    const { start, end } = readCaret()
    const completionOpen = Boolean(completion?.items?.length)

    if (completionOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setCompletion((current) => ({
          ...current,
          index: (current.index + 1) % current.items.length,
        }))
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setCompletion((current) => ({
          ...current,
          index: (current.index - 1 + current.items.length) % current.items.length,
        }))
        return
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        acceptSuggestion(completion.index)
        return
      }
      if (event.key === "Escape") {
        event.preventDefault()
        setCompletion(null)
        return
      }
    }

    if (meta && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "a") {
      setCompletion(null)
      return
    }

    if (matchesShortcut(event, "suggestions")) {
      event.preventDefault()
      requestSuggestions(value, end, true)
      return
    }

    if (
      start === end &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey &&
      ")]}'`\"".includes(event.key)
    ) {
      if (value[start] === event.key) {
        event.preventDefault()
        moveCaretTo(start + 1)
        return
      }
    }

    if (
      event.key === "Backspace" &&
      start === end &&
      start > 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const opener = value[start - 1]
      if (PAIRS[opener] && PAIRS[opener] === value[start]) {
        event.preventDefault()
        const nextValue = value.slice(0, start - 1) + value.slice(start + 1)
        acceptedRef.current = true
        applyResult({
          text: nextValue,
          selection: { start: start - 1, end: start - 1 },
        })
        acceptedRef.current = false
        return
      }
    }

    if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      applyResult(indentLines(value, start, end, settings.tabSize, event.shiftKey ? -1 : 1))
      return
    }

    if (matchesShortcut(event, "insertAbove")) {
      event.preventDefault()
      runCommand("insertAbove")
      return
    }
    if (matchesShortcut(event, "insertBelow")) {
      event.preventDefault()
      runCommand("insertBelow")
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      applyResult(autoIndentOnEnter(value, start, settings.tabSize, end))
      return
    }
    if (event.key === "Escape" && find) {
      event.preventDefault()
      setFind(null)
      return
    }
    if (matchesShortcut(event, "toggleComment")) {
      event.preventDefault()
      runCommand("comment")
      return
    }
    if (matchesShortcut(event, "blockComment")) {
      event.preventDefault()
      runCommand("blockComment")
      return
    }
    if (matchesShortcut(event, "deleteLine")) {
      event.preventDefault()
      runCommand("deleteLine")
      return
    }
    if (matchesShortcut(event, "selectNext")) {
      event.preventDefault()
      runCommand("selectNext")
      return
    }
    if (matchesShortcut(event, "selectAllOccurrences")) {
      event.preventDefault()
      runCommand("selectAllOccurrences")
      return
    }
    if (matchesShortcut(event, "find")) {
      event.preventDefault()
      runCommand("find")
      return
    }
    if (matchesShortcut(event, "replace")) {
      event.preventDefault()
      runCommand("replace")
      return
    }
    if (matchesShortcut(event, "commandPalette")) {
      event.preventDefault()
      setPalette(true)
      return
    }
    if (matchesShortcut(event, "copyUp")) {
      event.preventDefault()
      runCommand("copyUp")
      return
    }
    if (matchesShortcut(event, "copyDown")) {
      event.preventDefault()
      runCommand("copyDown")
      return
    }
    if (matchesShortcut(event, "moveUp")) {
      event.preventDefault()
      runCommand("moveUp")
      return
    }
    if (matchesShortcut(event, "moveDown")) {
      event.preventDefault()
      runCommand("moveDown")
      return
    }
    if (matchesShortcut(event, "indent")) {
      event.preventDefault()
      runCommand("indent")
      return
    }
    if (matchesShortcut(event, "outdent")) {
      event.preventDefault()
      runCommand("outdent")
      return
    }

    if (PAIRS[event.key] && start === end && !event.ctrlKey && !event.metaKey) {
      const nextCharacter = value[start] ?? ""
      if (!/[\w]/.test(nextCharacter)) {
        event.preventDefault()
        const closing = PAIRS[event.key]
        const nextValue = `${value.slice(0, start)}${event.key}${closing}${value.slice(end)}`
        emitChange(nextValue)
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
    if (start !== end) setCompletion(null)
  }

  const handleEditorClick = (event) => {
    handleSelect()
    setCompletion(null)

    if ((!event.ctrlKey && !event.metaKey) || !onOpenPath) return
    const textarea = textareaRef.current
    if (!textarea) return

    const target = resolveProjectPath({
      text: textarea.value,
      offset: textarea.selectionStart,
      filePath,
    })
    if (!target) return

    event.preventDefault()
    onOpenPath(findProjectPath(target, projectEntries) ?? target)
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
    emitChange(`${value.slice(0, match.start)}${find.replacement ?? ""}${value.slice(match.end)}`)
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
    emitChange(next)
  }

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
            style={{ ...gutterStyle, width: gutterWidth }}
          >
            {Array.from({ length: lineCount }, (_, index) => {
              const number = index + 1
              const isActive = number === position.line
              const label =
                settings.relativeLineNumbers && !isActive
                  ? Math.abs(number - position.line)
                  : number
              // Problem 2: the gutter row must have the same height as the
              // wrapped text it labels. `lineHeights` is null when wrap is off
              // (uniform rows), or when the file is too large to measure.
              const rowHeight = lineHeights?.[index] ?? lineHeight
              return (
                <div
                  key={number}
                  data-active={isActive}
                  className="editor-gutter-line"
                  style={{ height: rowHeight, lineHeight: `${lineHeight}px` }}
                >
                  {label || ""}
                </div>
              )
            })}
          </div>
        )}

        <div ref={paneRef} className="relative min-h-0 flex-1 overflow-hidden">
          <canvas
            ref={guideRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />

          <pre
            ref={highlightRef}
            aria-hidden="true"
            className="code-layer overflow-hidden! pointer-events-none select-none"
            style={highlightStyle}
          >
            {settings.showActiveLine && !settings.wordWrap && (
              <div
                className="editor-active-line"
                style={{ top: PAD_TOP + (position.line - 1) * lineHeight, height: lineHeight }}
              />
            )}
            <code>{highlighted}</code>
          </pre>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              const next = event.target.value
              const offset = event.target.selectionStart ?? next.length
              emitChange(next)
              setCaret({ offset, start: offset, end: offset })
              requestSuggestions(next, offset)
            }}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleEditorClick}
            onKeyUp={handleSelect}
            onBlur={() => setCompletion(null)}
            onScroll={syncScroll}
            onPaste={() =>
              requestAnimationFrame(() => {
                handleSelect()
                syncScroll()
                const textarea = textareaRef.current
                if (textarea) requestSuggestions(textarea.value, textarea.selectionStart)
              })
            }
            readOnly={readOnly}
            spellCheck={false}
            wrap={settings.wordWrap ? "soft" : "off"}
            aria-label={ariaLabel}
            className="code-layer code-input"
            style={textareaStyle}
          />

          {completion && (
            <EditorCompletions
              items={completion.items}
              index={completion.index}
              position={completionPos}
              onHover={(index) => setCompletion((current) => ({ ...current, index }))}
              onAccept={acceptSuggestion}
            />
          )}

          {find && (
            <div className="absolute right-3 top-2 z-20 w-[320px] rounded-lg border border-line bg-panel shadow-lg shadow-black/10 dark:border-line-dark dark:bg-ink-850 dark:shadow-black/40">
              <div className="flex items-center gap-1 border-b border-line px-2 py-1.5 dark:border-line-dark">
                <Search size={12} className="shrink-0 text-subtle dark:text-faint" />
                <input
                  autoFocus
                  value={find.query}
                  onChange={(event) =>
                    setFind((current) => ({ ...current, query: event.target.value, index: 0 }))
                  }
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
                    onChange={(event) =>
                      setFind((current) => ({ ...current, replacement: event.target.value }))
                    }
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
            { id: "save", label: "Save file", hint: shortcutLabel("save"), run: () => runCommand("save") },
            ...(onNewFromTemplate
              ? [{ id: "newTemplate", label: "New file from template…", run: () => onNewFromTemplate() }]
              : []),
            { id: "find", label: "Find", hint: shortcutLabel("find"), run: () => runCommand("find") },
            { id: "replace", label: "Replace", hint: shortcutLabel("replace"), run: () => runCommand("replace") },
            { id: "comment", label: "Toggle line comment", hint: shortcutLabel("toggleComment"), run: () => runCommand("comment") },
            { id: "blockComment", label: "Toggle block comment", hint: shortcutLabel("blockComment"), run: () => runCommand("blockComment") },
            { id: "indent", label: "Indent lines", hint: shortcutLabel("indent"), run: () => runCommand("indent") },
            { id: "outdent", label: "Outdent lines", hint: shortcutLabel("outdent"), run: () => runCommand("outdent") },
            { id: "moveUp", label: "Move line up", hint: shortcutLabel("moveUp"), run: () => runCommand("moveUp") },
            { id: "moveDown", label: "Move line down", hint: shortcutLabel("moveDown"), run: () => runCommand("moveDown") },
            { id: "copyUp", label: "Copy line up", hint: shortcutLabel("copyUp"), run: () => runCommand("copyUp") },
            { id: "copyDown", label: "Copy line down", hint: shortcutLabel("copyDown"), run: () => runCommand("copyDown") },
            { id: "insertBelow", label: "Insert line below", hint: shortcutLabel("insertBelow"), run: () => runCommand("insertBelow") },
            { id: "insertAbove", label: "Insert line above", hint: shortcutLabel("insertAbove"), run: () => runCommand("insertAbove") },
            { id: "deleteLine", label: "Delete line", hint: shortcutLabel("deleteLine"), run: () => runCommand("deleteLine") },
            { id: "selectNext", label: "Select next occurrence", hint: shortcutLabel("selectNext"), run: () => runCommand("selectNext") },
            { id: "selectAllOccurrences", label: "Select all occurrences", hint: shortcutLabel("selectAllOccurrences"), run: () => runCommand("selectAllOccurrences") },
            { id: "suggestions", label: "Toggle code suggestions", hint: shortcutLabel("suggestions"), run: () => onSettingsChange?.({ ...settings, suggestions: !settings.suggestions }) },
            { id: "wordWrap", label: "Toggle word wrap", run: () => runCommand("wordWrap") },
            { id: "ligatures", label: "Toggle font ligatures", run: () => runCommand("ligatures") },
            { id: "relative", label: "Toggle relative line numbers", run: () => runCommand("relative") },
            { id: "fontUp", label: "Increase font size", hint: shortcutLabel("fontIncrease"), run: () => runCommand("fontUp") },
            { id: "fontDown", label: "Decrease font size", hint: shortcutLabel("fontDecrease"), run: () => runCommand("fontDown") },
          ]}
          onClose={() => setPalette(false)}
        />
      )}
    </div>
  )
}

export default CodeEditor