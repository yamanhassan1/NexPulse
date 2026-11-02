import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import {
  Braces,
  Code2,
  Component,
  Hash,
  LayoutTemplate,
  Loader2,
  Package,
  Search,
  X,
} from "lucide-react"
import { createFile, createFolder } from "../features/file"
import { useToast } from "../hooks/toastContext"
import { languageOf } from "../utils/highlight"
import { flattenTree } from "../utils/fileTree"
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  buildTemplateFiles,
  findTemplate,
  normaliseTemplateName,
} from "../utils/boilerplates"

const CATEGORY_ICONS = {
  React: Component,
  "Node & Express": Package,
  Web: Code2,
  Python: Braces,
  "Data & config": Hash,
  Starters: LayoutTemplate,
}

function CategoryIcon({ category, size = 14, className = "" }) {
  const Icon = CATEGORY_ICONS[category] ?? LayoutTemplate
  return <Icon size={size} className={className} />
}

const filterTemplates = (query, category) => {
  const needle = query.trim().toLowerCase()
  return TEMPLATES.filter((template) => {
    if (category !== "All" && template.category !== category) return false
    if (!needle) return true
    return `${template.label} ${template.description} ${template.category}`
      .toLowerCase()
      .includes(needle)
  })
}

function NewFromTemplate({ projectId, tree = [], rootId, defaultParentId, onClose, onCreated }) {
  const { pushToast } = useToast()
  const searchRef = useRef(null)
  const nameRef = useRef(null)

  const firstTemplate = TEMPLATES[0]
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [selectedId, setSelectedId] = useState(firstTemplate?.id ?? "")
  const [name, setName] = useState(firstTemplate?.suggestedName ?? "")
  const [parentId, setParentId] = useState(defaultParentId || rootId || "")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const selected = findTemplate(selectedId) ?? firstTemplate

  const folderRows = useMemo(
    () => flattenTree(tree).filter((row) => row.node.type === "folder"),
    [tree],
  )

  const parentRow = useMemo(
    () => folderRows.find((row) => row.node._id === parentId) ?? null,
    [folderRows, parentId],
  )

  const templates = useMemo(() => filterTemplates(query, category), [category, query])

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !creating) onClose?.()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [creating, onClose])

  const select = (template) => {
    setSelectedId(template.id)
    setName(template.suggestedName)
    setError("")
  }

  const choose = (template) => {
    select(template)
    requestAnimationFrame(() => nameRef.current?.select())
  }

  // Filter changes pick the first visible template without an effect: doing it
  // in the event handler keeps the dialog to a single render per interaction.
  const applyFilters = (nextQuery, nextCategory) => {
    setQuery(nextQuery)
    setCategory(nextCategory)
    const visible = filterTemplates(nextQuery, nextCategory)
    if (visible.length && !visible.some((template) => template.id === selectedId)) {
      select(visible[0])
    }
  }

  const previewFiles = useMemo(() => {
    if (!selected) return []
    const previewName = normaliseTemplateName(selected, name) || selected.suggestedName
    return buildTemplateFiles(selected, previewName)
  }, [name, selected])

  const handleCreate = async (event) => {
    event.preventDefault()
    if (creating || !selected) return

    const finalName = normaliseTemplateName(selected, name)
    if (!finalName) {
      setError("Enter a name for what you are creating.")
      return
    }

    const targetRoot = parentId || rootId
    if (!targetRoot) {
      setError("This project has no folder to create files in.")
      return
    }

    setCreating(true)
    setError("")

    const folderIndex = new Map()
    folderRows.forEach((row) => {
      const immediateParent = row.node.parentId ?? row.parentIds.at(-1) ?? null
      folderIndex.set(`${immediateParent}:${row.node.name}`, row.node._id)
    })

    const ensureFolder = async (currentParent, segment) => {
      const key = `${currentParent}:${segment}`
      if (folderIndex.has(key)) return folderIndex.get(key)
      const folder = await createFolder({ projectId, name: segment, parentId: currentParent })
      folderIndex.set(key, folder._id)
      return folder._id
    }

    const files = buildTemplateFiles(selected, finalName)
    const entries = []
    const basePath = parentRow?.relPath ?? ""

    try {
      for (const file of files) {
        const segments = file.path.split("/").filter(Boolean)
        const fileName = segments.pop()
        let target = targetRoot

        for (const segment of segments) {
          target = await ensureFolder(target, segment)
        }

        const created = await createFile({
          projectId,
          name: fileName,
          parentId: target,
          content: file.content,
          language: languageOf(fileName),
        })

        entries.push({
          node: created,
          relPath: [basePath, ...segments, fileName].filter(Boolean).join("/"),
        })
      }

      pushToast(
        `Created ${entries.length} file${entries.length === 1 ? "" : "s"} from ${selected.label}.`,
        { variant: "success" },
      )
      onCreated?.(entries)
      onClose?.()
    } catch (err) {
      console.error(`[template] ${err.message}`)
      if (entries.length) {
        pushToast(
          `Created ${entries.length} file${entries.length === 1 ? "" : "s"} before an error.`,
          { variant: "info" },
        )
        onCreated?.(entries)
        onClose?.()
      } else {
        setError(err.response?.data?.message || "Could not create the template.")
      }
    } finally {
      setCreating(false)
    }
  }

  const isStarter = selected?.mode === "starter"
  const shownFiles = previewFiles.slice(0, 4)
  const extraFiles = Math.max(0, previewFiles.length - shownFiles.length)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-dialog-title"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => !creating && onClose?.()}
        className="absolute inset-0 bg-black/25 backdrop-blur-sm dark:bg-black/60"
      />

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex h-[86dvh] max-h-[640px] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_40px_90px_-30px_rgba(0,0,0,0.35)] dark:border-line-dark dark:bg-ink-850 dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 dark:border-line-dark">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <LayoutTemplate size={16} />
            </span>
            <div>
              <h2
                id="template-dialog-title"
                className="text-[13px] font-semibold text-graphite dark:text-mist"
              >
                New from template
              </h2>
              <p className="mt-0.5 text-[11px] text-subtle dark:text-faint">
                Start with a working file or a complete starter project.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            aria-label="Close"
            className="rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite disabled:opacity-40 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="flex max-h-[46%] min-h-0 w-full shrink-0 flex-col border-b border-line sm:max-h-none sm:w-[46%] sm:border-b-0 sm:border-r dark:border-line-dark">
            <div className="flex items-center gap-2 border-b border-line px-3 dark:border-line-dark">
              <Search size={13} className="shrink-0 text-subtle dark:text-faint" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => applyFilters(event.target.value, category)}
                placeholder="Search templates…"
                aria-label="Search templates"
                className="h-9 min-w-0 flex-1 bg-transparent text-[12.5px] text-graphite placeholder-subtle outline-none dark:text-mist dark:placeholder-faint"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto px-2 py-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
              {TEMPLATE_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => applyFilters(query, item)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-colors ${
                    category === item
                      ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
                      : "text-subtle hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {templates.length === 0 ? (
                <li className="px-3 py-8 text-center text-[12px] text-subtle dark:text-faint">
                  No templates match “{query}”.
                </li>
              ) : (
                templates.map((template) => {
                  const active = template.id === selected?.id
                  const Icon = CATEGORY_ICONS[template.category] ?? LayoutTemplate
                  return (
                    <li key={template.id}>
                      <button
                        type="button"
                        onClick={() => choose(template)}
                        className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                          active
                            ? "bg-brand-500/10 text-graphite dark:bg-ink-800 dark:text-mist"
                            : "text-muted hover:bg-hover dark:text-mist-muted dark:hover:bg-ink-800/60"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                            active
                              ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                              : "bg-hover text-subtle dark:bg-ink-800 dark:text-faint"
                          }`}
                        >
                          <Icon size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[12.5px] font-medium">{template.label}</span>
                            {template.mode === "starter" && (
                              <span className="shrink-0 rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                Starter
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[10.5px] leading-relaxed text-subtle dark:text-faint">
                            {template.description}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>

          {selected && (
            <form onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              <div className="flex items-center gap-2">
                <CategoryIcon category={selected.category} size={14} className="text-brand-500 dark:text-brand-400" />
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-subtle dark:text-faint">
                  {selected.category}
                </p>
              </div>
              <h3 className="mt-1 text-[14px] font-semibold text-graphite dark:text-mist">{selected.label}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted dark:text-mist-muted">
                {selected.description}
              </p>

              <div className="mt-3 rounded-lg border border-line bg-hover/60 p-2 dark:border-line-dark dark:bg-ink-900/60">
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-subtle dark:text-faint">
                  {isStarter ? "Files it creates" : "Preview"}
                </p>
                <ul className="space-y-1">
                  {shownFiles.map((file) => (
                    <li key={file.path} className="truncate font-mono text-[10.5px] text-muted dark:text-mist-muted">
                      {file.path}
                    </li>
                  ))}
                </ul>
                {extraFiles > 0 && (
                  <p className="mt-1 text-[10px] text-subtle dark:text-faint">+{extraFiles} more</p>
                )}
              </div>

              {!isStarter && shownFiles[0] && (
                <pre className="mt-2 max-h-28 overflow-auto rounded-lg border border-line bg-surface p-2 font-mono text-[10.5px] leading-relaxed text-muted dark:border-line-dark dark:bg-ink-950 dark:text-mist-muted">
                  {shownFiles[0].content.split("\n").slice(0, 12).join("\n")}
                </pre>
              )}

              <div className="mt-auto space-y-3 pt-4">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-graphite dark:text-mist">
                    {isStarter ? "Project folder name" : "File name"}
                  </span>
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setError("")
                    }}
                    placeholder={selected.suggestedName}
                    aria-label={isStarter ? "Project folder name" : "File name"}
                    className="w-full rounded-lg border border-line bg-hover px-3 py-2 text-[12.5px] text-graphite placeholder-subtle outline-none transition-colors focus:border-brand-400/60 focus:bg-panel focus:ring-2 focus:ring-brand-400/15 dark:border-line-dark dark:bg-ink-800 dark:text-mist dark:placeholder-faint"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-graphite dark:text-mist">
                    Create inside
                  </span>
                  <select
                    value={parentId}
                    onChange={(event) => setParentId(event.target.value)}
                    className="w-full rounded-lg border border-line bg-hover px-2.5 py-2 text-[12px] text-graphite outline-none focus:border-brand-400/60 dark:border-line-dark dark:bg-ink-800 dark:text-mist"
                  >
                    {folderRows.map((row) => (
                      <option key={row.node._id} value={row.node._id}>
                        {row.relPath}
                      </option>
                    ))}
                  </select>
                </label>

                {error && (
                  <p role="alert" className="text-[11px] text-red-500 dark:text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={creating || !name.trim() || !folderRows.length}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-[12.5px] font-medium text-on-brand transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creating && <Loader2 size={13} className="animate-spin" />}
                  {creating
                    ? "Creating…"
                    : isStarter
                      ? `Create ${previewFiles.length} files`
                      : "Create file"}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default NewFromTemplate
