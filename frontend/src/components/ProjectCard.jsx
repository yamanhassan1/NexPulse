import { Star, Trash2 } from "lucide-react"
import { motion } from "motion/react"
import { deleteProject, toggleStar } from "../features/project"
import { useState } from "react"
import { useDispatch } from "react-redux"
import { setDeleteProject, starProject } from "../redux/projectSlice"

const ProjectCard = ({ project }) => {
    const [loadingStar, setLoadingStar] = useState(false)
    const [loadingDelete, setLoadingDelete] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [actionError, setActionError] = useState("")
    const dispatch = useDispatch()

    const handleToggleStar = async (e) => {
        e?.stopPropagation()
        if (loadingStar) return
        setLoadingStar(true)
        setActionError("")
        try {
            await toggleStar(project?._id)
            dispatch(starProject(project?._id))
        } catch (error) {
            console.error(`[toggleStar] ${error.message}`)
            setActionError("Could not update star.")
        } finally {
            setLoadingStar(false)
        }
    }

    const handleDelete = async (e) => {
        e?.stopPropagation()
        if (loadingDelete) return
        setLoadingDelete(true)
        setActionError("")
        try {
            await deleteProject(project?._id)
            dispatch(setDeleteProject(project?._id))
        } catch (error) {
            console.error(`[deleteProject] ${error.message}`)
            setActionError("Could not delete project.")
        } finally {
            setLoadingDelete(false)
            setConfirmDelete(false)
        }
    }

    return (
        <motion.div
            initial={{
                opacity: 0,
                y: 8
            }}
            animate={{
                opacity: 1,
                y: 0
            }}
            whileHover={{
                y: -2
            }}
            transition={{
                duration: 0.18,
                ease: [0.22, 1, 0.36, 1]
            }}
            className="group relative rounded-lg border border-[#E1E3EC] bg-white p-5 transition-colors duration-150 hover:border-[#D5D7E3] dark:border-[#343643] dark:bg-ink-850 dark:hover:border-[#4a4d5c]">
            <motion.button
                type="button"
                whileTap={{
                    scale: 0.9
                }}
                onClick={handleToggleStar}
                disabled={loadingStar}
                aria-label={project?.starred ? "Unstar project" : "Star project"}
                className={`absolute right-4 top-4 rounded-md p-1 transition-opacity hover:text-amber-400 ${project?.starred ? "opacity-100 text-amber-400" : "opacity-0 text-zinc-300 group-hover:opacity-100 focus:opacity-100 dark:text-zinc-600"} ${loadingStar ? "cursor-wait opacity-60" : ""}`}
            >
                <Star
                    size={15}
                    className={
                        project?.starred
                            ? "fill-amber-400 text-amber-400"
                            : ""
                    }
                />
            </motion.button>

            <h3 className="mb-1.5 truncate pr-6 text-[14px] font-medium text-[#20212A] dark:text-[#F5F3FA]">{project?.name}</h3>
            <p className="line-clamp-2 min-h-[2.5em] text-[13px] leading-relaxed text-[#55596B] dark:text-[#B5B6C5]">{project?.description || "No description"}</p>
            {actionError && (
                <p role="alert" className="mt-2 text-[11px] text-red-500">{actionError}</p>
            )}

            <div className="mt-4 flex items-center justify-end border-t border-black/5 pt-3 dark:border-white/10">
                {confirmDelete ? (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                            className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={loadingDelete}
                            onClick={handleDelete}
                            className="rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50 dark:text-red-400"
                        >
                            Yes
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        aria-label="Delete project"
                        onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(true)
                        }}
                        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 focus:opacity-100 dark:text-zinc-600 dark:hover:text-red-400"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        </motion.div>
    )
}

export default ProjectCard
