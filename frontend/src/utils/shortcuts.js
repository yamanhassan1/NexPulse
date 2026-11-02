const MODIFIERS = ["Ctrl", "Meta", "Alt", "Shift"]

const KEY_NAMES = {
  " ": "Space",
  esc: "Escape",
  escape: "Escape",
  del: "Delete",
  delete: "Delete",
  backspace: "Backspace",
  enter: "Enter",
  return: "Enter",
  tab: "Tab",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  plus: "Plus",
  "=": "Equal",
  "-": "Minus",
}

export const detectPlatform = () => {
  if (typeof navigator === "undefined") return "linux"
  const source = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || ""
  if (/mac|iphone|ipad|ipod/i.test(source)) return "mac"
  if (/win/i.test(source)) return "windows"
  return "linux"
}

export const normalizeKey = (key = "") => {
  const lower = key.toLowerCase()
  if (KEY_NAMES[lower]) return KEY_NAMES[lower]
  if (key.length === 1) return key.toLowerCase()
  return key
}

const withPlatformModifier = (token, platform) => {
  const lower = token.toLowerCase()
  if (lower === "mod") return platform === "mac" ? "Meta" : "Ctrl"
  if (lower === "ctrl" || lower === "control") return "Ctrl"
  if (lower === "meta" || lower === "cmd" || lower === "command") return "Meta"
  if (lower === "alt" || lower === "option") return "Alt"
  if (lower === "shift") return "Shift"
  return null
}

export const bindingToCombo = (binding, platform = detectPlatform()) => {
  const tokens = String(binding).split("+").filter(Boolean)
  if (!tokens.length) return ""

  const key = normalizeKey(tokens.at(-1))
  const modifiers = new Set()

  for (const token of tokens.slice(0, -1)) {
    const modifier = withPlatformModifier(token, platform)
    if (!modifier) return ""
    modifiers.add(modifier)
  }

  return [...MODIFIERS.filter((modifier) => modifiers.has(modifier)), key].join("+")
}

export const comboFromEvent = (event) => {
  const modifiers = []
  if (event.ctrlKey) modifiers.push("Ctrl")
  if (event.metaKey) modifiers.push("Meta")
  if (event.altKey) modifiers.push("Alt")
  if (event.shiftKey) modifiers.push("Shift")
  modifiers.push(normalizeKey(event.key))
  return modifiers.join("+")
}

export const matchesBinding = (event, binding, platform = detectPlatform()) =>
  comboFromEvent(event) === bindingToCombo(binding, platform)

export const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.tagName === "TEXTAREA") return true
  if (target.tagName !== "INPUT") return false
  const type = (target.getAttribute("type") || "text").toLowerCase()
  return !["button", "checkbox", "color", "file", "hidden", "radio", "range", "reset", "submit"].includes(type)
}

const MAC_MODIFIERS = { Ctrl: "⌃", Meta: "⌘", Alt: "⌥", Shift: "⇧" }
const WINDOWS_MODIFIERS = { Ctrl: "Ctrl", Meta: "Win", Alt: "Alt", Shift: "Shift" }

const DISPLAY_KEYS = {
  Space: "Space",
  Escape: "Esc",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Plus: "+",
  Equal: "+",
  Minus: "-",
}

export const formatBinding = (binding, platform = detectPlatform()) => {
  const isMac = platform === "mac"
  const labels = isMac ? MAC_MODIFIERS : WINDOWS_MODIFIERS

  return String(binding)
    .split(" ")
    .map((part) =>
      part
        .split("+")
        .filter(Boolean)
        .map((token) => {
          const modifier = withPlatformModifier(token, platform)
          if (modifier) return labels[modifier]
          const key = normalizeKey(token)
          const label = DISPLAY_KEYS[key] ?? key
          return key.length === 1 ? label.toUpperCase() : label
        })
        .join(isMac ? "" : "+"),
    )
    .join(isMac ? " " : ", ")
}

/**
 * Only shortcuts listed here are advertised or displayed. Keeping this list in
 * one place makes the command palette, tooltips and key handling agree.
 */
export const SHORTCUTS = [
  { id: "newFile", label: "New file", category: "File", binding: "Mod+N", scope: "global" },
  { id: "quickOpen", label: "Quick Open", category: "File", binding: "Mod+P", scope: "global" },
  { id: "save", label: "Save file", category: "File", binding: "Mod+S", scope: "global" },
  { id: "closeTab", label: "Close tab", category: "File", binding: "Mod+W", scope: "global" },
  { id: "reopenTab", label: "Reopen closed tab", category: "File", binding: "Mod+Shift+T", scope: "global" },
  { id: "closeAllTabs", label: "Close all tabs", category: "File", binding: "Mod+K Mod+W", scope: "global" },
  { id: "find", label: "Find", category: "Search", binding: "Mod+F", scope: "editor" },
  { id: "replace", label: "Find and replace", category: "Search", binding: "Mod+H", scope: "editor" },
  {
    id: "commandPalette",
    label: "Command palette",
    category: "Search",
    binding: "Mod+Shift+P",
    aliases: ["F1"],
    scope: "editor",
  },
  { id: "suggestions", label: "Trigger suggestions", category: "Search", binding: "Mod+Space", scope: "editor" },
  { id: "formatDocument", label: "Format document", category: "Formatting", binding: "Shift+Alt+F", scope: "global" },
  { id: "toggleSidebar", label: "Toggle sidebar", category: "Layout", binding: "Mod+B", scope: "global" },
  { id: "focusExplorer", label: "Focus Explorer", category: "Layout", binding: "Mod+Shift+E", scope: "global" },
  { id: "openPreview", label: "Open preview", category: "Preview", binding: "Mod+Shift+V", scope: "global" },
  { id: "refreshPreview", label: "Refresh preview", category: "Preview", binding: "Mod+Shift+R", scope: "global" },
  {
    id: "fontIncrease",
    label: "Increase editor font",
    category: "Layout",
    binding: "Mod+Plus",
    aliases: ["Mod+Equal", "Mod+Shift+Plus"],
    scope: "global",
  },
  { id: "fontDecrease", label: "Decrease editor font", category: "Layout", binding: "Mod+Minus", scope: "global" },
  { id: "fontReset", label: "Reset editor font", category: "Layout", binding: "Mod+0", scope: "global" },
  { id: "toggleComment", label: "Toggle line comment", category: "Editor", binding: "Mod+/", scope: "editor" },
  {
    id: "blockComment",
    label: "Toggle block comment",
    category: "Editor",
    binding: "Shift+Alt+A",
    scope: "editor",
  },
  { id: "deleteLine", label: "Delete line", category: "Editor", binding: "Mod+Shift+K", scope: "editor" },
  { id: "selectNext", label: "Select next occurrence", category: "Editor", binding: "Mod+D", scope: "editor" },
  {
    id: "selectAllOccurrences",
    label: "Select all occurrences",
    category: "Editor",
    binding: "Mod+Shift+L",
    scope: "editor",
  },
  { id: "moveUp", label: "Move line up", category: "Editor", binding: "Alt+ArrowUp", scope: "editor" },
  { id: "moveDown", label: "Move line down", category: "Editor", binding: "Alt+ArrowDown", scope: "editor" },
  {
    id: "copyUp",
    label: "Copy line up",
    category: "Editor",
    binding: "Shift+Alt+ArrowUp",
    scope: "editor",
  },
  {
    id: "copyDown",
    label: "Copy line down",
    category: "Editor",
    binding: "Shift+Alt+ArrowDown",
    scope: "editor",
  },
  {
    id: "insertBelow",
    label: "Insert line below",
    category: "Editor",
    binding: "Mod+Enter",
    scope: "editor",
  },
  {
    id: "insertAbove",
    label: "Insert line above",
    category: "Editor",
    binding: "Mod+Shift+Enter",
    scope: "editor",
  },
  { id: "indent", label: "Indent line", category: "Editor", binding: "Mod+]", scope: "editor" },
  { id: "outdent", label: "Outdent line", category: "Editor", binding: "Mod+[", scope: "editor" },
]

export const findShortcut = (id) => SHORTCUTS.find((shortcut) => shortcut.id === id) ?? null

export const shortcutLabel = (id, platform = detectPlatform()) => {
  const shortcut = findShortcut(id)
  return shortcut ? formatBinding(shortcut.binding, platform) : ""
}

export const matchesShortcut = (event, id, platform = detectPlatform()) => {
  const shortcut = findShortcut(id)
  if (!shortcut) return false
  return [shortcut.binding, ...(shortcut.aliases ?? [])].some((binding) =>
    matchesBinding(event, binding, platform),
  )
}
