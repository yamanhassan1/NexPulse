import { useEffect, useRef, useState } from "react"
import { ChevronUp, Settings2 } from "lucide-react"

const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  css: "CSS",
  markup: "HTML",
  markdown: "Markdown",
  python: "Python",
  shell: "Shell",
  yaml: "YAML",
  sql: "SQL",
  generic: "Plain code",
  plain: "Plain text",
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1 text-[11.5px] text-graphite hover:bg-hover dark:text-mist dark:hover:bg-ink-800">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3 w-3 accent-brand-600"
      />
    </label>
  )
}

function EditorStatusBar({
  language = "plain",
  position = { line: 1, column: 1 },
  selectionLength = 0,
  settings,
  onSettingsChange,
  saveStatus = "saved",
  eol = "LF",
  onOpenCommands,
}) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (!panelRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const update = (patch) => onSettingsChange?.({ ...settings, ...patch })

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "dirty"
        ? "Unsaved"
        : saveStatus === "error"
          ? "Save failed"
          : "Saved"

  return (
    <div className="relative flex h-6 shrink-0 items-center justify-between gap-3 border-t border-line bg-panel/60 px-2 text-[11px] text-muted backdrop-blur-xl dark:border-line-dark dark:bg-ink-900/60 dark:text-mist-muted">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate font-medium text-graphite dark:text-mist">
          {LANGUAGE_LABELS[language] ?? language}
        </span>
        <span className="tabular-nums">
          Ln {position.line}, Col {position.column}
        </span>
        {selectionLength > 0 && (
          <span className="tabular-nums text-subtle dark:text-faint">
            {selectionLength} selected
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-1 rounded px-1 transition-colors hover:bg-hover hover:text-graphite dark:hover:bg-ink-800 dark:hover:text-mist"
          title="Editor settings"
          aria-expanded={open}
        >
          <Settings2 size={11} />
          Spaces: {settings?.tabSize ?? 2}
          <ChevronUp size={10} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>

        <span>UTF-8</span>
        <span title="Detected from the file">{eol}</span>
        <span className={saveStatus === "error" ? "text-red-600 dark:text-red-400" : undefined}>
          {saveLabel}
        </span>

        {onOpenCommands && (
          <button
            type="button"
            onClick={onOpenCommands}
            title="Command palette (Ctrl+Shift+P)"
            className="rounded px-1 transition-colors hover:bg-hover hover:text-graphite dark:hover:bg-ink-800 dark:hover:text-mist"
          >
            F1
          </button>
        )}
      </div>

      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-7 right-2 z-30 w-56 rounded-lg border border-line bg-panel p-1.5 shadow-xl shadow-black/10 dark:border-line-dark dark:bg-ink-850 dark:shadow-black/50"
        >
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-subtle dark:text-faint">
            Editor
          </p>

          <div className="flex items-center justify-between rounded px-2 py-1 text-[11.5px] text-graphite dark:text-mist">
            <span>Font size</span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => update({ fontSize: Math.max(10, settings.fontSize - 1) })}
                className="rounded px-1.5 hover:bg-hover dark:hover:bg-ink-800"
                aria-label="Decrease font size"
              >
                −
              </button>
              <span className="w-5 text-center tabular-nums">{settings.fontSize}</span>
              <button
                type="button"
                onClick={() => update({ fontSize: Math.min(24, settings.fontSize + 1) })}
                className="rounded px-1.5 hover:bg-hover dark:hover:bg-ink-800"
                aria-label="Increase font size"
              >
                +
              </button>
            </span>
          </div>

          <div className="flex items-center justify-between rounded px-2 py-1 text-[11.5px] text-graphite dark:text-mist">
            <span>Tab size</span>
            <select
              value={settings.tabSize}
              onChange={(event) => update({ tabSize: Number(event.target.value) })}
              aria-label="Tab size"
              className="rounded border border-line bg-panel px-1 py-0.5 text-[11px] dark:border-line-dark dark:bg-ink-800"
            >
              {[2, 4, 8].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <Toggle label="Word wrap" checked={settings.wordWrap} onChange={(checked) => update({ wordWrap: checked })} />
          <Toggle label="Ligatures" checked={settings.ligatures} onChange={(checked) => update({ ligatures: checked })} />
          <Toggle
            label="Relative line numbers"
            checked={settings.relativeLineNumbers}
            onChange={(checked) => update({ relativeLineNumbers: checked })}
          />
          <Toggle
            label="Highlight active line"
            checked={settings.showActiveLine}
            onChange={(checked) => update({ showActiveLine: checked })}
          />
          <Toggle
            label="Indent guides"
            checked={settings.indentGuides}
            onChange={(checked) => update({ indentGuides: checked })}
          />
          <Toggle
            label="Column ruler (100)"
            checked={settings.rulers}
            onChange={(checked) => update({ rulers: checked })}
          />
          <Toggle
            label="Format on save"
            checked={settings.formatOnSave}
            onChange={(checked) => update({ formatOnSave: checked })}
          />
        </div>
      )}
    </div>
  )
}

export default EditorStatusBar
