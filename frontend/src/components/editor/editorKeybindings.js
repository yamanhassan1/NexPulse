import * as monaco from "monaco-editor"
import { FIND_COMMAND, FIND_REPLACE_COMMAND, runEditorCommand } from "./editorConfig"

export const EDITOR_KEYBINDINGS = [
  {
    id: "nexpulse.comment",
    label: "Toggle Line Comment",
    commandId: "comment",
    precondition: "editorFocus",
    keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
  },
  {
    id: "nexpulse.blockComment",
    label: "Toggle Block Comment",
    commandId: "blockComment",
    precondition: "editorFocus",
    keybinding: monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyA,
  },
  {
    id: "nexpulse.insertBelow",
    label: "Insert Line Below",
    commandId: "insertBelow",
    precondition: "editorFocus",
    keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
  },
  {
    id: "nexpulse.insertAbove",
    label: "Insert Line Above",
    commandId: "insertAbove",
    precondition: "editorFocus",
    keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
  },
]

export const EDITOR_KEYBINDING_RULES = [
  { command: FIND_COMMAND, keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, when: "editorFocus" },
  { command: FIND_REPLACE_COMMAND, keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, when: "editorFocus" },
]

export const registerEditorKeybindings = (monacoInstance) => {
  const disposables = []

  for (const action of EDITOR_KEYBINDINGS) {
    const disposable = monacoInstance.editor.addEditorAction({
      id: action.id,
      label: action.label,
      precondition: action.precondition,
      keybindings: [action.keybinding],
      run: (editorInstance) => runEditorCommand(action.commandId, null, editorInstance),
    })
    disposables.push(disposable)
  }

  for (const rule of EDITOR_KEYBINDING_RULES) {
    const disposable = monacoInstance.editor.addKeybindingRule({
      keybinding: rule.keybinding,
      command: rule.command,
      when: rule.when,
    })
    disposables.push(disposable)
  }

  return {
    dispose: () => {
      for (const disposable of disposables) {
        disposable?.dispose?.()
      }
    },
  }
}
