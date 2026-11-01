import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Check,
  Copy,
  Download,
  Monitor,
  Moon,
  Search,
  Star,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { useTheme } from "../hooks/themeContext"
import { normaliseTheme } from "../themes/themes"

const PREVIEW_LINES = [
  [{ text: "// preview", type: "comment" }],
  [
    { text: "export ", type: "keyword" },
    { text: "function ", type: "keyword" },
    { text: "Hello", type: "fn" },
    { text: "() {", type: "punct" },
  ],
  [
    { text: "  const ", type: "keyword" },
    { text: "answer", type: "punct" },
    { text: " = ", type: "operator" },
    { text: "42", type: "number" },
  ],
  [
    { text: "  return ", type: "keyword" },
    { text: "<", type: "tag" },
    { text: "Card", type: "class" },
    { text: ' title="hi"', type: "attr" },
    { text: " />", type: "tag" },
  ],
  [{ text: "}", type: "punct" }],
]

const syntaxColour = (theme, type) => {
  const s = theme.syntax
  switch (type) {
    case "comment":
      return s.comment
    case "keyword":
      return s.keyword
    case "fn":
      return s.fn
    case "string":
      return s.string
    case "number":
      return s.number
    case "tag":
      return s.tag
    case "attr":
      return s.attr
    case "class":
      return s.klass
    case "operator":
      return s.operator
    default:
      return theme.fg
  }
}

function ThemePreview({ theme }) {
  return (
    <div
      className="overflow-hidden rounded-md border border-black/10 px-2 py-1.5 font-mono text-[8.5px] leading-[1.35] dark:border-white/10"
      style={{ background: theme.bg, color: theme.fg }}
      aria-hidden="true"
    >
      {PREVIEW_LINES.map((line, index) => (
        <div key={index} className="whitespace-pre">
          {line.map((part, partIndex) => (
            <span key={partIndex} style={{ color: syntaxColour(theme, part.type) }}>
              {part.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "favorites", label: "Favorites" },
]

function ThemeSwitcher() {
  const {
    themeId,
    theme,
    themes,
    favorites,
    recents,
    switcherOpen,
    followSystem,
    setTheme,
    closeSwitcher,
    toggleFavorite,
    setFollowSystem,
    duplicateTheme,
    deleteCustomTheme,
    importTheme,
    saveCustomTheme,
    resetPreferences,
  } = useTheme()

  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [editing, setEditing] = useState(null)
  const [importError, setImportError] = useState("")

  const close = useCallback(() => {
    setEditing(null)
    setImportError("")
    setQuery("")
    setFilter("all")
    closeSwitcher()
  }, [closeSwitcher])

  useEffect(() => {
    if (!switcherOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [close, switcherOpen])

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase()
    return themes.filter((item) => {
      if (filter === "dark" && item.type !== "dark") return false
      if (filter === "light" && item.type !== "light") return false
      if (filter === "favorites" && !favorites.includes(item.id)) return false
      if (!search) return true
      return `${item.name} ${item.description}`.toLowerCase().includes(search)
    })
  }, [favorites, filter, query, themes])

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setImportError("")
    const result = importTheme(await file.text())
    if (!result.ok) setImportError(result.errors.join(", "))
  }

  const handleExport = () => {
    const payload = JSON.stringify(theme, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${theme.id}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  return (
    <AnimatePresence>
      {switcherOpen && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[8vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={close}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] dark:bg-black/60"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Theme gallery"
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.16 }}
            className="relative flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)] dark:border-line-dark dark:bg-ink-850"
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 dark:border-line-dark">
              <Search size={14} className="shrink-0 text-subtle dark:text-faint" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search themes…"
                aria-label="Search themes"
                className="h-8 min-w-0 flex-1 bg-transparent text-[13px] text-graphite placeholder-subtle outline-none dark:text-mist dark:placeholder-faint"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Close theme gallery"
                className="rounded p-1 text-subtle transition-colors hover:text-graphite dark:text-faint dark:hover:text-mist"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2 dark:border-line-dark">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors ${filter === item.id ? "bg-brand-500/15 font-medium text-brand-700 dark:text-brand-300" : "text-muted hover:bg-hover dark:text-mist-muted dark:hover:bg-ink-800"}`}
                >
                  {item.label}
                </button>
              ))}

              <span className="mx-1 h-4 w-px bg-line dark:bg-line-dark" />

              <button
                type="button"
                onClick={() => setFollowSystem(!followSystem)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] transition-colors ${followSystem ? "bg-brand-500/15 font-medium text-brand-700 dark:text-brand-300" : "text-muted hover:bg-hover dark:text-mist-muted dark:hover:bg-ink-800"}`}
              >
                <Monitor size={12} />
                Follow system
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((item) => {
                  const selected = item.id === themeId
                  return (
                    <div
                      key={item.id}
                      className={`group relative rounded-lg border p-2 transition-colors ${selected ? "border-brand-500/60 ring-1 ring-brand-500/30" : "border-line hover:border-line-strong dark:border-line-dark dark:hover:border-ink-700"}`}
                    >
                      <button
                        type="button"
                        onClick={() => setTheme(item.id)}
                        className="block w-full text-left"
                        aria-pressed={selected}
                      >
                        <ThemePreview theme={item} />

                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="truncate text-[12px] font-medium text-graphite dark:text-mist">
                            {item.name}
                          </span>
                          {item.type === "dark" ? (
                            <Moon size={10} className="shrink-0 text-subtle dark:text-faint" />
                          ) : (
                            <Sun size={10} className="shrink-0 text-subtle dark:text-faint" />
                          )}
                          {selected && <Check size={12} className="ml-auto shrink-0 text-brand-600 dark:text-brand-400" />}
                        </div>

                        <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-subtle dark:text-faint">
                          {item.description || (item.custom ? "Custom theme" : "")}
                        </p>
                      </button>

                      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(item.id)}
                          aria-label={favorites.includes(item.id) ? "Remove from favorites" : "Add to favorites"}
                          className={`rounded bg-panel/90 p-1 ${favorites.includes(item.id) ? "text-amber-500" : "text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"}`}
                        >
                          <Star size={11} fill={favorites.includes(item.id) ? "currentColor" : "none"} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const created = duplicateTheme(item.id)
                            if (created) setEditing(normaliseTheme(created))
                          }}
                          aria-label={`Duplicate ${item.name}`}
                          className="rounded bg-panel/90 p-1 text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"
                        >
                          <Copy size={11} />
                        </button>

                        {item.custom && (
                          <button
                            type="button"
                            onClick={() => deleteCustomTheme(item.id)}
                            aria-label={`Delete ${item.name}`}
                            className="rounded bg-panel/90 p-1 text-subtle hover:text-red-500 dark:text-faint"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                      {item.custom && (
                        <button
                          type="button"
                          onClick={() => setEditing(normaliseTheme(item))}
                          className="mt-1 text-[10.5px] text-brand-700 hover:underline dark:text-brand-300"
                        >
                          Edit colours
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {visible.length === 0 && (
                <p className="px-2 py-8 text-center text-[12px] text-subtle dark:text-faint">
                  No themes match that filter.
                </p>
              )}

              {editing && (
                <div className="mt-3 rounded-lg border border-line p-3 dark:border-line-dark">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[12px] font-medium text-graphite dark:text-mist">
                      Edit custom theme
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-[11px] text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"
                    >
                      Cancel
                    </button>
                  </div>

                  <input
                    value={editing.name}
                    onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                    aria-label="Theme name"
                    className="mb-2 w-full rounded border border-line bg-panel px-2 py-1 text-[12px] text-graphite outline-none dark:border-line-dark dark:bg-ink-800 dark:text-mist"
                  />

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      ["bg", "Background"],
                      ["panel", "Panels"],
                      ["fg", "Text"],
                      ["accent", "Accent"],
                      ["selection", "Selection"],
                      ["activeLine", "Active line"],
                    ].map(([field, label]) => (
                      <label
                        key={field}
                        className="flex items-center justify-between gap-2 rounded border border-line px-2 py-1 text-[11px] text-muted dark:border-line-dark dark:text-mist-muted"
                      >
                        {label}
                        <input
                          type="color"
                          value={editing[field] || "#000000"}
                          onChange={(event) =>
                            setEditing({ ...editing, [field]: event.target.value })
                          }
                          aria-label={`${label} colour`}
                          className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const result = saveCustomTheme({ ...editing, custom: true })
                        if (result.ok) {
                          setTheme(result.theme.id)
                          setEditing(null)
                        }
                      }}
                      className="rounded-md bg-brand-600 px-3 py-1 text-[11.5px] font-medium text-on-brand hover:bg-brand-700"
                    >
                      Save theme
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-[11px] text-subtle dark:border-line-dark dark:text-faint">
              <span>
                {themes.length} themes · {recents.length ? `recent: ${recents[0]}` : "no recents"}
                {importError && <span className="ml-2 text-red-500">{importError}</span>}
              </span>

              <span className="flex items-center gap-1">
                <label className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 hover:bg-hover dark:hover:bg-ink-800">
                  <Upload size={11} />
                  Import
                  <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-hover dark:hover:bg-ink-800"
                >
                  <Download size={11} />
                  Export
                </button>
                <button
                  type="button"
                  onClick={resetPreferences}
                  className="rounded px-1.5 py-1 hover:bg-hover dark:hover:bg-ink-800"
                >
                  Reset
                </button>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ThemeSwitcher
