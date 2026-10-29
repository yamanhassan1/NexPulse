import { Star, Trash2 } from "lucide-react"
import { motion } from "motion/react"
import { deleteProject, toggleStar } from "../features/project"
import { useState } from "react"
import { useDispatch } from "react-redux"
import { Link, useNavigate } from "react-router-dom"
import { setDeleteProject, setProjectStarred } from "../redux/projectSlice"
import { useToast } from "../hooks/toastContext"

const ProjectCard = ({ project }) => {
    const [loadingStar, setLoadingStar] = useState(false)
    const [loadingDelete, setLoadingDelete] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { pushToast } = useToast()
    const projectId = project?._id
    const projectPath = `/project/${projectId}`

    const handleToggleStar = async (e) => {
        e?.stopPropagation()
        if (loadingStar) return
        const wasStarred = Boolean(project?.starred)
        setLoadingStar(true)
        dispatch(setProjectStarred({ id: projectId, starred: !wasStarred }))
        try {
            const data = await toggleStar(projectId)
            dispatch(setProjectStarred({ id: projectId, starred: Boolean(data?.starred) }))
        } catch (error) {
            console.error(`[toggleStar] ${error.message}`)
            dispatch(setProjectStarred({ id: projectId, starred: wasStarred }))
            pushToast("Could not update star. Please try again.", { variant: "error" })
        } finally {
            setLoadingStar(false)
        }
    }

    const handleDelete = async (e) => {
        e?.stopPropagation()
        if (loadingDelete) return
        setLoadingDelete(true)
        try {
            await deleteProject(projectId)
            dispatch(setDeleteProject(projectId))
            pushToast("Project deleted.", { variant: "success" })
        } catch (error) {
            console.error(`[deleteProject] ${error.message}`)
            pushToast("Could not delete project. Please try again.", { variant: "error" })
        } finally {
            setLoadingDelete(false)
            setConfirmDelete(false)
        }
    }

    const handleCardClick = (event) => {
        if (event.target.closest("button, a")) return
        navigate(projectPath)
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
            onClick={handleCardClick}
            className="group relative cursor-pointer rounded-lg border border-line bg-panel p-5 transition-colors duration-150 hover:border-line-strong dark:border-line-dark dark:bg-ink-850 dark:hover:border-line-dark">
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

            <h3 className="mb-1.5 truncate pr-6 text-[14px] font-medium text-graphite dark:text-mist">
                <Link
                    to={projectPath}
                    className='rounded-sm transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:hover:text-brand-300'
                >
                    {project?.name}
                </Link>
            </h3>
            <p className="line-clamp-2 min-h-[2.5em] text-[13px] leading-relaxed text-muted dark:text-mist-muted">{project?.description || "No description"}</p>

            <div className="mt-4 flex items-center justify-end border-t border-line pt-3 dark:border-line-dark">
                {confirmDelete ? (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                            className="rounded-md px-2 py-1 text-[11px] text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={loadingDelete}
                            onClick={handleDelete}
                            className="rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50 dark:text-red-400"
                        >
                            {loadingDelete ? "Deleting..." : "Yes"}
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
