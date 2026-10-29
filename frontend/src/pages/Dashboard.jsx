import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import { getProjects, getStarredProjects } from '../features/project'
import {
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
  const inFlight = useRef({ projects: false, starred: false })
  const dispatch = useDispatch()
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

  const visibleProjects =
    activeSession === 'starred' ? starredProjects : projects
  const loading = activeSession === 'starred' ? loadingStarred : loadingProjects
  const error = activeSession === 'starred' ? starredError : projectsError

  return (
    <div className='relative flex h-screen w-full flex-col overflow-hidden bg-surface transition-colors duration-200 dark:bg-ink-950'>
      <div className='relative flex min-h-0 flex-1 flex-col'>
        <UserNavbar />
        <div className='flex min-h-0 flex-1'>
          <Sidebar activeSession={activeSession} setActiveSession={setActiveSession} />
          <div className='relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8'>
            <DashboardWatermark />
            <DashboardHeader userData={userData} onCreateProject={openCreateModel} />
            <ProjectsSection
              activeSession={activeSession}
              setActiveSession={setActiveSession}
              loadingProjects={loading}
              projectError={error}
              visibleProjects={visibleProjects}
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
