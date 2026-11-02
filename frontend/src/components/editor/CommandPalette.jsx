import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { CornerDownLeft, Search } from "lucide-react"
import { fuzzyMatch } from "../../utils/fileTree"

function CommandPalette({ commands = [], onClose }) {
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)

  const results = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 12)
    return commands
      .map((command) => {
        const match = fuzzyMatch(query, command.label)
        return match ? { ...command, score: match.score } : null
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
  }, [commands, query])

  const run = (command) => {
    if (!command) return
    onClose?.()
    command.run?.()
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center px-4 pt-[14vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] dark:bg-black/45"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        initial={{ opacity: 0, y: -6, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.14 }}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] dark:border-line-dark dark:bg-ink-850 dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center gap-2 border-b border-line px-3 dark:border-line-dark">
          <Search size={14} className="shrink-0 text-subtle dark:text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setIndex(0)
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setIndex((current) => Math.max(current - 1, 0))
              } else if (event.key === "Enter") {
                event.preventDefault()
                run(results[index])
              } else if (event.key === "Escape") {
                event.preventDefault()
                onClose?.()
              }
            }}
            placeholder="Type a command…"
            aria-label="Command"
            className="h-10 min-w-0 flex-1 bg-transparent text-[13px] text-graphite placeholder-subtle outline-none dark:text-mist dark:placeholder-faint"
          />
        </div>

        <ul role="listbox" className="max-h-64 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-2 py-6 text-center text-[12px] text-subtle dark:text-faint">
              No matching command
            </li>
          ) : (
            results.map((command, position) => (
              <li key={command.id} role="option" aria-selected={position === index}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(position)}
                  onClick={() => run(command)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${position === index ? "bg-brand-500/10 text-graphite dark:bg-ink-800 dark:text-mist" : "text-muted hover:bg-hover dark:text-mist-muted dark:hover:bg-ink-800/60"}`}
                >
                  <span className="truncate">{command.label}</span>
                  {command.hint ? (
                    <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-subtle dark:border-line-dark dark:text-faint">
                      {command.hint}
                    </span>
                  ) : (
                    position === index && (
                      <CornerDownLeft size={12} className="shrink-0 text-subtle dark:text-faint" />
                    )
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </motion.div>
    </div>
  )
}

export default CommandPalette
