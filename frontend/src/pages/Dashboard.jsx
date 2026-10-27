import { useEffect, useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../firebase'
import { login } from '../features/login'
import Background from '../components/Background'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import CodeWindow from '../components/CodeWindow'
import Footer from '../components/Footer'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import { Folder, Loader2, Plus } from 'lucide-react'
import { getProjects, getStarredProjects } from '../features/project'
import { setProjects, setStarredProjects } from '../redux/projectSlice'
import ProjectCard from '../components/ProjectCard'
import CreateProjectModel from '../components/CreateProjectModel'

function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectError, setProjectError] = useState('')
  const [openModel, setOpenModel] = useState(false)
  const [activeSession, setActiveSession] = useState('projects')
  const dispatch = useDispatch()
  const { userData, authChecked } = useSelector((state) => state.user)
  const { projects, starredProjects } = useSelector((state) => state.project)

  const handleLogin = async () => {
    setLoading(true)
    setLoginError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const token = await result.user.getIdToken()
      const data = await login(token)
      dispatch(setUserData(data))
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        return
      }
      console.error(`[login] ${error.message}`)
      setLoginError('Sign-in failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userData) return
    let cancelled = false
    const fetchAll = async () => {
      setLoadingProjects(true)
      setProjectError('')
      try {
        const data = await getProjects()
        if (cancelled) return
        dispatch(setProjects(Array.isArray(data) ? data : []))
      } catch (error) {
        if (cancelled) return
        console.error(`[projects] ${error.message}`)
        dispatch(setProjects([]))
        setProjectError('Could not load projects.')
      } finally {
        if (!cancelled) setLoadingProjects(false)
      }
    }
    const fetchStarred = async () => {
      setLoadingProjects(true)
      setProjectError('')
      try {
        const data = await getStarredProjects()
        if (cancelled) return
        dispatch(setStarredProjects(Array.isArray(data) ? data : []))
      } catch (error) {
        if (cancelled) return
        console.error(`[starred] ${error.message}`)
        dispatch(setStarredProjects([]))
        setProjectError('Could not load starred projects.')
      } finally {
        if (!cancelled) setLoadingProjects(false)
      }
    }
    if (activeSession === 'projects') {
      fetchAll()
    } else {
      fetchStarred()
    }
    return () => {
      cancelled = true
    }
  }, [activeSession, userData, dispatch])

  if (!authChecked) {
    return (
      <div className='flex min-h-dvh items-center justify-center bg-ink-950 text-slate-300'>
        <Loader2 className='animate-spin' aria-label='Checking session' />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className='relative min-h-dvh w-full overflow-hidden bg-ink-950 text-slate-200'>
        <Background />
        <Navbar onSignIn={handleLogin} loading={loading} />
        <main className='relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 py-10 lg:grid-cols-2 lg:gap-10 lg:py-16'>
          <div>
            <Hero onSignIn={handleLogin} loading={loading} />
            {loginError && (
              <p role='alert' className='relative z-10 mt-4 max-w-sm text-sm text-red-400'>
                {loginError}
              </p>
            )}
          </div>
          <section className='animate-rise [animation-delay:120ms]'>
            <CodeWindow />
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  const visibleProjects = activeSession === 'starred' ? starredProjects || [] : projects || []

  return (
    <div className='relative flex h-screen w-full flex-col overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-[#07070c]'>
      <div className='pointer-events-none absolute -top-40 left-1/3 hidden h-[44rem] w-[44rem] rounded-full bg-white/4 blur-[140px] dark:block' />
      <div className='pointer-events-none absolute top-1/3 right-0 hidden h-[32rem] w-[32rem] rounded-full bg-white/3 blur-[130px] dark:block' />
      <div className='relative flex min-h-0 flex-1 flex-col'>
        <UserNavbar />
        <div className='flex min-h-0 flex-1'>
          <Sidebar activeSession={activeSession} setActiveSession={setActiveSession} />
          <div className='min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8'>
            <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <h1 className='flex items-center gap-2 text-[26px] font-bold text-slate-900 dark:text-white'>
                  Welcome Back, {(userData?.name || 'User').split(' ')[0]} <span>👋</span>
                </h1>
                <p className='mt-1 text-[13.5px] text-slate-500 dark:text-slate-400'>Ready to build something amazing today?</p>
              </div>
              <button
                type='button'
                onClick={() => setOpenModel(true)}
                className='flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-opacity duration-150 hover:opacity-90 dark:bg-white dark:text-slate-900'
              >
                <Plus size={16} />
                New Project
              </button>
            </div>

            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <h2 className='text-[16px] font-semibold text-slate-900 dark:text-white'>
                {activeSession === 'starred' ? 'Starred Projects' : 'Recent Projects'}
              </h2>
              <div className='flex gap-2 sm:hidden'>
                <button
                  type='button'
                  onClick={() => setActiveSession('projects')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeSession === 'projects' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'}`}
                >
                  Projects
                </button>
                <button
                  type='button'
                  onClick={() => setActiveSession('starred')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeSession === 'starred' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'}`}
                >
                  Starred
                </button>
              </div>
            </div>

            {loadingProjects ? (
              <div className='flex min-h-[18rem] items-center justify-center'>
                <Loader2 className='animate-spin text-slate-400 dark:text-slate-500' aria-label='Loading projects' />
              </div>
            ) : projectError ? (
              <div className='mb-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'>
                {projectError}
              </div>
            ) : visibleProjects.length === 0 ? (
              <div className='mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/40 py-16 text-center dark:border-white/10 dark:bg-white/5'>
                <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/5 dark:bg-white/10'>
                  <Folder size={24} className='text-slate-500 dark:text-white' />
                </div>
                <h3 className='mb-1.5 text-[16px] font-semibold text-slate-900 dark:text-white'>
                  {activeSession === 'starred' ? 'No Starred Projects' : 'No Projects yet'}
                </h3>
                <p className='mb-5 max-w-xs text-[13px] text-slate-500 dark:text-slate-400'>
                  {activeSession === 'starred' ? 'Star a project to see it here.' : 'Create your first project and start building something amazing!'}
                </p>
                {activeSession !== 'starred' && (
                  <button
                    type='button'
                    onClick={() => setOpenModel(true)}
                    className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900'
                  >
                    Create project
                  </button>
                )}
              </div>
            ) : (
              <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                {visibleProjects.map((p) => (
                  <ProjectCard key={p._id} project={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {openModel && <CreateProjectModel openModel={openModel} onClose={() => setOpenModel(false)} />}
    </div>
  )
}

export default Dashboard
