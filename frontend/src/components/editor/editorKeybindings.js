import { FIND_COMMAND, FIND_REPLACE_COMMAND, runEditorCommand } from "./editorConfig"

export const registerEditorKeybindings = (monacoInstance) => {
  const { KeyMod, KeyCode } = monacoInstance
  const disposables = []

  const actions = [
    {
      id: "nexpulse.comment",
      label: "Toggle Line Comment",
      commandId: "comment",
      precondition: "editorFocus",
      keybinding: KeyMod.CtrlCmd | KeyCode.Slash,
    },
    {
      id: "nexpulse.blockComment",
      label: "Toggle Block Comment",
      commandId: "blockComment",
      precondition: "editorFocus",
      keybinding: KeyMod.Shift | KeyMod.Alt | KeyCode.KeyA,
    },
    {
      id: "nexpulse.insertBelow",
      label: "Insert Line Below",
      commandId: "insertBelow",
      precondition: "editorFocus",
      keybinding: KeyMod.CtrlCmd | KeyCode.Enter,
    },
    {
      id: "nexpulse.insertAbove",
      label: "Insert Line Above",
      commandId: "insertAbove",
      precondition: "editorFocus",
      keybinding: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter,
    },
  ]

  const rules = [
    { command: FIND_COMMAND, keybinding: KeyMod.CtrlCmd | KeyCode.KeyF, when: "editorFocus" },
    { command: FIND_REPLACE_COMMAND, keybinding: KeyMod.CtrlCmd | KeyCode.KeyH, when: "editorFocus" },
  ]

  for (const action of actions) {
    const disposable = monacoInstance.editor.addEditorAction({
      id: action.id,
      label: action.label,
      precondition: action.precondition,
      keybindings: [action.keybinding],
      run: (editorInstance) => runEditorCommand(action.commandId, null, editorInstance),
    })
    disposables.push(disposable)
  }

  for (const rule of rules) {
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
