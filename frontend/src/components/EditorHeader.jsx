import { ChevronRight, Copy, FolderTree, Save, Wand2 } from "lucide-react"
import { getFileMeta } from "../utils/customizeIcon"
import { shortcutLabel } from "../utils/shortcuts"

function EditorHeader({
  name,
  segments = [],
  onSegmentClick,
  onSave,
  onCopyPath,
  onReveal,
  onFormat,
  canFormat = false,
  saving,
}) {
  const { Icon, color } = getFileMeta(name)

  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-line bg-panel/40 px-2.5 backdrop-blur-xl dark:border-line-dark dark:bg-ink-900/40">
      <nav aria-label="File path" className="flex min-w-0 items-center gap-0.5 overflow-hidden">
        <Icon size={13} className="mr-1 shrink-0" style={{ color }} />

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          return (
            <span key={`${segment.relPath}-${index}`} className="flex min-w-0 items-center">
              {index > 0 && (
                <ChevronRight size={12} className="mx-0.5 shrink-0 text-subtle/70 dark:text-faint/60" />
              )}
              {isLast || !segment.id ? (
                <span
                  className={`truncate px-1 text-[11.5px] ${isLast ? "font-medium text-graphite dark:text-mist" : "text-subtle dark:text-faint"}`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {segment.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSegmentClick?.(segment)}
                  title={`Reveal ${segment.name} in explorer`}
                  className="truncate rounded px-1 text-[11.5px] text-subtle transition-colors hover:bg-hover hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
                >
                  {segment.name}
                </button>
              )}
            </span>
          )
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onFormat}
          disabled={!canFormat || saving}
          title={
            canFormat
              ? `Format document (${shortcutLabel("formatDocument")})`
              : "No formatter for this file type"
          }
          aria-label="Format document"
          className="rounded-md p-1.5 text-subtle transition-colors hover:bg-hover hover:text-graphite disabled:cursor-not-allowed disabled:opacity-40 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
        >
          <Wand2 size={13} />
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          title={`Save (${shortcutLabel("save")})`}
          aria-label="Save file"
          className="rounded-md p-1.5 text-subtle transition-colors hover:bg-hover hover:text-graphite disabled:opacity-50 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
        >
          <Save size={13} />
        </button>
        <button
          type="button"
          onClick={onCopyPath}
          title="Copy relative path"
          aria-label="Copy relative path"
          className="rounded-md p-1.5 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          onClick={onReveal}
          title="Reveal in explorer"
          aria-label="Reveal in explorer"
          className="rounded-md p-1.5 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
        >
          <FolderTree size={13} />
        </button>
      </div>
    </div>
  )
}

export default EditorHeader
