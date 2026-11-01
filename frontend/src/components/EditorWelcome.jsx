import { Clock3, FolderTree, Search, X } from "lucide-react"
import Logo from "./Logo"
import { getFileMeta } from "../utils/customizeIcon"

function EditorWelcome({ recents = [], onQuickOpen, onOpenExplorer, onOpenRecent, onClearRecents }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <Logo className="mb-4 h-9 w-9" />

        <h1 className="text-[16px] font-semibold tracking-tight text-graphite dark:text-mist">
          NexPulse workspace
        </h1>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted dark:text-mist-muted">
          Open a file to start editing. Everything you type saves automatically.
        </p>

        <div className="mt-5 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onQuickOpen}
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:border-line-dark dark:bg-ink-850 dark:hover:bg-ink-800"
          >
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-graphite dark:text-mist">
              <Search size={14} className="text-subtle dark:text-faint" />
              Open file
            </span>
            <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-subtle dark:border-line-dark dark:text-faint">
              Ctrl P
            </kbd>
          </button>

          <button
            type="button"
            onClick={onOpenExplorer}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-muted transition-colors hover:bg-hover hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist"
          >
            <FolderTree size={14} className="text-subtle dark:text-faint" />
            Open folder
          </button>
        </div>

        {recents.length > 0 && (
          <div className="mt-6 w-full text-left">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-subtle dark:text-faint">
                <Clock3 size={11} />
                Recent
              </p>
              <button
                type="button"
                onClick={onClearRecents}
                className="flex items-center gap-1 rounded px-1 text-[10.5px] text-subtle transition-colors hover:text-graphite dark:text-faint dark:hover:text-mist"
              >
                <X size={10} />
                Clear
              </button>
            </div>

            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line dark:divide-line-dark dark:border-line-dark">
              {recents.slice(0, 5).map((item) => {
                const { Icon, color } = getFileMeta(item.name)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpenRecent?.(item)}
                      className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400/60 dark:hover:bg-ink-800"
                    >
                      <Icon size={13} className="shrink-0" style={{ color }} />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-graphite dark:text-mist">
                        {item.name}
                      </span>
                      <span className="max-w-[55%] truncate text-[10.5px] text-subtle dark:text-faint">
                        {item.relPath}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorWelcome
