import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import {
  createProject,
  deleteProject,
  getProjects,
  getStarredProjects,
} from '../features/project'
import { importFiles } from '../features/file'
import {
  buildImportPayload,
  describeSkipped,
  readFileList,
  rootFolderName,
} from '../utils/localFiles'
import { useToast } from '../hooks/toastContext'
import {
  addNewProject,
  setLoadingProjects,
  setLoadingStarred,
  setProjects,
  setProjectsError,
  setStarredProjects,
  setStarredError,
} from '../redux/projectSlice'
import CreateProjectModel from '../components/CreateProjectModel'
import DashboardHeader from '../components/DashboardHeader'
import DashboardWatermark from '../components/DashboardWatermark'
import ProjectsSection from '../components/ProjectsSection'

function Dashboard() {
  const [openModel, setOpenModel] = useState(false)
  const [activeSession, setActiveSession] = useState('projects')
  const [searchQuery, setSearchQuery] = useState('')
  const inFlight = useRef({ projects: false, starred: false })
  const folderInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const { userData } = useSelector((state) => state.user)
  const {
    projects,
    starredProjects,
    projectsLoaded,
    starredLoaded,
    loadingProjects,
    loadingStarred,
    projectsError,
    starredError,
  } = useSelector((state) => state.project)

  const loadProjects = useCallback(
    async (session, { force = false } = {}) => {
      const isProjects = session === 'projects'
      if (!force && (isProjects ? projectsLoaded : starredLoaded)) return
      if (inFlight.current[session]) return

      inFlight.current[session] = true
      if (isProjects) {
        dispatch(setLoadingProjects(true))
      } else {
        dispatch(setLoadingStarred(true))
      }

      try {
        const data = isProjects ? await getProjects() : await getStarredProjects()
        if (isProjects) {
          dispatch(setProjects(data))
        } else {
          dispatch(setStarredProjects(data))
        }
      } catch (error) {
        console.error(`[${session}] ${error.message}`)
        if (isProjects) {
          dispatch(setProjectsError('Could not load projects.'))
        } else {
          dispatch(setStarredError('Could not load starred projects.'))
        }
      } finally {
        inFlight.current[session] = false
      }
    },
    [dispatch, projectsLoaded, starredLoaded],
  )

  useEffect(() => {
    if (!userData) return
    loadProjects(activeSession)
  }, [activeSession, userData, loadProjects])

  const openCreateModel = useCallback(() => setOpenModel(true), [])
  const closeCreateModel = useCallback(() => setOpenModel(false), [])
  const handleRetry = useCallback(
    () => loadProjects(activeSession, { force: true }),
    [activeSession, loadProjects],
  )

  const handleImportFolder = useCallback(
    async (event) => {
      // Copy the selection before clearing the input: some browsers empty the
      // live FileList as soon as `value` is reset.
      const picked = Array.from(event.target.files ?? [])
      event.target.value = ''
      if (!picked.length) return

      const entries = readFileList(picked)
      const name = rootFolderName(entries) || 'Imported project'

      setImporting(true)
      let project = null
      try {
        const { files, skipped } = await buildImportPayload(entries, { stripRoot: true })
        if (!files.length) {
          pushToast(
            `Nothing importable in that folder. ${describeSkipped(skipped)}`,
            { variant: 'error' },
          )
          return
        }

        project = await createProject({ name, description: 'Imported from a local folder' })
        const result = await importFiles({ projectId: project._id, files })

        dispatch(addNewProject(project))
        const extra = describeSkipped(skipped)
        pushToast(
          `Imported ${result.created + result.updated} files into “${name}”${extra ? ` · skipped ${extra}` : ''}`,
          { variant: 'success' },
        )
        navigate(`/project/${project._id}`)
      } catch (error) {
        console.error(`[import] ${error.message}`)
        pushToast(
          error.response?.data?.message || 'Could not import that folder.',
          { variant: 'error' },
        )
        if (project?._id) deleteProject(project._id).catch(() => {})
      } finally {
        setImporting(false)
      }
    },
    [dispatch, navigate, pushToast],
  )

  const visibleProjects =
    activeSession === 'starred' ? starredProjects : projects
  const loading = activeSession === 'starred' ? loadingStarred : loadingProjects
  const error = activeSession === 'starred' ? starredError : projectsError

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return visibleProjects
    return visibleProjects.filter((project) =>
      `${project?.name || ''} ${project?.description || ''}`
        .toLowerCase()
        .includes(query),
    )
  }, [searchQuery, visibleProjects])

  const totalCount = visibleProjects.length

  return (
    <div className='relative flex h-screen w-full flex-col overflow-hidden bg-surface transition-colors duration-200 dark:bg-ink-950'>
      <div className='relative flex min-h-0 flex-1 flex-col'>
        <UserNavbar />
        <div className='flex min-h-0 flex-1'>
          <Sidebar activeSession={activeSession} setActiveSession={setActiveSession} />
          <div className='relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8'>
            <DashboardWatermark />
            <DashboardHeader
              userData={userData}
              onCreateProject={openCreateModel}
              onImportFolder={() => folderInputRef.current?.click()}
              importing={importing}
            />

            <input
              ref={folderInputRef}
              type='file'
              webkitdirectory=''
              directory=''
              multiple
              className='hidden'
              aria-hidden='true'
              tabIndex={-1}
              onChange={handleImportFolder}
            />
            <ProjectsSection
              activeSession={activeSession}
              setActiveSession={setActiveSession}
              loadingProjects={loading}
              projectError={error}
              visibleProjects={filteredProjects}
              totalProjects={totalCount}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onCreateProject={openCreateModel}
              onRetry={handleRetry}
            />
          </div>
        </div>
      </div>
      {openModel && (
        <CreateProjectModel openModel={openModel} onClose={closeCreateModel} />
      )}
    </div>
  )
}

export default Dashboard
