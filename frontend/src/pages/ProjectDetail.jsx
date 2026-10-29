import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { ArrowLeft, Loader2, Star, Trash2 } from 'lucide-react'
import UserNavbar from '../components/UserNavbar'
import { deleteProject, getProjectById, toggleStar } from '../features/project'
import { setDeleteProject, setProjectStarred } from '../redux/projectSlice'
import { useToast } from '../hooks/toastContext'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { pushToast } = useToast()
  const [project, setProject] = useState(null)
  const [loadedId, setLoadedId] = useState(null)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [loadingStar, setLoadingStar] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const loading = loadedId !== id

  useEffect(() => {
    let cancelled = false

    getProjectById(id)
      .then((data) => {
        if (cancelled) return
        setProject(data)
        setError('')
        setNotFound(false)
      })
      .catch((err) => {
        if (cancelled) return
        if (err.response?.status === 404) {
          setNotFound(true)
        } else {
          console.error(`[project] ${err.message}`)
          setError('Could not load this project.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedId(id)
      })

    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  const handleRetry = () => {
    setLoadedId(null)
    setReloadKey((key) => key + 1)
  }

  const handleToggleStar = useCallback(async () => {
    if (!project || loadingStar) return
    const wasStarred = Boolean(project.starred)
    setLoadingStar(true)
    setProject((current) =>
      current ? { ...current, starred: !wasStarred } : current,
    )
    dispatch(setProjectStarred({ id, starred: !wasStarred }))

    try {
      const data = await toggleStar(id)
      const starred = Boolean(data?.starred)
      setProject((current) => (current ? { ...current, starred } : current))
      dispatch(setProjectStarred({ id, starred }))
    } catch (err) {
      console.error(`[toggleStar] ${err.message}`)
      setProject((current) =>
        current ? { ...current, starred: wasStarred } : current,
      )
      dispatch(setProjectStarred({ id, starred: wasStarred }))
      pushToast('Could not update star. Please try again.', {
        variant: 'error',
      })
    } finally {
      setLoadingStar(false)
    }
  }, [dispatch, id, loadingStar, project, pushToast])

  const handleDelete = async () => {
    if (loadingDelete) return
    setLoadingDelete(true)
    try {
      await deleteProject(id)
      dispatch(setDeleteProject(id))
      pushToast('Project deleted.', { variant: 'success' })
      navigate('/', { replace: true })
    } catch (err) {
      console.error(`[deleteProject] ${err.message}`)
      pushToast('Could not delete project. Please try again.', {
        variant: 'error',
      })
      setLoadingDelete(false)
      setConfirmDelete(false)
    }
  }

  let content

  if (loading) {
    content = (
      <div className='flex min-h-64 items-center justify-center'>
        <Loader2
          className='animate-spin text-subtle dark:text-faint'
          aria-label='Loading project'
        />
      </div>
    )
  } else if (notFound) {
    content = (
      <div className='rounded-lg border border-line bg-panel px-6 py-12 text-center dark:border-line-dark dark:bg-ink-850'>
        <h1 className='text-xl font-semibold text-graphite dark:text-mist'>
          Project not found
        </h1>
        <p className='mt-2 text-sm text-muted dark:text-mist-muted'>
          It may have been deleted or you may not have access to it.
        </p>
        <Link
          to='/'
          className='mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>
      </div>
    )
  } else if (error) {
    content = (
      <div className='rounded-lg border border-red-500/40 bg-red-500/10 px-6 py-10 text-center text-red-500 dark:border-red-400/30 dark:text-red-400'>
        <p className='text-sm'>{error}</p>
        <button
          type='button'
          onClick={handleRetry}
          className='mt-4 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60'
        >
          Try again
        </button>
      </div>
    )
  } else if (project) {
    content = (
      <>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <p className='text-[12px] font-medium uppercase tracking-wide text-faint'>
              Project
            </p>
            <h1 className='mt-1 truncate text-[28px] font-semibold tracking-tight text-graphite dark:text-mist'>
              {project.name}
            </h1>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <button
              type='button'
              onClick={handleToggleStar}
              disabled={loadingStar}
              aria-pressed={Boolean(project.starred)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-wait disabled:opacity-60 ${project.starred ? 'border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400' : 'border-line text-muted hover:bg-hover dark:border-line-dark dark:text-mist-muted dark:hover:bg-ink-800'}`}
            >
              <Star
                size={15}
                className={project.starred ? 'fill-amber-400 text-amber-400' : ''}
              />
              {project.starred ? 'Starred' : 'Star'}
            </button>
            {confirmDelete ? (
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setConfirmDelete(false)}
                  className='rounded-lg px-3 py-2 text-[13px] text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleDelete}
                  disabled={loadingDelete}
                  className='rounded-lg bg-red-500/10 px-3 py-2 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60 dark:text-red-400'
                >
                  {loadingDelete ? 'Deleting...' : 'Confirm delete'}
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => setConfirmDelete(true)}
                className='flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:border-red-400/50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 dark:border-line-dark dark:text-mist-muted dark:hover:text-red-400'
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className='mt-6 grid gap-4 lg:grid-cols-3'>
          <div className='rounded-lg border border-line bg-panel p-6 lg:col-span-2 dark:border-line-dark dark:bg-ink-850'>
            <h2 className='text-[12px] font-medium uppercase tracking-wide text-faint'>
              Description
            </h2>
            <p className='mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-muted dark:text-mist-muted'>
              {project.description || 'No description yet.'}
            </p>
          </div>
          <div className='rounded-lg border border-line bg-panel p-6 dark:border-line-dark dark:bg-ink-850'>
            <h2 className='text-[12px] font-medium uppercase tracking-wide text-faint'>
              Details
            </h2>
            <dl className='mt-3 space-y-3 text-[13px]'>
              <div className='flex items-center justify-between gap-3'>
                <dt className='text-subtle dark:text-faint'>Created</dt>
                <dd className='text-graphite dark:text-mist'>
                  {formatDate(project.createdAt)}
                </dd>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <dt className='text-subtle dark:text-faint'>Updated</dt>
                <dd className='text-graphite dark:text-mist'>
                  {formatDate(project.updatedAt)}
                </dd>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <dt className='text-subtle dark:text-faint'>Last opened</dt>
                <dd className='text-graphite dark:text-mist'>
                  {formatDate(project.lastOpenedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className='relative flex min-h-dvh w-full flex-col bg-surface transition-colors duration-200 dark:bg-ink-950'>
      <UserNavbar />
      <main className='mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8'>
        <Link
          to='/'
          className='mb-6 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-subtle transition-colors hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:text-faint dark:hover:text-mist'
        >
          <ArrowLeft size={15} />
          Back to projects
        </Link>
        {content}
      </main>
    </div>
  )
}

export default ProjectDetail
