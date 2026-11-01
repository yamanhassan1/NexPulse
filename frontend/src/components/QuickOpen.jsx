import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "motion/react"
import { Clock3, Search } from "lucide-react"
import { getFileMeta } from "../utils/customizeIcon"
import { searchFiles, splitHighlight } from "../utils/fileTree"

const EASE_OUT = [0.22, 1, 0.36, 1]

const Highlighted = ({ text, indices }) => {
  const parts = splitHighlight(text, indices)
  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={index}
            className="rounded-[2px] bg-brand-500/20 px-0 text-brand-700 dark:text-brand-200"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}

function QuickOpen({ files = [], recents = [], onSelect, onClose }) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const results = useMemo(() => {
    if (query.trim()) return searchFiles(files, query)
    return recents.slice(0, 8).map((item) => ({
      node: { _id: item.id, name: item.name, type: "file" },
      relPath: item.relPath,
      indices: [],
      score: 0,
      isRecent: true,
    }))
  }, [query, files, recents])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-row="${activeIndex}"]`)
    node?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const choice = results[activeIndex]
      if (choice) onSelect?.(choice)
    } else if (event.key === "Escape") {
      event.preventDefault()
      onClose?.()
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] dark:bg-black/50"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Quick open"
        initial={{ opacity: 0, y: -8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.985 }}
        transition={{ duration: 0.16, ease: EASE_OUT }}
        onKeyDown={handleKeyDown}
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] dark:border-line-dark dark:bg-ink-850 dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5 dark:border-line-dark">
          <Search size={15} className="shrink-0 text-subtle dark:text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            placeholder="Search files by name…"
            aria-label="Search files by name"
            className="h-11 min-w-0 flex-1 bg-transparent text-[13.5px] text-graphite placeholder-subtle outline-none dark:text-mist dark:placeholder-faint"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-medium text-subtle sm:block dark:border-line-dark dark:text-faint">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[min(52vh,380px)] overflow-y-auto p-1.5">
          {!query.trim() && results.length > 0 && (
            <p className="flex items-center gap-1.5 px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-subtle dark:text-faint">
              <Clock3 size={11} />
              Recently opened
            </p>
          )}

          {results.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-[12.5px] font-medium text-graphite dark:text-mist">
                No files match “{query.trim()}”
              </p>
              <p className="mt-1 text-[11.5px] text-subtle dark:text-faint">
                Try a shorter name, or part of the folder path.
              </p>
            </div>
          ) : (
            <ul role="listbox" aria-label="Files">
              {results.map((entry, index) => {
                const { Icon, color } = getFileMeta(entry.node.name)
                const isActive = index === activeIndex
                const relative = entry.relPath

                return (
                  <li key={`${entry.node._id}-${index}`} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      data-row={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => onSelect?.(entry)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${isActive ? "bg-brand-500/10 dark:bg-ink-800" : "hover:bg-hover dark:hover:bg-ink-800/60"}`}
                    >
                      <Icon size={14} className="shrink-0" style={{ color }} />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-graphite dark:text-mist">
                        <Highlighted text={entry.node.name} indices={entry.indices.filter((i) => i < entry.node.name.length)} />
                      </span>
                      <span className="min-w-0 max-w-[45%] truncate text-[11px] text-subtle dark:text-faint">
                        {relative}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-3.5 py-2 text-[10.5px] text-subtle dark:border-line-dark dark:text-faint">
          <span className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
          </span>
          <span>{query.trim() ? `${results.length} result${results.length === 1 ? "" : "s"}` : "type to search"}</span>
        </div>
      </motion.div>
    </div>
  )
}

export default QuickOpen
