import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as monaco from "monaco-editor"
import MonacoEditor from "./MonacoEditor"
import EditorStatusBar from "./EditorStatusBar"
import CommandPalette from "./CommandPalette"
import { runEditorCommand, setEditorCommandHandler } from "./editorConfig"

import {
  blockCommentPairFor,
  commentMarkerFor,
  computeMatches,
  toggleBlockComment,
  toggleComment,
} from "../../utils/editorCommands"

import { shortcutLabel } from "../../utils/shortcuts"

function CodeEditor({
  value = "",
  onChange,
  language = "plain",
  fileName = "",
  settings,
  onSettingsChange,
  saveStatus = "saved",
  onSave,
  onNewFromTemplate,
  projectEntries = [],
  filePath = "",
  eol = "LF",
  readOnly = false,
  projectId = "",
  ariaLabel = "Code",
}) {
  const [position, setPosition] = useState({ line: 1, column: 1 })
  const [selectionLength, setSelectionLength] = useState(0)
  const [palette, setPalette] = useState(false)

  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const normalizedValue = useMemo(() => String(value ?? "").replace(/\r\n?/g, "\n"), [value])

  const emitChange = useCallback(
    (next) => {
      onChange?.(eol === "CRLF" ? next.replace(/\n/g, "\r\n") : next)
    },
    [eol, onChange],
  )

  const handleEditorCommand = useCallback(
    (editor, commandId) => {
      switch (commandId) {
        case "save":
          onSave?.()
          return
        case "fontUp":
          onSettingsChange?.({ ...settings, fontSize: Math.min(24, (settings?.fontSize ?? 13) + 1) })
          return
        case "fontDown":
          onSettingsChange?.({ ...settings, fontSize: Math.max(10, (settings?.fontSize ?? 13) - 1) })
          return
        case "wordWrap":
          onSettingsChange?.({ ...settings, wordWrap: !settings?.wordWrap })
          return
        case "ligatures":
          onSettingsChange?.({ ...settings, ligatures: !settings?.ligatures })
          return
        case "relative":
          onSettingsChange?.({ ...settings, relativeLineNumbers: !settings?.relativeLineNumbers })
          return
        case "minimap":
          onSettingsChange?.({ ...settings, showMinimap: !settings?.showMinimap })
          return
        case "suggestions":
          onSettingsChange?.({ ...settings, suggestions: !settings?.suggestions })
          return
        case "find":
          editor?.focus?.()
          editor?.trigger?.("nexpulse", "actions.find", null)
          return
        case "replace":
          editor?.focus?.()
          editor?.trigger?.("nexpulse", "editor.action.startFindReplaceAction", null)
          return
        case "insertBelow":
          editor?.trigger?.("nexpulse", "editor.action.insertLineAfter", null)
          return
        case "insertAbove":
          editor?.trigger?.("nexpulse", "editor.action.insertLineBefore", null)
          return
        case "indent":
          editor?.trigger?.("nexpulse", "editor.action.indentLines", null)
          return
        case "outdent":
          editor?.trigger?.("nexpulse", "editor.action.outdentLines", null)
          return
        case "deleteLine":
          editor?.trigger?.("nexpulse", "editor.action.deleteLines", null)
          return
        case "moveUp":
          editor?.trigger?.("nexpulse", "editor.action.moveLinesUpAction", null)
          return
        case "moveDown":
          editor?.trigger?.("nexpulse", "editor.action.moveLinesDownAction", null)
          return
        case "copyUp":
          editor?.trigger?.("nexpulse", "editor.action.copyLinesUpAction", null)
          return
        case "copyDown":
          editor?.trigger?.("nexpulse", "editor.action.copyLinesDownAction", null)
          return
        case "undo":
          editor?.trigger?.("nexpulse", "undo", null)
          return
        case "redo":
          editor?.trigger?.("nexpulse", "redo", null)
          return
        case "comment": {
          const model = editor?.getModel?.()
          const selection = editor?.getSelection?.()
          if (!model || !selection) return
          const startOffset = model.getOffsetAt(selection.getStartPosition())
          const endOffset = model.getOffsetAt(selection.getEndPosition())
          const result = toggleComment(model.getValue(), startOffset, endOffset, commentMarkerFor(language))
          const start = result.selectionStart ?? result.selection?.start ?? 0
          const end = result.selection?.end ?? start
          const startPosition = model.getPositionAt(start)
          const endPosition = model.getPositionAt(end)
          editor.executeEdits("nexpulse", [
            { range: model.getFullModelRange(), text: result.text, forceMoveMarkers: true },
          ])
          editor.setSelection(new monaco.Selection(startPosition, endPosition))
          return
        }
        case "blockComment": {
          const model = editor?.getModel?.()
          const selection = editor?.getSelection?.()
          if (!model || !selection) return
          const startOffset = model.getOffsetAt(selection.getStartPosition())
          const endOffset = model.getOffsetAt(selection.getEndPosition())
          const result = toggleBlockComment(model.getValue(), startOffset, endOffset, blockCommentPairFor(language))
          const start = result.selectionStart ?? result.selection?.start ?? 0
          const end = result.selection?.end ?? start
          const startPosition = model.getPositionAt(start)
          const endPosition = model.getPositionAt(end)
          editor.executeEdits("nexpulse", [
            { range: model.getFullModelRange(), text: result.text, forceMoveMarkers: true },
          ])
          editor.setSelection(new monaco.Selection(startPosition, endPosition))
          return
        }
        case "selectNext": {
          const model = editor?.getModel?.()
          const selection = editor?.getSelection?.()
          if (!model || !selection) return
          const text = model.getValue()
          const startOffset = model.getOffsetAt(selection.getStartPosition())
          const endOffset = model.getOffsetAt(selection.getEndPosition())
          const word = selection.isEmpty
            ? text.slice(startOffset).match(/[\w$]+/)?.[0] ?? ""
            : text.slice(startOffset, endOffset)
          const matches = computeMatches(text, word)
          const current = matches.find((match) => match.start <= endOffset && match.end >= startOffset)
          const next = current
            ? matches.find((match) => match.start > current.end)
            : matches.find((match) => match.start > endOffset)
          const target = next ?? current
          if (!target) return
          editor.setSelection(new monaco.Selection(model.getPositionAt(startOffset), model.getPositionAt(target.end)))
          return
        }
        case "selectAllOccurrences": {
          const model = editor?.getModel?.()
          const selection = editor?.getSelection?.()
          if (!model || !selection) return
          const text = model.getValue()
          const startOffset = model.getOffsetAt(selection.getStartPosition())
          const endOffset = model.getOffsetAt(selection.getEndPosition())
          const wordMatch = selection.isEmpty ? text.slice(startOffset).match(/[\w$]+/) : null
          const word = selection.isEmpty ? wordMatch?.[0] ?? "" : text.slice(startOffset, endOffset)
          const matches = computeMatches(text, word)
          if (!matches.length) return
          const first = matches[0]
          const last = matches[matches.length - 1]
          editor.setSelection(new monaco.Selection(model.getPositionAt(first.start), model.getPositionAt(last.end)))
          return
        }
      }
    },
    [onSave, onSettingsChange, settings, language],
  )

  useEffect(() => {
    setEditorCommandHandler(handleEditorCommand)
  }, [handleEditorCommand])

  const openCommand = useCallback(
    (commandId, arg) => {
      runEditorCommand(commandId, arg)
    },
    [],
  )

  const commands = useMemo(
    () => [
      { id: "save", label: "Save file", hint: shortcutLabel("save"), run: () => openCommand("save") },
      ...(onNewFromTemplate
        ? [{ id: "newTemplate", label: "New file from template", run: () => onNewFromTemplate() }]
        : []),
      { id: "find", label: "Find", hint: shortcutLabel("find"), run: () => openCommand("find") },
      { id: "replace", label: "Find and replace", hint: shortcutLabel("replace"), run: () => openCommand("replace") },
      { id: "undo", label: "Undo", hint: shortcutLabel("undo"), run: () => openCommand("undo") },
      { id: "redo", label: "Redo", hint: shortcutLabel("redo"), run: () => openCommand("redo") },
      { id: "minimap", label: "Toggle minimap", run: () => openCommand("minimap") },
      { id: "comment", label: "Toggle line comment", hint: shortcutLabel("toggleComment"), run: () => openCommand("comment") },
      { id: "blockComment", label: "Toggle block comment", hint: shortcutLabel("blockComment"), run: () => openCommand("blockComment") },
      { id: "indent", label: "Indent lines", hint: shortcutLabel("indent"), run: () => openCommand("indent") },
      { id: "outdent", label: "Outdent lines", hint: shortcutLabel("outdent"), run: () => openCommand("outdent") },
      { id: "moveUp", label: "Move line up", hint: shortcutLabel("moveUp"), run: () => openCommand("moveUp") },
      { id: "moveDown", label: "Move line down", hint: shortcutLabel("moveDown"), run: () => openCommand("moveDown") },
      { id: "copyUp", label: "Copy line up", hint: shortcutLabel("copyUp"), run: () => openCommand("copyUp") },
      { id: "copyDown", label: "Copy line down", hint: shortcutLabel("copyDown"), run: () => openCommand("copyDown") },
      { id: "insertBelow", label: "Insert line below", hint: shortcutLabel("insertBelow"), run: () => openCommand("insertBelow") },
      { id: "insertAbove", label: "Insert line above", hint: shortcutLabel("insertAbove"), run: () => openCommand("insertAbove") },
      { id: "deleteLine", label: "Delete line", hint: shortcutLabel("deleteLine"), run: () => openCommand("deleteLine") },
      { id: "selectNext", label: "Select next occurrence", hint: shortcutLabel("selectNext"), run: () => openCommand("selectNext") },
      { id: "selectAllOccurrences", label: "Select all occurrences", hint: shortcutLabel("selectAllOccurrences"), run: () => openCommand("selectAllOccurrences") },
      { id: "suggestions", label: "Toggle code suggestions", hint: shortcutLabel("suggestions"), run: () => openCommand("suggestions") },
      { id: "wordWrap", label: "Toggle word wrap", run: () => openCommand("wordWrap") },
      { id: "ligatures", label: "Toggle font ligatures", run: () => openCommand("ligatures") },
      { id: "relative", label: "Toggle relative line numbers", run: () => openCommand("relative") },
      { id: "fontUp", label: "Increase font size", hint: shortcutLabel("fontIncrease"), run: () => openCommand("fontUp") },
      { id: "fontDown", label: "Decrease font size", hint: shortcutLabel("fontDecrease"), run: () => openCommand("fontDown") },
    ],
    [onNewFromTemplate, openCommand],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface dark:bg-ink-950">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <MonacoEditor
          value={normalizedValue}
          language={language}
          filePath={filePath}
          projectId={projectId}
          settings={settings}
          readOnly={readOnly}
          ariaLabel={ariaLabel}
          onChange={emitChange}
          onCursorChange={setPosition}
          onSelectionChange={setSelectionLength}
          onEditorCommand={handleEditorCommand}
          projectEntries={projectEntries}
        />
      </div>

      <EditorStatusBar
        language={language}
        fileName={fileName}
        position={position}
        selectionLength={selectionLength}
        settings={settings}
        onSettingsChange={onSettingsChange}
        saveStatus={saveStatus}
        eol={eol}
        onOpenCommands={() => setPalette(true)}
      />

      {palette && <CommandPalette commands={commands} onClose={() => setPalette(false)} />}
    </div>
  )
}

export default CodeEditor
