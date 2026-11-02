import { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link, useParams } from "react-router-dom"
import { Check, Code2, Download, Eye, Pencil, X } from "lucide-react"
import Logo from "./Logo"
import ThemeToggle from "./ThemeToggle"
import MaterialFolderIcon from "./MaterialFolderIcon"
import { renameProject } from "../features/project"
import { setProjectName } from "../redux/projectSlice"
import { useToast } from "../hooks/toastContext"
import { shortcutLabel } from "../utils/shortcuts"

function TopBar({ showPreview, setShowPreview, canPreview = false, onExport, exporting = false }) {
    const { currentProject } = useSelector((state) => state.project)
    const { id } = useParams()
    const dispatch = useDispatch()
    const { pushToast } = useToast()

    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState("")
    const [saving, setSaving] = useState(false)
    const inputRef = useRef(null)

    const projectId = currentProject?._id ?? id
    const name = currentProject?.name || "Untitled project"

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [editing])

    const startEditing = () => {
        setDraft(currentProject?.name || "")
        setEditing(true)
    }

    const cancelEditing = () => {
        setEditing(false)
        setDraft("")
    }

    const commitRename = async () => {
        const nextName = draft.trim()
        if (saving) return

        if (!nextName || nextName === currentProject?.name) {
            cancelEditing()
            return
        }

        setSaving(true)
        try {
            const updated = await renameProject(projectId, nextName)
            const resolved = updated?.name || nextName
            dispatch(setProjectName({ id: projectId, name: resolved }))
            pushToast("Project renamed.", { variant: "success" })
            cancelEditing()
        } catch (error) {
            console.error(`[renameProject] ${error.message}`)
            pushToast(
                error.response?.data?.message || "Could not rename this project.",
                { variant: "error" },
            )
        } finally {
            setSaving(false)
        }
    }

    const onRenameKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault()
            commitRename()
        } else if (event.key === "Escape") {
            event.preventDefault()
            cancelEditing()
        }
    }

    return (
        <div className="relative flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-panel/80 px-3 backdrop-blur-xl transition-colors duration-200 sm:px-4 dark:border-line-dark dark:bg-ink-900/80">
            <div className="flex min-w-0 items-center gap-3">
                <Link
                    to="/"
                    title="Back to your projects"
                    className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:hover:bg-ink-800"
                >
                    <Logo className="h-6 w-6" />
                    <span className="hidden text-[15px] font-semibold tracking-tight text-graphite sm:block dark:text-mist">
                        NexPulse
                    </span>
                </Link>

                <span className="h-5 w-px shrink-0 bg-line dark:bg-line-dark" />

                {editing ? (
                    <div className="flex min-w-0 items-center gap-1 rounded-lg border border-brand-400/50 bg-panel px-2 py-1 ring-2 ring-brand-400/15 dark:border-brand-400/40 dark:bg-ink-850">
                        <MaterialFolderIcon name={draft} size={15} className="shrink-0" />
                        <input
                            ref={inputRef}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={onRenameKeyDown}
                            maxLength={120}
                            disabled={saving}
                            aria-label="Project name"
                            className="w-40 min-w-0 bg-transparent text-[13px] font-medium text-graphite outline-none placeholder-subtle dark:text-mist dark:placeholder-faint"
                        />
                        <button
                            type="button"
                            onClick={commitRename}
                            disabled={saving}
                            aria-label="Save name"
                            className="rounded p-1 text-brand-600 transition-colors hover:bg-brand-500/10 disabled:opacity-50 dark:text-brand-400"
                        >
                            <Check size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={saving}
                            aria-label="Cancel rename"
                            className="rounded p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite disabled:opacity-50 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
                        >
                            <X size={13} />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={startEditing}
                        title="Rename project"
                        className="group flex min-w-0 items-center gap-2 rounded-lg bg-hover/70 px-2 py-1.5 transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:bg-ink-800/70 dark:hover:bg-ink-800"
                    >
                        <MaterialFolderIcon name={name} size={15} className="shrink-0" />
                        <span className="truncate text-[13px] font-medium text-graphite dark:text-mist">
                            {name}
                        </span>
                        <Pencil
                            size={11}
                            className="shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-faint"
                        />
                    </button>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <button
                    type="button"
                    onClick={onExport}
                    disabled={exporting}
                    title="Export project as a .zip"
                    aria-label="Export project as a zip file"
                    className="rounded-lg p-2 text-subtle transition-colors hover:bg-hover hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-wait disabled:opacity-50 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
                >
                    <Download size={16} className={exporting ? "animate-pulse" : undefined} />
                </button>

                <ThemeToggle />

                {canPreview && (
                    <>
                        <span className="mx-1 h-5 w-px bg-line dark:bg-line-dark" />

                        <div
                            role="group"
                            aria-label="Editor or preview"
                            className="flex items-center gap-0.5 rounded-lg bg-hover/70 p-0.5 dark:bg-ink-800/70"
                        >
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                aria-pressed={!showPreview}
                                title="Editor"
                                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${!showPreview ? "bg-panel text-graphite shadow-sm dark:bg-ink-700 dark:text-mist" : "text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"}`}
                            >
                                <Code2 size={13} />
                                Editor
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                aria-pressed={showPreview}
                                title={`Preview (${shortcutLabel("openPreview")})`}
                                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${showPreview ? "bg-panel text-graphite shadow-sm dark:bg-ink-700 dark:text-mist" : "text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"}`}
                            >
                                <Eye size={13} />
                                Preview
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default TopBar
