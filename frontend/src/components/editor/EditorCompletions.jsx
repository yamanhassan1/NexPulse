import { useEffect, useRef } from "react"
import {
  Braces,
  Box,
  Code2,
  FunctionSquare,
  Hash,
  Sparkles,
  TextCursorInput,
  Variable,
} from "lucide-react"

const KIND_ICONS = {
  snippet: Sparkles,
  keyword: Hash,
  function: FunctionSquare,
  variable: Variable,
  property: Braces,
  tag: Code2,
  attr: TextCursorInput,
  constant: Hash,
  file: Code2,
  folder: Box,
  default: Box,
}

const KIND_COLORS = {
  snippet: "text-brand-500 dark:text-brand-400",
  keyword: "text-violet-500 dark:text-violet-400",
  function: "text-sky-500 dark:text-sky-400",
  variable: "text-emerald-500 dark:text-emerald-400",
  property: "text-amber-500 dark:text-amber-400",
  tag: "text-sky-500 dark:text-sky-400",
  attr: "text-amber-500 dark:text-amber-400",
  constant: "text-rose-500 dark:text-rose-400",
}

function EditorCompletions({ items = [], index = 0, position = { top: 0, left: 0 }, onHover, onAccept }) {
  const listRef = useRef(null)

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: "nearest" })
  }, [index])

  if (!items.length) return null

  return (
    <div
      role="listbox"
      aria-label="Code suggestions"
      style={{ top: position.top, left: position.left }}
      className="absolute z-30 w-[310px] overflow-hidden rounded-lg border border-line bg-panel shadow-xl shadow-black/10 dark:border-line-dark dark:bg-ink-850 dark:shadow-black/50"
    >
      <ul ref={listRef} className="max-h-60 overflow-y-auto p-1">
        {items.map((item, itemIndex) => {
          const Icon = KIND_ICONS[item.kind] ?? KIND_ICONS.default
          const active = itemIndex === index
          return (
            <li key={`${item.kind}-${item.label}`} role="option" aria-selected={active}>
              <button
                type="button"
                tabIndex={-1}
                data-active={active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => onHover?.(itemIndex)}
                onClick={() => onAccept?.(itemIndex)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  active
                    ? "bg-brand-500/10 text-graphite dark:bg-ink-800 dark:text-mist"
                    : "text-muted hover:bg-hover dark:text-mist-muted dark:hover:bg-ink-800/60"
                }`}
              >
                <Icon
                  size={13}
                  className={`shrink-0 ${KIND_COLORS[item.kind] ?? "text-subtle dark:text-faint"}`}
                />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{item.label}</span>
                {item.detail && (
                  <span className="max-w-[52%] shrink-0 truncate text-[10.5px] text-subtle dark:text-faint">
                    {item.detail}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-line px-2.5 py-1 text-[10px] text-subtle dark:border-line-dark dark:text-faint">
        <span>Enter / Tab to insert</span>
        <span>Esc to close</span>
      </div>
    </div>
  )
}

export default EditorCompletions
