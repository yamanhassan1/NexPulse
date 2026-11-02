import { AnimatePresence } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import ActivityBar from "./ActivityBar"
import EditorHeader from "./EditorHeader"
import EditorTabs from "./EditorTabs"
import EditorWelcome from "./EditorWelcome"
import Explorer from "./Explorer"
import FileViewer from "./FileViewer"
import NewFromTemplate from "./NewFromTemplate"
import PreviewPanel from "./PreviewPanel"
import QuickOpen from "./QuickOpen"
import TopBar from "./TopBar"
import { getProjectById } from "../features/project"
import { getTree, getFile, copyNode, moveNode, importFiles, exportProject } from "../features/file"
import {
  buildImportPayload,
  describeSkipped,
  readDroppedItems,
} from "../utils/localFiles"
import { buildProjectEntries, createZip, suggestedFileName } from "../utils/zip"
import { setCurrentProject } from "../redux/projectSlice"
import { useFileTabs } from "../hooks/useFileTabs"
import { useToast } from "../hooks/toastContext"
import { flattenTree } from "../utils/fileTree"
import { languageOf } from "../utils/highlight"
import { canFormat, formatCode } from "../utils/formatCode"
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../utils/editorSettings"
import { previewKindFor } from "../utils/preview"
import { isEditableTarget, matchesShortcut } from "../utils/shortcuts"

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
  const [previewNonce, setPreviewNonce] = useState(0)
  const [tree, setTree] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [treeError, setTreeError] = useState("")
  const [quickOpen, setQuickOpen] = useState(false)
  const [revealIds, setRevealIds] = useState([])
  const [revealTarget, setRevealTarget] = useState(null)
  const [clipboard, setClipboard] = useState(null)
  const [settings, setSettings] = useState(loadSettings)
  const [exporting, setExporting] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateParentId, setTemplateParentId] = useState(null)

  const editor = useFileTabs({ projectId, pushToast })

  const rows = useMemo(() => flattenTree(tree), [tree])
  const files = useMemo(() => rows.filter((row) => row.node.type === "file"), [rows])
  const projectEntries = useMemo(
    () => rows.map((row) => ({ id: row.node._id, path: row.relPath, type: row.node.type })),
    [rows],
  )
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
  const previewKind = activeTab ? previewKindFor(activeTab.name) : null
  const previewVisible = Boolean(previewKind && showPreview)
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

  const openTemplates = useCallback(
    (parentId) => {
      setTemplateParentId(parentId ?? rootId)
      setTemplateOpen(true)
    },
    [rootId],
  )

  const handleTemplateCreated = useCallback(
    (entries) => {
      loadTree()
      if (entries[0]) editor.openFile(entries[0])
    },
    [editor, loadTree],
  )

  const handleOpenPath = useCallback(
    (targetPath) => {
      const row =
        rowByPath.get(targetPath) ??
        rows.find((entry) => entry.relPath.toLowerCase() === targetPath.toLowerCase())

      if (row?.node?.type === "file") {
        editor.openFile(row)
        return
      }

      pushToast(`Could not find ${targetPath} in this project.`, { variant: "error" })
    },
    [editor, pushToast, rowByPath, rows],
  )

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

  // Workspace shortcuts. CodeEditor owns text-editing commands; this layer owns
  // file, layout and preview commands so they work from the tree, tabs and
  // editor alike. The registry keeps advertised bindings in one place.
  const { activeId, closeTab, closeAll, reopenClosed } = editor
  const chordRef = useRef({ key: "", until: 0 })
  useEffect(() => {
    const onKeyDown = (event) => {
      if (matchesShortcut(event, "formatDocument")) {
        event.preventDefault()
        handleFormat()
        return
      }

      const meta = event.metaKey || event.ctrlKey
      if (!meta) return
      const key = event.key.toLowerCase()
      const editing = isEditableTarget(event.target)

      // Leave native copy/cut/paste alone while a text field has focus.
      if (editing && !event.shiftKey && !event.altKey && ["c", "x", "v"].includes(key)) return

      const chord = chordRef.current
      if (chord.key && Date.now() < chord.until) {
        chordRef.current = { key: "", until: 0 }
        if (chord.key === "k" && key === "w") {
          event.preventDefault()
          closeAll()
          return
        }
        if (chord.key === "k" && key === "v") {
          event.preventDefault()
          if (previewKind) setShowPreview(true)
          else pushToast("This file type has no preview.", { variant: "info" })
          return
        }
      }

      if (matchesShortcut(event, "closeAllTabs")) {
        event.preventDefault()
        closeAll()
        return
      }
      if (meta && key === "k" && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        chordRef.current = { key: "k", until: Date.now() + 1200 }
        return
      }

      if (matchesShortcut(event, "newFile")) {
        event.preventDefault()
        openTemplates(rootId)
      } else if (matchesShortcut(event, "quickOpen")) {
        event.preventDefault()
        setQuickOpen(true)
      } else if (matchesShortcut(event, "save")) {
        event.preventDefault()
        handleSave()
      } else if (matchesShortcut(event, "closeTab")) {
        if (!activeId) return
        event.preventDefault()
        closeTab(activeId)
      } else if (matchesShortcut(event, "reopenTab")) {
        event.preventDefault()
        if (!reopenClosed()) pushToast("No recently closed file to reopen.", { variant: "info" })
      } else if (matchesShortcut(event, "toggleSidebar")) {
        event.preventDefault()
        setShowExplorer((current) => !current)
      } else if (matchesShortcut(event, "focusExplorer")) {
        event.preventDefault()
        setShowExplorer(true)
      } else if (matchesShortcut(event, "openPreview")) {
        event.preventDefault()
        if (previewKind) setShowPreview(true)
        else pushToast("This file type has no preview.", { variant: "info" })
      } else if (matchesShortcut(event, "refreshPreview")) {
        event.preventDefault()
        setPreviewNonce((current) => current + 1)
      } else if (matchesShortcut(event, "fontIncrease")) {
        event.preventDefault()
        setSettings((current) => ({ ...current, fontSize: Math.min(24, current.fontSize + 1) }))
      } else if (matchesShortcut(event, "fontDecrease")) {
        event.preventDefault()
        setSettings((current) => ({ ...current, fontSize: Math.max(10, current.fontSize - 1) }))
      } else if (matchesShortcut(event, "fontReset")) {
        event.preventDefault()
        setSettings((current) => ({ ...current, fontSize: DEFAULT_SETTINGS.fontSize }))
      } else if (key === "c" && activeRow && !event.shiftKey) {
        event.preventDefault()
        copyToClipboard(activeRow.node)
      } else if (key === "x" && activeRow && !event.shiftKey) {
        event.preventDefault()
        cutToClipboard(activeRow.node)
      } else if (key === "v" && clipboard && !event.shiftKey) {
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
    closeAll,
    closeTab,
    copyToClipboard,
    cutToClipboard,
    handleFormat,
    handleSave,
    openTemplates,
    pasteIntoFolder,
    previewKind,
    pushToast,
    reopenClosed,
    rootId,
  ])

  const announceNotReady = useCallback(
    (label) => pushToast(`${label} is not ready yet.`, { variant: "info" }),
    [pushToast],
  )

  const projectName = currentProject?.name ?? ""

  const handleExport = useCallback(async () => {
    if (exporting) return
    setExporting(true)

    try {
      const payload = await exportProject(projectId)

      if (!payload?.files?.length) {
        pushToast("This project has no files to export yet.", { variant: "info" })
        return
      }

      const blob = createZip(buildProjectEntries(payload))
      const fileName = suggestedFileName(payload.project || projectName)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Give the browser a moment to start the download before releasing it.
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      pushToast(
        `Exported ${payload.files.length} file${payload.files.length === 1 ? "" : "s"} as ${fileName}.`,
        { variant: "success" },
      )
    } catch (error) {
      console.error(`[export] ${error.message}`)
      pushToast(
        error.response?.data?.message || "Could not export this project.",
        { variant: "error" },
      )
    } finally {
      setExporting(false)
    }
  }, [exporting, projectId, projectName, pushToast])

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-surface transition-colors duration-200 dark:bg-ink-950">
      <div className="pointer-events-none absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-brand-500/10 blur-[140px]" />
      <TopBar
        showPreview={previewVisible}
        setShowPreview={setShowPreview}
        canPreview={Boolean(previewKind)}
        onExport={handleExport}
        exporting={exporting}
      />

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
              onNewFromTemplate={(node) => openTemplates(node?._id)}
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
            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
                  language={languageOf(activeTab?.name ?? "")}
                  settings={settings}
                  onSettingsChange={setSettings}
                  saveStatus={editor.activeBuffer?.status ?? "saved"}
                  onSave={handleSave}
                  onNewFromTemplate={() => openTemplates(activeRow?.parentIds?.at(-1) ?? rootId)}
                  onOpenPath={handleOpenPath}
                  projectEntries={projectEntries}
                  filePath={relativePath}
                  eol={eol}
                  onChange={(value) => editor.updateValue(editor.activeId, value)}
                />
              </div>

              {previewVisible && (
                <PreviewPanel
                  key={`${activeTab?.id ?? ""}:${previewNonce}`}
                  file={activeRow?.node ?? { name: activeTab?.name ?? "" }}
                  value={editor.activeBuffer?.value ?? ""}
                  projectEntries={projectEntries}
                  filePath={relativePath}
                  buffers={editor.buffers}
                  onClose={() => setShowPreview(false)}
                />
              )}
            </div>
          ) : (
            <EditorWelcome
              recents={editor.recents}
              onQuickOpen={() => setQuickOpen(true)}
              onOpenExplorer={() => setShowExplorer(true)}
              onNewFromTemplate={() => openTemplates(rootId)}
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

      {templateOpen && (
        <NewFromTemplate
          projectId={projectId}
          tree={tree}
          rootId={rootId}
          defaultParentId={templateParentId}
          onClose={() => setTemplateOpen(false)}
          onCreated={handleTemplateCreated}
        />
      )}
    </div>
  )
}

export default ProjectView
