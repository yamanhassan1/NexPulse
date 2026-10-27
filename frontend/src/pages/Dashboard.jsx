import { useEffect, useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../firebase'
import { login } from '../features/login'
import Logo from '../components/Logo'
import SignInButton from '../components/SignInButton'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import UserNavbar from '../components/UserNavbar'
import Sidebar from '../components/Sidebar'
import { Loader2 } from 'lucide-react'
import { getProjects, getStarredProjects } from '../features/project'
import { setProjects, setStarredProjects } from '../redux/projectSlice'
import CreateProjectModel from '../components/CreateProjectModel'
import DashboardHeader from '../components/DashboardHeader'
import DashboardWatermark from '../components/DashboardWatermark'
import ProjectsSection from '../components/ProjectsSection'

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
      <div className='relative min-h-dvh w-full bg-[#101116] text-[#F5F3FA]'>
        <div className='pointer-events-none absolute inset-0'>
          <div className='absolute left-1/2 top-[-18%] h-96 w-lg -translate-x-1/2 rounded-full bg-brand-500/10 blur-[150px]' />
        </div>
        <div className='relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-10'>
          <div className='mb-8 flex items-center gap-2.5'>
            <Logo className='h-7 w-7' />
            <span className='text-[17px] font-semibold tracking-tight text-[#F5F3FA]'>NexPulse</span>
          </div>
          <main className='w-full max-w-100'>
            <div className='rounded-xl border border-[#343643] bg-ink-850'>
              <div className='px-8 py-9'>
                <div className='text-center'>
                  <h1 className='text-[32px] font-semibold tracking-tight text-[#F5F3FA]'>Welcome to NexPulse</h1>
                  <p className='mt-2 text-[14px] leading-relaxed text-[#B5B6C5]'>Your workspace is waiting. Sign in to pick up where you left off.</p>
                </div>
                <div className='mt-7'>
                  <SignInButton onSignIn={handleLogin} loading={loading} />
                </div>
                {loginError && (
                  <p role='alert' className='mt-4 text-center text-sm text-[#F87171]'>
                    We couldn't sign you in. Please try again.
                  </p>
                )}
                <p className='mt-6 text-center text-[12px] leading-relaxed text-[#9295A7]'>
                  Your projects remain yours. Sign in securely to access your workspace.
                </p>
              </div>
              <div className='border-t border-[#343643] px-8 py-4 text-center text-[12px] text-[#9295A7]'>
                By continuing, you agree to our{' '}
                <a href='#' className='text-[#B5B6C5] transition-colors hover:text-[#F5F3FA]'>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href='#' className='text-[#B5B6C5] transition-colors hover:text-[#F5F3FA]'>
                  Privacy Policy
                </a>
              </div>
            </div>
          </main>
          <footer className='mt-8 text-center text-[12px] text-[#9295A7]'>
            © {new Date().getFullYear()} NexPulse
          </footer>
        </div>
      </div>
    )
  }

  const visibleProjects = activeSession === 'starred' ? starredProjects || [] : projects || []

  return (
    <div className='relative flex h-screen w-full flex-col overflow-hidden bg-[#F7F8FC] transition-colors duration-200 dark:bg-ink-950'>
      <div className='relative flex min-h-0 flex-1 flex-col'>
        <UserNavbar />
        <div className='flex min-h-0 flex-1'>
          <Sidebar activeSession={activeSession} setActiveSession={setActiveSession} />
          <div className='relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8'>
            <DashboardWatermark />
            <DashboardHeader userData={userData} onCreateProject={() => setOpenModel(true)} />
            <ProjectsSection
              activeSession={activeSession}
              setActiveSession={setActiveSession}
              loadingProjects={loadingProjects}
              projectError={projectError}
              visibleProjects={visibleProjects}
              onCreateProject={() => setOpenModel(true)}
            />
          </div>
        </div>
      </div>
      {openModel && <CreateProjectModel openModel={openModel} onClose={() => setOpenModel(false)} />}
    </div>
  )
}

export default Dashboard
