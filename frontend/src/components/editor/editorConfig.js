// Central editor constants and the command registry that Monaco actions,
// the command palette and toolbar buttons all flow through.

export const EDITOR_SOURCE_ID = "nexpulse"

export const FIND_COMMAND = "actions.find"
export const FIND_REPLACE_COMMAND = "editor.action.startFindReplaceAction"
export const UNDO_COMMAND = "undo"
export const REDO_COMMAND = "redo"
export const TOGGLE_MINIMAP_COMMAND = "nexpulse.toggleMinimap"

export const INSERT_LINE_AFTER = "editor.action.insertLineAfter"
export const INSERT_LINE_BEFORE = "editor.action.insertLineBefore"
export const INDENT_LINES_COMMAND = "editor.action.indentLines"
export const OUTDENT_LINES_COMMAND = "editor.action.outdentLines"
export const DELETE_LINES_COMMAND = "editor.action.deleteLines"
export const MOVE_LINES_UP_COMMAND = "editor.action.moveLinesUpAction"
export const MOVE_LINES_DOWN_COMMAND = "editor.action.moveLinesDownAction"
export const COPY_LINES_UP_COMMAND = "editor.action.copyLinesUpAction"
export const COPY_LINES_DOWN_COMMAND = "editor.action.copyLinesDownAction"
export const SELECT_NEXT_COMMAND = "editor.action.selectNextOccurrence"
export const SELECT_ALL_COMMAND = "editor.action.selectAllOccurrences"
export const TRIGGER_SUGGEST_COMMAND = "editor.action.triggerSuggest"

let commandHandler = null
let activeEditorGetter = null

export const setEditorCommandHandler = (handler) => {
  commandHandler = handler
}

export const getEditorCommandHandler = () => commandHandler

export const setActiveEditorGetter = (getter) => {
  activeEditorGetter = getter
}

export const runEditorCommand = (commandId, arg, editor) => {
  const resolvedEditor = editor ?? (typeof activeEditorGetter === "function" ? activeEditorGetter() : null)
  const handler = commandHandler
  if (!handler) return
  handler(resolvedEditor, commandId, arg)
}

export const fileUri = (projectId = "", filePath = "") => {
  const clean = String(filePath || "").replace(/^\/+/, "")
  const segments = [projectId, clean].filter(Boolean).map((segment) => segment.replace(/\\/g, "/"))
  return `file:///${segments.join("/")}`
}
