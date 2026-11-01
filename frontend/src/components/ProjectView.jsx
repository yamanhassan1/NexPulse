import { AnimatePresence } from "motion/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import ActivityBar from "./ActivityBar"
import EditorHeader from "./EditorHeader"
import EditorTabs from "./EditorTabs"
import EditorWelcome from "./EditorWelcome"
import Explorer from "./Explorer"
import FileViewer from "./FileViewer"
import QuickOpen from "./QuickOpen"
import TopBar from "./TopBar"
import { getProjectById } from "../features/project"
import { getTree, getFile, copyNode, moveNode, importFiles } from "../features/file"
import {
  buildImportPayload,
  describeSkipped,
  readDroppedItems,
} from "../utils/localFiles"
import { setCurrentProject } from "../redux/projectSlice"
import { useFileTabs } from "../hooks/useFileTabs"
import { useToast } from "../hooks/toastContext"
import { flattenTree } from "../utils/fileTree"
import { languageOf } from "../utils/highlight"
import { canFormat, formatCode } from "../utils/formatCode"
import { loadSettings, saveSettings } from "../utils/editorSettings"

const fetchTree = async (projectId) => {
  const data = await getTree(projectId)
  return Array.isArray(data) ? data : []
}

function ProjectView({ projectId }) {
  const dispatch = useDispatch()
  const { pushToast } = useToast()
  const currentProject = useSelector((state) => state.project.currentProject)

  const [showExplorer, setShowExplorer] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 640,
  )
  const [showPreview, setShowPreview] = useState(false)
  const [tree, setTree] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [treeError, setTreeError] = useState("")
  const [quickOpen, setQuickOpen] = useState(false)
  const [revealIds, setRevealIds] = useState([])
  const [revealTarget, setRevealTarget] = useState(null)
  const [clipboard, setClipboard] = useState(null)
  const [settings, setSettings] = useState(loadSettings)

  const editor = useFileTabs({ projectId, pushToast })

  const rows = useMemo(() => flattenTree(tree), [tree])
  const files = useMemo(() => rows.filter((row) => row.node.type === "file"), [rows])
  const rowById = useMemo(() => new Map(rows.map((row) => [row.node._id, row])), [rows])
  const rowByPath = useMemo(() => new Map(rows.map((row) => [row.relPath, row])), [rows])

  // Tab titles and paths are resolved through the tree by id, so renaming or
  // moving a parent folder updates the tab instead of leaving a stale path.
  const tabs = useMemo(
    () =>
      editor.tabs.map((tab) => {
        const row = rowById.get(tab.id)
        return row ? { ...tab, name: row.node.name, relPath: row.relPath } : tab
      }),
    [editor.tabs, rowById],
  )

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === editor.activeId) ?? null,
    [tabs, editor.activeId],
  )

  const segments = useMemo(() => {
    if (!activeTab) return []
    const parts = activeTab.relPath.split("/")
    return parts.map((name, index) => {
      const relPath = parts.slice(0, index + 1).join("/")
      const row = rowByPath.get(relPath)
      return { name, relPath, id: row?.node?._id ?? null, type: row?.node?.type ?? "file" }
    })
  }, [activeTab, rowByPath])

  const loadTree = useCallback(async () => {
    try {
      setTree(await fetchTree(projectId))
      setTreeError("")
    } catch (error) {
      console.error(`[getTree] ${error.message}`)
      setTree([])
      setTreeError("Could not load your files.")
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false

    getProjectById(projectId)
      .then((data) => {
        if (!cancelled) dispatch(setCurrentProject(data))
      })
      .catch((error) => {
        if (!cancelled) console.error(`[getProject] ${error.message}`)
      })

    fetchTree(projectId)
      .then((data) => {
        if (!cancelled) {
          setTree(data)
          setTreeError("")
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(`[getTree] ${error.message}`)
          setTree([])
          setTreeError("Could not load your files.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
      dispatch(setCurrentProject(null))
    }
  }, [dispatch, projectId])

  const revealRow = useCallback((row) => {
    if (!row) return
    const folderIds = row.node.type === "folder" ? [...row.parentIds, row.node._id] : row.parentIds
    setRevealIds(folderIds)
    setRevealTarget(row.node._id)
    setShowExplorer(true)
  }, [])

  const revealById = useCallback(
    (id) => {
      const row = rowById.get(id)
      if (row) revealRow(row)
    },
    [rowById, revealRow],
  )

  const copyText = useCallback(
    async (text, label) => {
      try {
        await navigator.clipboard.writeText(text)
        pushToast(`${label} copied.`, { variant: "success" })
      } catch (error) {
        console.error(`[clipboard] ${error.message}`)
        pushToast("Could not copy to the clipboard.", { variant: "error" })
      }
    },
    [pushToast],
  )

  const activeRow = activeTab ? rowByPath.get(activeTab.relPath) : null
  const relativePath = activeRow?.relPath ?? activeTab?.relPath ?? ""
  // Report what the file actually uses rather than always claiming LF.
  const eol = (editor.activeBuffer?.value ?? "").includes("\r\n") ? "CRLF" : "LF"

  const handleOpen = useCallback(
    (entry) => {
      editor.openFile(entry)
      setQuickOpen(false)
    },
    [editor],
  )

  const handleOpenRecent = useCallback(
    (recent) => {
      const row = rowById.get(recent.id) ?? rowByPath.get(recent.relPath)
      if (row) editor.openFile(row)
      else pushToast("That file is no longer in this project.", { variant: "error" })
    },
    [editor, pushToast, rowById, rowByPath],
  )

  const rootId = tree.find((node) => node.type === "folder")?._id ?? null

  const copyToClipboard = useCallback(
    (node) => {
      if (!node) return
      setClipboard({ mode: "copy", id: node._id, name: node.name })
      pushToast(`“${node.name}” ready to paste.`, { variant: "info" })
    },
    [pushToast],
  )

  const cutToClipboard = useCallback(
    (node) => {
      if (!node) return
      if (!node.parentId && node.type === "folder") {
        pushToast("The project root cannot be moved.", { variant: "error" })
        return
      }
      setClipboard({ mode: "cut", id: node._id, name: node.name })
      pushToast(`“${node.name}” will move when you paste.`, { variant: "info" })
    },
    [pushToast],
  )

  const pasteIntoFolder = useCallback(
    async (folderId) => {
      if (!clipboard || !folderId) return

      try {
        if (clipboard.mode === "copy") {
          await copyNode({ id: clipboard.id, parentId: folderId })
        } else {
          await moveNode({ id: clipboard.id, parentId: folderId })
          setClipboard(null)
        }
        await loadTree()
        pushToast(clipboard.mode === "copy" ? "Pasted a copy." : "Moved.", { variant: "success" })
      } catch (error) {
        console.error(`[paste] ${error.message}`)
        pushToast(
          error.response?.data?.message || "Could not paste that item here.",
          { variant: "error" },
        )
      }
    },
    [clipboard, loadTree, pushToast],
  )

  const moveDragged = useCallback(
    async (id, parentId) => {
      if (!id || !parentId) return
      try {
        await moveNode({ id, parentId })
        await loadTree()
        pushToast("Moved.", { variant: "success" })
      } catch (error) {
        console.error(`[move] ${error.message}`)
        pushToast(
          error.response?.data?.message || "Could not move that item.",
          { variant: "error" },
        )
      }
    },
    [loadTree, pushToast],
  )

  const importFromLocal = useCallback(
    async (dataTransfer, parentId) => {
      pushToast("Reading files from your computer…", { variant: "info" })

      try {
        const entries = await readDroppedItems(dataTransfer)
        if (!entries.length) {
          pushToast("That drop did not contain any files.", { variant: "error" })
          return
        }

        const { files, skipped } = await buildImportPayload(entries)
        if (!files.length) {
          pushToast(`Nothing importable. ${describeSkipped(skipped)}`, { variant: "error" })
          return
        }

        const result = await importFiles({
          projectId,
          parentId: parentId ?? rootId,
          files,
        })
        await loadTree()

        const extra = describeSkipped(skipped)
        pushToast(
          `Imported ${result.created + result.updated} file${result.created + result.updated === 1 ? "" : "s"}${extra ? ` · skipped ${extra}` : ""}`,
          { variant: "success" },
        )
      } catch (error) {
        console.error(`[import] ${error.message}`)
        pushToast(
          error.response?.data?.message || "Could not import those files.",
          { variant: "error" },
        )
      }
    },
    [loadTree, projectId, pushToast, rootId],
  )

  const handleFormat = useCallback(() => {
    if (!activeTab) return

    const buffer = editor.buffers[activeTab.id]
    if (!buffer || buffer.status === "loading" || buffer.status === "error") return

    if (!canFormat(activeTab.name)) {
      pushToast("There is no formatter for this file type.", { variant: "info" })
      return
    }

    const formatted = formatCode(buffer.value, activeTab.name)
    if (formatted === buffer.value) {
      pushToast("Already tidy.", { variant: "info" })
      return
    }

    editor.updateValue(activeTab.id, formatted)
    pushToast("Formatted.", { variant: "success" })
  }, [activeTab, editor, pushToast])

  // Format-on-save applies to explicit saves; the background autosave stays
  // silent so typing never gets rewritten under the caret.
  const handleSave = useCallback(() => {
    if (!editor.activeId) return
    const buffer = editor.buffers[editor.activeId]
    const name = activeTab?.name ?? ""

    if (settings.formatOnSave && buffer && canFormat(name) && buffer.status !== "loading") {
      const formatted = formatCode(buffer.value, name)
      if (formatted !== buffer.value) {
        editor.updateValue(editor.activeId, formatted)
      }
    }

    requestAnimationFrame(() => editor.saveNow(editor.activeId))
  }, [activeTab, editor, settings.formatOnSave])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Editor-wide shortcuts. Registered once, on the window, so they work whether
  // focus is in the tree, the tabs, or the textarea.
  const { activeId, closeTab, reopenClosed } = editor
  useEffect(() => {
    const onKeyDown = (event) => {
      // Shift+Alt+F is the standard "format document" binding.
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault()
        handleFormat()
        return
      }

      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()

      // Never hijack the browser's own text shortcuts while editing a file.
      const target = event.target
      const editing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      if (editing && (key === "c" || key === "x" || key === "v")) return

      if (key === "p") {
        event.preventDefault()
        setQuickOpen(true)
      } else if (key === "s") {
        event.preventDefault()
        handleSave()
      } else if (key === "w") {
        if (!activeId) return
        event.preventDefault()
        closeTab(activeId)
      } else if (key === "t" && event.shiftKey) {
        event.preventDefault()
        if (!reopenClosed()) pushToast("No recently closed file to reopen.", { variant: "info" })
      } else if (key === "f" && event.shiftKey) {
        event.preventDefault()
        handleFormat()
      } else if (key === "c" && activeRow) {
        event.preventDefault()
        copyToClipboard(activeRow.node)
      } else if (key === "x" && activeRow) {
        event.preventDefault()
        cutToClipboard(activeRow.node)
      } else if (key === "v" && clipboard) {
        event.preventDefault()
        const targetFolder =
          activeRow?.node.type === "folder" ? activeRow.node._id : activeRow?.parentIds?.at(-1) ?? rootId
        pasteIntoFolder(targetFolder)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    activeId,
    activeRow,
    clipboard,
    closeTab,
    copyToClipboard,
    cutToClipboard,
    handleFormat,
    handleSave,
    pasteIntoFolder,
    pushToast,
    reopenClosed,
    rootId,
  ])

  const announceNotReady = useCallback(
    (label) => pushToast(`${label} is not ready yet.`, { variant: "info" }),
    [pushToast],
  )

  const projectName = currentProject?.name ?? ""

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-surface transition-colors duration-200 dark:bg-ink-950">
      <div className="pointer-events-none absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-brand-500/10 blur-[140px]" />
      <TopBar showPreview={showPreview} setShowPreview={setShowPreview} />

      <div className="relative flex flex-1 overflow-hidden">
        <ActivityBar
          showExplorer={showExplorer}
          showAiChat={false}
          showTerminal={false}
          setShowExplorer={setShowExplorer}
          setShowAiChat={() => announceNotReady("AI chat")}
          setShowTerminal={() => announceNotReady("Terminal")}
        />

        <AnimatePresence initial={false}>
          {showExplorer && (
            <Explorer
              key="explorer"
              projectId={projectId}
              projectName={projectName}
              tree={tree}
              treeError={treeError}
              loading={!loaded}
              reloadTree={loadTree}
              activeId={editor.activeId}
              revealIds={revealIds}
              revealTarget={revealTarget}
              onOpenFile={handleOpen}
              onReveal={revealById}
              onCopyNode={copyToClipboard}
              onCutNode={cutToClipboard}
              onPasteInto={(node) => pasteIntoFolder(node?._id)}
              onMoveNode={moveDragged}
              onDropFiles={importFromLocal}
              canPaste={Boolean(clipboard)}
              onCopyPath={async (node, mode) => {
                const row = rowById.get(node?._id)
                if (!row) return

                if (mode === "content") {
                  try {
                    const data = await getFile(node._id)
                    await copyText(data?.content ?? "", "File contents")
                  } catch (error) {
                    console.error(`[copy] ${error.message}`)
                    pushToast("Could not read that file.", { variant: "error" })
                  }
                  return
                }

                const parts = row.relPath.split("/")
                const value = mode === "full" ? row.relPath : parts.slice(1).join("/")
                copyText(value, mode === "full" ? "Path" : "Relative path")
              }}
              onClose={() => setShowExplorer(false)}
            />
          )}
        </AnimatePresence>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {editor.tabs.length > 0 && (
            <EditorTabs
              tabs={tabs}
              activeId={editor.activeId}
              dirtyIds={editor.dirtyIds}
              onActivate={editor.activate}
              onClose={editor.closeTab}
              onCloseOthers={editor.closeOthers}
              onCloseAll={editor.closeAll}
              onReorder={editor.moveTab}
              onCopyPath={(tab) => {
                const parts = (tab.relPath ?? "").split("/")
                copyText(parts.slice(1).join("/"), "Relative path")
              }}
              onReveal={(tab) => {
                const row = rowByPath.get(tab.relPath)
                if (row) revealRow(row)
              }}
            />
          )}

          {activeTab ? (
            <>
              <EditorHeader
                name={activeTab?.name ?? ""}
                segments={segments}
                saving={editor.activeBuffer?.status === "saving"}
                onSegmentClick={(segment) => revealById(segment.id)}
                onSave={handleSave}
                onCopyPath={() => copyText(relativePath.split("/").slice(1).join("/"), "Relative path")}
                onReveal={() => revealById(editor.activeId)}
                onFormat={handleFormat}
                canFormat={canFormat(activeTab?.name ?? "")}
              />

              <FileViewer
                file={activeRow?.node ?? { name: activeTab?.name ?? "", _id: activeTab?.id }}
                value={editor.activeBuffer?.value ?? ""}
                status={editor.activeBuffer?.status ?? "ready"}
                error={editor.activeBuffer?.error ?? ""}
                preview={showPreview}
                language={languageOf(activeTab?.name ?? "")}
                settings={settings}
                onSettingsChange={setSettings}
                saveStatus={editor.activeBuffer?.status ?? "saved"}
                onSave={handleSave}
                eol={eol}
                onChange={(value) => editor.updateValue(editor.activeId, value)}
              />
            </>
          ) : (
            <EditorWelcome
              recents={editor.recents}
              onQuickOpen={() => setQuickOpen(true)}
              onOpenExplorer={() => setShowExplorer(true)}
              onOpenRecent={handleOpenRecent}
              onClearRecents={editor.clearRecents}
            />
          )}
        </main>
      </div>

      <AnimatePresence>
        {quickOpen && (
          <QuickOpen
            key="quick-open"
            files={files}
            recents={editor.recents}
            onSelect={handleOpen}
            onClose={() => setQuickOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProjectView
