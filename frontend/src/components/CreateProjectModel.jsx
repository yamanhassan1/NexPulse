import { X } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react";
import { createProject } from "../features/project";
import { useDispatch } from "react-redux";
import { addNewProject } from "../redux/projectSlice";

function CreateProjectModel({ openModel, onClose }) {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const dispatch = useDispatch()

    useEffect(() => {
        if (!openModel) return
        const onKeyDown = (event) => {
            if (event.key === "Escape" && !loading) onClose()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [openModel, loading, onClose])

    const handleCreateProject = async (event) => {
        event.preventDefault()
        if (!name.trim() || loading) return
        setLoading(true)
        setError("")
        try {
            const data = await createProject({ name: name.trim(), description: description.trim() })
            dispatch(addNewProject(data))
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
                className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-black/10 bg-white/90 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.3)] backdrop-blur-2xl dark:border-white/10 dark:bg-ink-850/95 dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
            >
                <div className="flex items-center justify-between border-b border-black/6 px-7 py-6 dark:border-white/10">
                    <div>
                        <h2 id="create-project-title" className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-white">Create Project</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Set up a new workspace in seconds</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={loading} className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-6 px-7 py-6">
                    <div>
                        <label htmlFor="project-name" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Project Name</label>
                        <input
                            id="project-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Project"
                            autoFocus
                            maxLength={120}
                            className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-3 text-[15px] text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-brand-400/60 focus:bg-white focus:ring-4 focus:ring-brand-400/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-white/10 dark:focus:ring-brand-400/10"
                        />
                    </div>

                    <div>
                        <label htmlFor="project-description" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Description</label>
                        <textarea
                            id="project-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="What is the project about?"
                            className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-3 text-[15px] text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-brand-400/60 focus:bg-white focus:ring-4 focus:ring-brand-400/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-white/10 dark:focus:ring-brand-400/10"
                        />
                    </div>
                    {error && (
                        <p role="alert" className="text-sm text-red-500 dark:text-red-400">{error}</p>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-black/6 px-7 py-5 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl border border-black/10 bg-black/5 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/5 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white">
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:opacity-90 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-zinc-100"
                    >
                        {loading ? "Creating..." : "Create Project"}
                    </button>
                </div>
            </motion.form>
        </div>
    )
}

export default CreateProjectModel
