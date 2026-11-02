import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  AlertTriangle,
  FilePlus2,
  FolderPlus,
  FolderTree,
  LayoutTemplate,
  RefreshCw,
  X,
} from "lucide-react"
import Folder from "./Folder"
import MaterialFolderIcon from "./MaterialFolderIcon"
import InlineNameInput from "./InlineNameInput"
import {
  createFile,
  createFolder,
  deleteFile,
  restoreDeleted,
  updateFile,
} from "../features/file"
import { useToast } from "../hooks/toastContext"
import { flattenTree } from "../utils/fileTree"

const EASE_OUT = [0.22, 1, 0.36, 1]
const TREE_TRANSITION = { duration: 0.22, ease: EASE_OUT }

const MIN_WIDTH = 200
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 264
const NARROW_WIDTH = 272
const TREE_INDENT = 16
const WIDTH_KEY = "nexpulse:explorer-width"
const EXPANDED_PREFIX = "nexpulse:expanded:"

const listVariants = {
  open: { height: "auto", opacity: 1 },
  closed: { height: 0, opacity: 0 },
}

const readStored = (key) => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStored = (key, value) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage may be unavailable (private mode); the UI still works in memory */
  }
}

const readWidth = () => {
  const stored = Number(readStored(WIDTH_KEY))
  return Number.isFinite(stored) && stored >= MIN_WIDTH && stored <= MAX_WIDTH
    ? stored
    : DEFAULT_WIDTH
}

const readExpanded = (projectId) => {
  const stored = readStored(`${EXPANDED_PREFIX}${projectId}`)
  if (!stored) return {}
  try {
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const useIsNarrow = () => {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches,
  )

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)")
    const onChange = (event) => setNarrow(event.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  return narrow
}

function Tree({ nodes = [], depth = 0, expanded, onToggle, activeId, ...handlers }) {
  return (
    <ul role={depth === 0 ? "tree" : "group"} aria-label={depth === 0 ? "Project files" : undefined}>
      {nodes.map((node) => (
        <TreeNode
          key={node._id}
          node={node}
          depth={depth}
          expanded={expanded}
          onToggle={onToggle}
          activeId={activeId}
          {...handlers}
        />
      ))}
    </ul>
  )
}

function TreeNode({ node, depth = 0, expanded, forcedOpen, onToggle, activeId, editing, indent = 16, onCommitCreate, onCommitRename, onCancelEdit, ...handlers }) {
  const isFolder = node.type === "folder"
  const hasChildren = isFolder && node.children?.length > 0
  // Only explicit user toggles are stored; top-level folders and anything the
  // user asked to reveal start open.
  const open = Object.prototype.hasOwnProperty.call(expanded, node._id)
    ? Boolean(expanded[node._id])
    : Boolean(forcedOpen?.has(node._id)) || depth === 0

  const isRenaming = editing?.mode === "rename" && editing.nodeId === node._id
  const creatingHere = editing?.mode === "create" && editing.parentId === node._id

  return (
    <li role="none">
      <Folder
        node={node}
        depth={depth}
        open={open}
        hasChildren={hasChildren}
        activeId={activeId}
        indent={indent}
        editing={isRenaming}
        onCommitRename={(name) => onCommitRename?.(node, name)}
        onCancelEdit={onCancelEdit}
        onToggle={() => {
          if (isFolder) onToggle?.(node._id, depth)
        }}
        {...handlers}
      />

      {creatingHere && (
        <InlineNameInput
          kind={editing.type}
          depth={depth + 1}
          indent={indent}
          onCommit={(name) => onCommitCreate?.(node._id, editing.type, name)}
          onCancel={onCancelEdit}
        />
      )}

      <AnimatePresence initial={false}>
        {hasChildren && open && (
          <motion.ul
            role="group"
            variants={listVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={TREE_TRANSITION}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeNode
                key={child._id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                forcedOpen={forcedOpen}
                onToggle={onToggle}
                activeId={activeId}
                editing={editing}
                indent={indent}
                onCommitCreate={onCommitCreate}
                onCommitRename={onCommitRename}
                onCancelEdit={onCancelEdit}
                {...handlers}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

function NodeDialog({ request, projectId, onClose, onChanged }) {
  const isDelete = request.mode === "delete"
  const isRename = request.mode === "rename"
  const nodeType = isRename || isDelete ? request.node?.type : request.type
  const isFolder = nodeType === "folder"
  const [name, setName] = useState(isRename ? request.node?.name ?? "" : "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef(null)
  const { pushToast } = useToast()

  useEffect(() => {
    if (isDelete) return
    const timer = setTimeout(() => {
      inputRef.current?.focus()
      if (isRename) inputRef.current?.select()
    }, 0)
    return () => clearTimeout(timer)
  }, [isDelete, isRename])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [loading, onClose])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading) return

    const trimmed = name.trim()
    if (!isDelete && !trimmed) return

    if (!isDelete && /[\\/]/.test(trimmed)) {
      setError("Name cannot contain slashes.")
      return
    }

    if (isRename && trimmed === request.node?.name) {
      onClose()
      return
    }

    setLoading(true)
    setError("")
    try {
      if (isDelete) {
        const result = await deleteFile(request.node._id)
        const batchId = result?.batchId

        pushToast(`${isFolder ? "Folder" : "File"} deleted.`, {
          variant: "success",
          action: batchId
            ? {
                label: "Undo",
                onClick: async () => {
                  try {
                    await restoreDeleted(batchId)
                    await onChanged?.()
                    pushToast("Restored.", { variant: "success" })
                  } catch (err) {
                    console.error(`[restore] ${err.message}`)
                    pushToast(
                      err.response?.data?.message || "Could not undo that delete.",
                      { variant: "error" },
                    )
                  }
                },
              }
            : undefined,
        })
      } else if (isRename) {
        await updateFile(request.node._id, { name: trimmed })
        pushToast("Renamed successfully.", { variant: "success" })
      } else if (isFolder) {
        await createFolder({
          projectId,
          name: trimmed,
          parentId: request.parent._id,
        })
        pushToast("Folder created.", { variant: "success" })
      } else {
        await createFile({
          projectId,
          name: trimmed,
          parentId: request.parent._id,
        })
        pushToast("File created.", { variant: "success" })
      }

      await onChanged?.()
      onClose()
    } catch (err) {
      const label = isDelete ? "delete" : isRename ? "rename" : "create"
      console.error(`[${label}] ${err.message}`)
      setError(
        err.response?.data?.message ||
          `Could not ${label} the ${isFolder ? "folder" : "file"}.`,
      )
    } finally {
      setLoading(false)
    }
  }

  const title = isDelete
    ? `Delete ${isFolder ? "Folder" : "File"}`
    : isRename
      ? `Rename ${isFolder ? "Folder" : "File"}`
      : `New ${isFolder ? "Folder" : "File"}`

  const description = isDelete
    ? isFolder
      ? `"${request.node?.name}" and everything inside it will be deleted.`
      : `"${request.node?.name}" will be deleted.`
    : isRename
      ? `Give "${request.node?.name}" a new name.`
      : `Pick a name inside "${request.parent?.name}".`

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="node-dialog-title"
      aria-describedby="node-dialog-description"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => !loading && onClose()}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/60"
      />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-line bg-panel shadow-[0_40px_80px_-30px_rgba(0,0,0,0.3)] dark:border-line-dark dark:bg-ink-850 dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-line-dark">
          <div>
            <h2
              id="node-dialog-title"
              className="text-[13px] font-semibold text-graphite dark:text-mist"
            >
              {title}
            </h2>
            <p id="node-dialog-description" className="mt-0.5 text-[11px] text-subtle dark:text-faint">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite disabled:opacity-40 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          {isDelete ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-600 dark:text-red-300">
              <AlertTriangle size={14} className="shrink-0" />
              You can undo this right after from the notification.
            </div>
          ) : (
            <input
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={isFolder ? "folder-name" : "file-name.js"}
              maxLength={255}
              aria-label={`${isFolder ? "Folder" : "File"} name`}
              className="w-full rounded-lg border border-line bg-hover px-3 py-2 text-[13px] text-graphite placeholder-subtle outline-none transition-colors focus:border-brand-400/60 focus:bg-panel focus:ring-2 focus:ring-brand-400/15 dark:border-line-dark dark:bg-ink-800 dark:text-mist dark:placeholder-faint dark:focus:bg-ink-800"
            />
          )}

          {error && (
            <p role="alert" className="text-[11px] text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-4 py-3 dark:border-line-dark">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-graphite disabled:opacity-40 dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (!isDelete && !name.trim())}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium text-on-brand transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${isDelete ? "bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400" : "bg-brand-600 hover:bg-brand-700"}`}
          >
            {loading
              ? isDelete
                ? "Deleting..."
                : isRename
                  ? "Renaming..."
                  : "Creating..."
              : isDelete
                ? "Delete"
                : isRename
                  ? "Rename"
                  : "Create"}
          </button>
        </div>
      </motion.form>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-1 px-2 py-1" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex items-center gap-2 py-1.5" style={{ paddingLeft: row % 3 === 0 ? 0 : 12 }}>
          <div className="h-3.5 w-3.5 animate-pulse rounded bg-line dark:bg-ink-700" />
          <div
            className="h-2.5 animate-pulse rounded bg-line dark:bg-ink-700"
            style={{ width: `${68 - (row % 3) * 10}%` }}
          />
        </div>
      ))}
    </div>
  )
}

function Explorer({
  projectId,
  projectName = "",
  tree = [],
  treeError = "",
  loading = false,
  reloadTree,
  activeId,
  revealIds = [],
  revealTarget = null,
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
  onClose,
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [width, setWidth] = useState(readWidth)
  const [expanded, setExpanded] = useState(() => readExpanded(projectId))
  const listRef = useRef(null)
  const resizeRef = useRef(null)
  const editRef = useRef({})
  const { pushToast } = useToast()
  const isNarrow = useIsNarrow()
  const rootFolder = tree.find((node) => node.type === "folder")

  const forcedOpen = useMemo(() => new Set(revealIds), [revealIds])

  const rows = useMemo(() => flattenTree(tree), [tree])
  const rowById = useMemo(() => new Map(rows.map((row) => [row.node._id, row])), [rows])

  const openEntry = useCallback(
    (node) => {
      const row = rowById.get(node?._id)
      if (row) onOpenFile?.(row)
    },
    [onOpenFile, rowById],
  )

  // Scroll the revealed row into view. DOM-only, so no state is synced here.
  useEffect(() => {
    if (!revealTarget) return
    const node = listRef.current?.querySelector(`[data-node-id="${revealTarget}"]`)
    node?.scrollIntoView({ block: "nearest" })
  }, [revealTarget, revealIds])

  useEffect(() => {
    writeStored(WIDTH_KEY, String(width))
  }, [width])

  useEffect(() => {
    writeStored(`${EXPANDED_PREFIX}${projectId}`, JSON.stringify(expanded))
  }, [expanded, projectId])

  useEffect(() => {
    const onMove = (event) => {
      const state = resizeRef.current
      if (!state) return
      const next = state.startWidth + (event.clientX - state.startX)
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)))
    }
    const onUp = () => {
      if (!resizeRef.current) return
      resizeRef.current = null
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [])

  const startResize = (event) => {
    event.preventDefault()
    resizeRef.current = { startX: event.clientX, startWidth: width }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  const handleRefresh = async () => {
    if (refreshing || !reloadTree) return
    setRefreshing(true)
    try {
      await reloadTree()
    } finally {
      setRefreshing(false)
    }
  }

  const toggleNode = useCallback((id, depth = 0) => {
    setExpanded((current) => {
      const isOpen = Object.prototype.hasOwnProperty.call(current, id)
        ? Boolean(current[id])
        : depth === 0
      return { ...current, [id]: !isOpen }
    })
  }, [])

  const listRows = useCallback(
    () => Array.from(listRef.current?.querySelectorAll("[data-tree-row]") ?? []),
    [],
  )

  const focusAt = useCallback(
    (index) => {
      const all = listRows()
      if (!all.length) return
      all[Math.min(Math.max(index, 0), all.length - 1)]?.focus()
    },
    [listRows],
  )

  const handleRowKeyDown = useCallback(
    (event, node, meta) => {
      const all = listRows()
      const index = all.indexOf(event.currentTarget)

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          focusAt(index + 1)
          break
        case "ArrowUp":
          event.preventDefault()
          focusAt(index - 1)
          break
        case "Home":
          event.preventDefault()
          focusAt(0)
          break
        case "End":
          event.preventDefault()
          focusAt(all.length - 1)
          break
        case "ArrowRight":
          if (meta.isFolder) {
            event.preventDefault()
            setExpanded((current) => ({ ...current, [node._id]: true }))
          }
          break
        case "ArrowLeft":
          if (meta.isFolder) {
            event.preventDefault()
            setExpanded((current) => ({ ...current, [node._id]: false }))
          }
          break
        case "Enter":
        case " ":
          event.preventDefault()
          if (meta.isFolder) toggleNode(node._id)
          else onOpenFile?.(node)
          break
        case "F2":
          event.preventDefault()
          editRef.current.startRename?.(node)
          break
        case "Delete":
          if (meta.canDelete) {
            event.preventDefault()
            editRef.current.handleDeleteRequest?.(node)
          }
          break
        default:
          break
      }
    },
    [focusAt, listRows, onOpenFile, toggleNode],
  )

  const startCreate = useCallback((parent, type) => {
    if (!parent?._id) return
    // Open the folder so the new row is visible where the user is looking.
    setExpanded((current) => ({ ...current, [parent._id]: true }))
    setEditing({ mode: "create", type, parentId: parent._id })
  }, [])

  const startRename = useCallback((node) => {
    if (!node?._id) return
    setEditing({ mode: "rename", nodeId: node._id })
  }, [])

  const cancelEdit = useCallback(() => setEditing(null), [])

  // Errors are re-thrown on purpose: InlineNameInput shows them in place and
  // keeps the field open, so a duplicate name does not lose what was typed.
  const commitCreate = useCallback(
    async (parentId, type, name) => {
      if (type === "folder") {
        await createFolder({ projectId, name, parentId })
      } else {
        await createFile({ projectId, name, parentId })
      }
      setEditing(null)
      await reloadTree?.()
      pushToast(`${type === "folder" ? "Folder" : "File"} created.`, { variant: "success" })
    },
    [projectId, pushToast, reloadTree],
  )

  const commitRename = useCallback(
    async (node, name) => {
      await updateFile(node._id, { name })
      setEditing(null)
      await reloadTree?.()
      pushToast("Renamed.", { variant: "success" })
    },
    [pushToast, reloadTree],
  )

  const handleDeleteRequest = useCallback((node) => {
    if (!node?._id) return
    setDeleting(node)
  }, [])

  const handleRootCreate = (type) => {
    if (!rootFolder) {
      pushToast("This project has no root folder yet.", { variant: "error" })
      return
    }
    startCreate(rootFolder, type)
  }

  const closeDialog = useCallback(() => setDeleting(null), [])

  // The row key handler is defined before these, so it reaches them through a
  // ref rather than closing over declarations that do not exist yet.
  useEffect(() => {
    editRef.current = { startRename, handleDeleteRequest }
  }, [handleDeleteRequest, startRename])

  return (
    <>
      {onClose && (
        <div
          className="fixed inset-x-0 bottom-0 top-14 z-30 bg-black/30 backdrop-blur-[1px] sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <motion.aside
        initial={isNarrow ? { opacity: 0, x: -16 } : { width: 0, opacity: 0 }}
        animate={isNarrow ? { opacity: 1, x: 0 } : { width, opacity: 1 }}
        exit={isNarrow ? { opacity: 0, x: -16 } : { width: 0, opacity: 0 }}
        transition={{ duration: 0.24, ease: EASE_OUT }}
        style={isNarrow ? { width: NARROW_WIDTH } : undefined}
        className="relative flex shrink-0 flex-col overflow-hidden border-r border-line bg-panel/95 backdrop-blur-xl transition-colors duration-200 max-sm:absolute max-sm:inset-y-0 max-sm:left-14 max-sm:z-40 max-sm:shadow-2xl max-sm:shadow-black/20 dark:border-line-dark dark:bg-ink-900/95"
      >
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line px-2 pr-3 dark:border-line-dark">
          <div className="flex min-w-0 items-center gap-1.5 pl-1">
            <MaterialFolderIcon name={projectName} size={14} className="shrink-0" />
            <span
              title={projectName}
              className="truncate text-[12px] font-semibold tracking-tight text-graphite dark:text-mist"
            >
              {projectName || "Explorer"}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onNewFromTemplate?.(rootFolder)}
              aria-label="New from template"
              title="New from template"
              className="rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
            >
              <LayoutTemplate size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleRootCreate("file")}
              aria-label="New file"
              title="New file"
              className="rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
            >
              <FilePlus2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleRootCreate("folder")}
              aria-label="New folder"
              title="New folder"
              className="rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
            >
              <FolderPlus size={13} />
            </button>
            <motion.button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              aria-label="Refresh file tree"
              title="Refresh"
              initial="rest"
              animate={refreshing ? "spinning" : "rest"}
              whileHover={refreshing ? undefined : "hover"}
              whileTap={{ scale: 0.9 }}
              className="rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite disabled:cursor-wait disabled:opacity-50 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
            >
              <motion.span
                className="flex"
                variants={{
                  rest: { rotate: 0 },
                  hover: { rotate: 180 },
                  spinning: { rotate: 360 },
                }}
                transition={
                  refreshing
                    ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                    : { type: "spring", stiffness: 260, damping: 20 }
                }
              >
                <RefreshCw size={13} />
              </motion.span>
            </motion.button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close explorer"
                className="ml-0.5 rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite sm:hidden dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div
          ref={listRef}
          onDragOver={(event) => {
            if (Array.from(event.dataTransfer.types ?? []).includes("Files")) {
              event.preventDefault()
              event.dataTransfer.dropEffect = "copy"
            }
          }}
          onDrop={(event) => {
            if (!Array.from(event.dataTransfer.types ?? []).includes("Files")) return
            event.preventDefault()
            onDropFiles?.(event.dataTransfer, rootFolder?._id)
          }}
          className='flex-1 overflow-y-auto px-1 py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:transition-colors hover:[&::-webkit-scrollbar-thumb]:bg-black/25 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20'
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(140,140,160,0.35) transparent" }}
        >
          {treeError ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <AlertTriangle size={26} strokeWidth={1.5} className="text-red-500/70 dark:text-red-400/70" />
              <p className="text-[12px] leading-relaxed text-red-600 dark:text-red-400">{treeError}</p>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-hover hover:text-graphite disabled:cursor-wait disabled:opacity-50 dark:border-line-dark dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist"
              >
                {refreshing ? "Retrying..." : "Try again"}
              </button>
            </div>
          ) : loading && tree.length === 0 ? (
            <SkeletonRows />
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-hover dark:bg-ink-800">
                <FolderTree size={20} strokeWidth={1.6} className="text-subtle dark:text-faint" />
              </div>
              <div>
                <p className="text-[12.5px] font-medium text-graphite dark:text-mist">
                  Nothing here yet
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-subtle dark:text-faint">
                  Create a file or folder and it will show up right here.
                </p>
              </div>
              {rootFolder && (
                <button
                  type="button"
                  onClick={() => handleRootCreate("file")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[11.5px] font-medium text-on-brand transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
                >
                  <FilePlus2 size={12} />
                  New file
                </button>
              )}
            </div>
          ) : (
            <Tree
              nodes={tree}
              expanded={expanded}
              forcedOpen={forcedOpen}
              onToggle={toggleNode}
              activeId={activeId}
              indent={TREE_INDENT}
              editing={editing}
              onCommitCreate={commitCreate}
              onCommitRename={commitRename}
              onCancelEdit={cancelEdit}
              onCreateFile={(parent) => startCreate(parent, "file")}
              onCreateFolder={(parent) => startCreate(parent, "folder")}
              onRename={startRename}
              onDelete={handleDeleteRequest}
              onOpenFile={openEntry}
              onReveal={(node) => onReveal?.(node?._id)}
              onCopyPath={onCopyPath}
              onCopyNode={onCopyNode}
              onCutNode={onCutNode}
              onPasteInto={onPasteInto}
              onMoveNode={onMoveNode}
              onDropFiles={onDropFiles}
              onNewFromTemplate={onNewFromTemplate}
              canPaste={canPaste}
              onRowKeyDown={handleRowKeyDown}
            />
          )}
        </div>

        <div
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize explorer"
          className="absolute inset-y-0 -right-1 hidden w-2 cursor-col-resize sm:block"
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors hover:bg-brand-400/60" />
        </div>

        {deleting && (
          <NodeDialog
            key={`delete-${deleting._id}`}
            request={{ mode: "delete", node: deleting }}
            projectId={projectId}
            onClose={closeDialog}
            onChanged={reloadTree}
          />
        )}
      </motion.aside>
    </>
  )
}

export default Explorer
