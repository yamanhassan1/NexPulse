import { X } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react";
import { createProject } from "../features/project";
import { useDispatch } from "react-redux";
import { addNewProject } from "../redux/projectSlice";
import { useToast } from "../hooks/toastContext";

const FOCUSABLE =
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function CreateProjectModel({ openModel, onClose }) {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const dispatch = useDispatch()
    const { pushToast } = useToast()
    const dialogRef = useRef(null)
    const previousFocusRef = useRef(null)
    const nameInputRef = useRef(null)
    const onCloseRef = useRef(onClose)

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        if (!openModel) return
        const dialog = dialogRef.current
        previousFocusRef.current = document.activeElement
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        nameInputRef.current?.focus()

        const handleTab = (event) => {
            if (event.key !== "Tab" || !dialog) return
            const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE))
            if (!focusable.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener("keydown", handleTab)
        return () => {
            document.removeEventListener("keydown", handleTab)
            document.body.style.overflow = originalOverflow
            previousFocusRef.current?.focus?.()
        }
    }, [openModel])

    useEffect(() => {
        if (!openModel) return
        const onKeyDown = (event) => {
            if (event.key === "Escape" && !loading) onCloseRef.current()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [openModel, loading])

    const handleCreateProject = async (event) => {
        event.preventDefault()
        if (!name.trim() || loading) return
        setLoading(true)
        setError("")
        try {
            const data = await createProject({ name: name.trim(), description: description.trim() })
            dispatch(addNewProject(data))
            pushToast("Project created.", { variant: "success" })
            setName("")
            setDescription("")
            onClose()
        } catch (err) {
            console.error(`[createProject] ${err.message}`)
            setError(err.response?.data?.message || "Could not create the project.")
        } finally {
            setLoading(false)
        }
    }

    if (!openModel) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
            <motion.div
                onClick={() => !loading && onClose()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/60"
            />

            <motion.form
                ref={dialogRef}
                onSubmit={handleCreateProject}
                initial={{
                    opacity: 0,
                    y: 12,
                    scale: 0.98
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1
                }}
                transition={{
                    duration: 0.32,
                    ease: [0.22, 1, 0.36, 1]
                }}
                className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-line bg-panel/95 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.3)] backdrop-blur-2xl dark:border-line-dark dark:bg-ink-850/95 dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
            >
                <div className="flex items-center justify-between border-b border-line px-7 py-6 dark:border-line-dark">
                    <div>
                        <h2 id="create-project-title" className="text-[17px] font-semibold tracking-tight text-graphite dark:text-mist">Create Project</h2>
                        <p className="text-xs text-subtle dark:text-faint">Set up a new workspace in seconds</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} className="rounded-lg p-2 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-6 px-7 py-6">
                    <div>
                        <label htmlFor="project-name" className="mb-2 block text-xs font-medium uppercase tracking-wide text-subtle dark:text-faint">Project Name</label>
                        <input
                            id="project-name"
                            ref={nameInputRef}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Project"
                            maxLength={120}
                            className="w-full rounded-xl border border-line bg-hover px-4 py-3 text-[15px] text-graphite placeholder-subtle outline-none transition-all focus:border-brand-400/60 focus:bg-panel focus:ring-4 focus:ring-brand-400/15 dark:border-line-dark dark:bg-ink-800 dark:text-mist dark:placeholder-faint dark:focus:bg-ink-800 dark:focus:ring-brand-400/10"
                        />
                    </div>

                    <div>
                        <label htmlFor="project-description" className="mb-2 block text-xs font-medium uppercase tracking-wide text-subtle dark:text-faint">Description</label>
                        <textarea
                            id="project-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="What is the project about?"
                            className="w-full rounded-xl border border-line bg-hover px-4 py-3 text-[15px] text-graphite placeholder-subtle outline-none transition-all focus:border-brand-400/60 focus:bg-panel focus:ring-4 focus:ring-brand-400/15 dark:border-line-dark dark:bg-ink-800 dark:text-mist dark:placeholder-faint dark:focus:bg-ink-800 dark:focus:ring-brand-400/10"
                        />
                    </div>
                    {error && (
                        <p role="alert" className="text-sm text-red-500 dark:text-red-400">{error}</p>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-line px-7 py-5 dark:border-line-dark">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl border border-line bg-hover px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-panel hover:text-graphite dark:border-line-dark dark:bg-ink-800 dark:text-mist-muted dark:hover:bg-ink-700 dark:hover:text-mist">
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {loading ? "Creating..." : "Create Project"}
                    </button>
                </div>
            </motion.form>
        </div>
    )
}

export default CreateProjectModel
