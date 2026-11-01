import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { Copy, FolderTree, X } from "lucide-react"
import { getFileMeta } from "../utils/customizeIcon"

const MENU_WIDTH = 190
const MENU_HEIGHT = 176

function MenuItem({ icon: Icon, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors ${danger ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "text-graphite hover:bg-hover dark:text-mist dark:hover:bg-ink-800"}`}
    >
      <Icon size={13} className="text-subtle dark:text-faint" />
      {children}
    </button>
  )
}

function EditorTabs({
  tabs = [],
  activeId,
  dirtyIds = [],
  onActivate,
  onClose,
  onCloseOthers,
  onCloseAll,
  onReorder,
  onCopyPath,
  onReveal,
}) {
  const [menu, setMenu] = useState(null)
  const [dragId, setDragId] = useState(null)
  const menuRef = useRef(null)
  const stripRef = useRef(null)

  useEffect(() => {
    if (!menu) return

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenu(null)
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenu(null)
      const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])
      if (!items.length) return
      const index = items.indexOf(document.activeElement)
      if (event.key === "ArrowDown") {
        event.preventDefault()
        items[(index + 1) % items.length]?.focus()
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        items[(index - 1 + items.length) % items.length]?.focus()
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menu])

  const openMenu = (event, tab) => {
    event.preventDefault()
    setMenu({
      id: tab.id,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - MENU_WIDTH - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - MENU_HEIGHT - 8)),
    })
  }

  const menuTab = tabs.find((tab) => tab.id === menu?.id)

  return (
    <div className="relative flex h-9 shrink-0 items-stretch border-b border-line bg-panel/60 backdrop-blur-xl dark:border-line-dark dark:bg-ink-900/60">
      <div
        ref={stripRef}
        role="tablist"
        aria-label="Open files"
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:h-0"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId
          const isDirty = dirtyIds.includes(tab.id)
          const { Icon, color } = getFileMeta(tab.name)

          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              draggable
              onDragStart={() => setDragId(tab.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragId) onReorder?.(dragId, tab.id)
                setDragId(null)
              }}
              onAuxClick={(event) => {
                if (event.button === 1) {
                  event.preventDefault()
                  onClose?.(tab.id)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onActivate?.(tab.id)
                }
              }}
              onClick={() => onActivate?.(tab.id)}
              onContextMenu={(event) => openMenu(event, tab)}
              className={`group relative flex min-w-0 max-w-[200px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-line px-2.5 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400/60 dark:border-line-dark ${isActive ? "bg-surface text-graphite dark:bg-ink-950 dark:text-mist" : "text-muted hover:bg-hover dark:text-mist-muted dark:hover:bg-ink-800/60"} ${dragId === tab.id ? "opacity-50" : ""}`}
            >
              {isActive && (
                <span className="absolute inset-x-0 top-0 h-[2px] bg-brand-500" aria-hidden="true" />
              )}

              <Icon size={13} className="shrink-0" style={{ color }} />
              <span className={`truncate ${isDirty ? "italic" : ""}`}>{tab.name}</span>

              <button
                type="button"
                tabIndex={-1}
                aria-label={`Close ${tab.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onClose?.(tab.id)
                }}
                className={`ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded transition-opacity hover:bg-black/10 dark:hover:bg-white/10 ${isDirty ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
              >
                {isDirty ? (
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-500 group-hover:hidden" />
                ) : null}
                {isDirty ? (
                  <X size={11} className="hidden group-hover:block" />
                ) : (
                  <X size={11} />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {createPortal(
        <AnimatePresence>
          {menu && menuTab && (
            <motion.div
              ref={menuRef}
              role="menu"
              aria-label={`Actions for ${menuTab.name}`}
              initial={{ opacity: 0, scale: 0.97, y: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -3 }}
              transition={{ duration: 0.1 }}
              style={{ top: menu.y, left: menu.x }}
              className="fixed z-[75] w-[190px] overflow-hidden rounded-lg border border-line bg-panel p-1 shadow-xl shadow-black/10 dark:border-line-dark dark:bg-ink-850 dark:shadow-black/50"
            >
              <MenuItem
                icon={X}
                onClick={() => {
                  onClose?.(menuTab.id)
                  setMenu(null)
                }}
              >
                Close
              </MenuItem>
              <MenuItem
                icon={X}
                onClick={() => {
                  onCloseOthers?.(menuTab.id)
                  setMenu(null)
                }}
              >
                Close Others
              </MenuItem>
              <MenuItem
                icon={X}
                onClick={() => {
                  onCloseAll?.()
                  setMenu(null)
                }}
              >
                Close All
              </MenuItem>
              <div className="my-1 h-px bg-line dark:bg-line-dark" />
              <MenuItem
                icon={Copy}
                onClick={() => {
                  onCopyPath?.(menuTab)
                  setMenu(null)
                }}
              >
                Copy Relative Path
              </MenuItem>
              <MenuItem
                icon={FolderTree}
                onClick={() => {
                  onReveal?.(menuTab)
                  setMenu(null)
                }}
              >
                Reveal in Explorer
              </MenuItem>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

export default EditorTabs
