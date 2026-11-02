import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import {
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  FilePlus2,
  FolderPlus,
  FolderTree,
  LayoutTemplate,
  Link2,
  Pencil,
  Plus,
  Scissors,
  Trash2,
} from "lucide-react"
import { getFileMeta } from "../utils/customizeIcon"
import MaterialFolderIcon from "./MaterialFolderIcon"
import InlineNameInput from "./InlineNameInput"

const EASE_OUT = [0.22, 1, 0.36, 1]
const ROW_TRANSITION = { duration: 0.2, ease: EASE_OUT }
const CHEVRON_TRANSITION = { type: "spring", stiffness: 400, damping: 30 }
const MENU_WIDTH = 188
const MENU_HEIGHT = 260

function MenuItem({ icon: Icon, iconClass = "text-subtle dark:text-faint", danger = false, disabled = false, onClick, children }) {
  return (
    <button
      type='button'
      role='menuitem'
      tabIndex={-1}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "text-red-600 hover:bg-red-500/10 hover:text-red-500 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300" : "text-graphite hover:bg-hover dark:text-mist dark:hover:bg-ink-800"}`}
    >
      <Icon size={13} className={iconClass} />
      {children}
    </button>
  )
}

function Folder({
  node,
  depth = 0,
  open = false,
  hasChildren = false,
  activeId,
  onToggle,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onOpenFile,
  onReveal,
  onCopyPath,
  onCopyNode,
  onCutNode,
  onPasteInto,
  onMoveNode,
  onDropFiles,
  onNewFromTemplate,
  canPaste = false,
  editing = false,
  onCommitRename,
  onCancelEdit,
  indent = 16,
  onRowKeyDown,
}) {
  const [menu, setMenu] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const menuRef = useRef(null)
  const isFolder = node?.type === "folder"
  const isExpandable = isFolder && hasChildren
  const canDelete = depth > 0
  const isActive = !isFolder && activeId === node?._id
  const { Icon: NodeIcon, color } = getFileMeta(node?.name)

  useEffect(() => {
    if (!menu) return

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenu(null)
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenu(null)
    }
    const closeMenu = () => setMenu(null)

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", closeMenu)
    window.addEventListener("blur", closeMenu)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", closeMenu)
      window.removeEventListener("blur", closeMenu)
    }
  }, [menu])

  useEffect(() => {
    if (!menu) return
    menuRef.current?.querySelector('[role="menuitem"]')?.focus()
  }, [menu])

  const openMenuAt = (x, y) => {
    setMenu({
      x: Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 8)),
    })
  }

  const handleContextMenu = (event) => {
    event.preventDefault()
    openMenuAt(event.clientX, event.clientY)
  }

  const handleMenuKeyDown = (event) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])
    if (!items.length) return
    const index = items.indexOf(document.activeElement)

    if (event.key === "ArrowDown") {
      event.preventDefault()
      items[(index + 1) % items.length]?.focus()
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length]?.focus()
    } else if (event.key === "Home") {
      event.preventDefault()
      items[0]?.focus()
    } else if (event.key === "End") {
      event.preventDefault()
      items[items.length - 1]?.focus()
    } else if (event.key === "Escape") {
      event.preventDefault()
      setMenu(null)
    }
  }

  const close = (action) => {
    setMenu(null)
    action?.()
  }

  const handleActivate = () => {
    if (isFolder) onToggle?.()
    else onOpenFile?.(node)
  }

  return (
    <div className='relative'>
      <motion.div
        data-tree-row
        data-node-id={node?._id}
        role='treeitem'
        aria-level={depth + 1}
        aria-expanded={isFolder ? Boolean(isExpandable && open) : undefined}
        aria-selected={isActive || undefined}
        tabIndex={0}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("application/x-nexpulse-node", node?._id ?? "")
          event.dataTransfer.effectAllowed = "move"
        }}
        onDragOver={(event) => {
          if (!isFolder) return
          const types = Array.from(event.dataTransfer.types ?? [])
          if (types.includes("application/x-nexpulse-node") || types.includes("Files")) {
            event.preventDefault()
            event.dataTransfer.dropEffect = types.includes("Files") ? "copy" : "move"
            setDragOver(true)
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (!isFolder) return
          event.preventDefault()
          event.stopPropagation()
          setDragOver(false)

          const types = Array.from(event.dataTransfer.types ?? [])
          if (types.includes("Files")) {
            onDropFiles?.(event.dataTransfer, node._id)
            return
          }

          const draggedId = event.dataTransfer.getData("application/x-nexpulse-node")
          if (draggedId && draggedId !== node._id) onMoveNode?.(draggedId, node._id)
        }}
        whileHover={editing ? undefined : { x: 2 }}
        transition={ROW_TRANSITION}
        onClick={editing ? undefined : handleActivate}
        onContextMenu={handleContextMenu}
        onKeyDown={(event) => onRowKeyDown?.(event, node, { isFolder, open, canDelete })}
        className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${dragOver ? "ring-2 ring-brand-400/70" : ""} ${isActive ? "bg-brand-500/10 dark:bg-ink-800" : "hover:bg-hover dark:hover:bg-ink-800"}`}
      >
        <div
          className='flex min-w-0 flex-1 items-center gap-1.5'  
          style={{ marginLeft: `${depth * indent}px` }}
        >
          {isExpandable ? (
            <motion.span
              className='flex shrink-0 text-subtle dark:text-faint'
              animate={{ rotate: open ? 90 : 0 }}
              transition={CHEVRON_TRANSITION}
            >
              <ChevronRight size={13} />
            </motion.span>
          ) : (
            <span className='w-[13px] shrink-0' />
          )}

          {isFolder ? (
            <MaterialFolderIcon name={node?.name} size={15} className='shrink-0' />
          ) : (
            <NodeIcon size={14} className='shrink-0' style={{ color }} />
          )}

          {editing ? (
            <InlineNameInput
              initialValue={node?.name ?? ""}
              kind={isFolder ? "folder" : "file"}
              padded={false}
              onCommit={(name) => onCommitRename?.(name)}
              onCancel={onCancelEdit}
            />
          ) : (
            <span
              title={node?.name}
              className={`truncate text-[13px] transition-colors ${isActive ? "text-graphite dark:text-mist" : "text-muted group-hover:text-graphite dark:text-mist-muted dark:group-hover:text-mist"}`}
            >
              {node?.name}
            </span>
          )}
        </div>

        {isFolder && (
          <button
            type='button'
            tabIndex={-1}
            aria-label={`Create inside ${node.name}`}
            aria-haspopup='menu'
            aria-expanded={Boolean(menu)}
            onClick={(event) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              openMenuAt(rect.right - MENU_WIDTH, rect.bottom + 4)
            }}
            className='ml-2 hidden shrink-0 rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite group-hover:flex focus-visible:flex dark:text-faint dark:hover:bg-ink-700 dark:hover:text-mist'
          >
            <Plus size={13} />
          </button>
        )}
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {menu && (
            <motion.div
              ref={menuRef}
              role='menu'
              aria-label={`Actions for ${node?.name}`}
              onKeyDown={handleMenuKeyDown}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.12, ease: EASE_OUT }}
              style={{ top: menu.y, left: menu.x }}
              className='fixed z-[60] w-[188px] overflow-hidden rounded-lg border border-line bg-panel p-1 shadow-xl shadow-black/10 dark:border-line-dark dark:bg-ink-850 dark:shadow-black/50'
            >
              {isFolder ? (
                <>
                  <MenuItem
                    icon={FilePlus2}
                    iconClass='text-brand-500 dark:text-brand-400'
                    onClick={() => close(() => {
                      if (!open) onToggle?.()
                      onCreateFile?.(node)
                    })}
                  >
                    New File
                  </MenuItem>
                  <MenuItem
                    icon={FolderPlus}
                    iconClass='text-amber-500 dark:text-amber-400'
                    onClick={() => close(() => {
                      if (!open) onToggle?.()
                      onCreateFolder?.(node)
                    })}
                  >
                    New Folder
                  </MenuItem>
                  <MenuItem
                    icon={LayoutTemplate}
                    iconClass='text-emerald-500 dark:text-emerald-400'
                    onClick={() => close(() => onNewFromTemplate?.(node))}
                  >
                    New from Template
                  </MenuItem>
                </>
              ) : (
                <>
                  <MenuItem icon={NodeIcon} iconClass='' onClick={() => close(() => onOpenFile?.(node))}>
                    Open
                  </MenuItem>
                  <MenuItem
                    icon={ClipboardCopy}
                    onClick={() => close(() => onCopyPath?.(node, "content"))}
                  >
                    Copy Contents
                  </MenuItem>
                </>
              )}

              <div className='my-1 h-px bg-line dark:bg-line-dark' />

              <MenuItem icon={Copy} onClick={() => close(() => onCopyNode?.(node))}>
                Copy
              </MenuItem>
              <MenuItem icon={Scissors} onClick={() => close(() => onCutNode?.(node))}>
                Cut
              </MenuItem>
              {isFolder && (
                <MenuItem
                  icon={ClipboardPaste}
                  disabled={!canPaste}
                  onClick={() => close(() => onPasteInto?.(node))}
                >
                  Paste
                </MenuItem>
              )}

              <div className='my-1 h-px bg-line dark:bg-line-dark' />

              <MenuItem icon={Link2} onClick={() => close(() => onCopyPath?.(node, "full"))}>
                Copy Path
              </MenuItem>
              <MenuItem icon={Link2} onClick={() => close(() => onCopyPath?.(node, "relative"))}>
                Copy Relative Path
              </MenuItem>
              <MenuItem icon={FolderTree} onClick={() => close(() => onReveal?.(node))}>
                Reveal in Explorer
              </MenuItem>

              <div className='my-1 h-px bg-line dark:bg-line-dark' />

              <MenuItem icon={Pencil} onClick={() => close(() => onRename?.(node))}>
                Rename
              </MenuItem>

              {canDelete && (
                <MenuItem icon={Trash2} danger onClick={() => close(() => onDelete?.(node))}>
                  Delete
                </MenuItem>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

export default Folder
