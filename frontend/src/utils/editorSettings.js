// Editor preferences, persisted per browser.

const STORAGE_KEY = "nexpulse:editor-settings"

export const DEFAULT_SETTINGS = {
  fontSize: 13,
  lineHeight: 1.6,
  tabSize: 2,
  wordWrap: false,
  ligatures: false,
  relativeLineNumbers: false,
  showLineNumbers: true,
  showActiveLine: true,
  indentGuides: true,
  rulers: false,
  formatOnSave: true,
  suggestions: true,
}

const clamp = (value, min, max, fallback) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

export const normaliseSettings = (value = {}) => ({
  fontSize: clamp(value.fontSize, 10, 24, DEFAULT_SETTINGS.fontSize),
  lineHeight: clamp(value.lineHeight, 1.2, 2.2, DEFAULT_SETTINGS.lineHeight),
  tabSize: clamp(value.tabSize, 2, 8, DEFAULT_SETTINGS.tabSize),
  wordWrap: Boolean(value.wordWrap),
  ligatures: Boolean(value.ligatures),
  relativeLineNumbers: Boolean(value.relativeLineNumbers),
  showLineNumbers: value.showLineNumbers !== false,
  showActiveLine: value.showActiveLine !== false,
  indentGuides: value.indentGuides !== false,
  rulers: Boolean(value.rulers),
  formatOnSave: value.formatOnSave !== false,
  suggestions: value.suggestions !== false,
})

export const loadSettings = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return normaliseSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const saveSettings = (settings) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normaliseSettings(settings)))
  } catch {
    /* preferences are a convenience; the editor still works without storage */
  }
}

/** Line height in whole pixels so the gutter and caret layers stay aligned. */
export const lineHeightPx = (settings) =>
  Math.round(settings.fontSize * settings.lineHeight)
