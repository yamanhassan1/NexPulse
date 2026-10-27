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
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [openModel, setOpenModel] = useState(false)
  const [activeSession, setActiveSession] = useState("projects")
  const dispatch = useDispatch()
  const { userData } = useSelector(state => state.user)
  const { projects, starredProjects } = useSelector(state => state.project)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const token = await result.user.getIdToken()
      const data = await login(token)
      dispatch(setUserData(data))
    } catch (error) {
      console.error(`[login] ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllProjects = async () => {
    setLoadingProjects(true)
    try {
      const data = await getProjects()
      dispatch(setProjects(Array.isArray(data) ? data : []))
    } catch (error) {
      console.error(`[projects] ${error.message}`)
      dispatch(setProjects([]))
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchStarredProjects = async () => {
    setLoadingProjects(true)
    try {
      const data = await getStarredProjects()
      dispatch(setStarredProjects(Array.isArray(data) ? data : []))
    } catch (error) {
      console.error(`[starred] ${error.message}`)
      dispatch(setStarredProjects([]))
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => {
    if (!userData) return
    if (activeSession === "projects") {
      fetchAllProjects()
    } else {
      fetchStarredProjects()
    }
  }, [activeSession, userData])

  if (!userData) {
    return (
      <div className='relative min-h-dvh w-full overflow-hidden bg-ink-950 text-slate-200'>
        <Background />
        <Navbar onSignIn={handleLogin} />
        <main className='relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 py-10 lg:grid-cols-2 lg:gap-10 lg:py-16'>
          <Hero onSignIn={handleLogin} loading={loading} />
          <section className='animate-rise [animation-delay:120ms]'>
            <CodeWindow />
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className='relative flex h-screen w-full flex-col overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-[#07070c]'>
      <div className='pointer-events-none absolute -top-40 left-1/3 hidden h-175 w-175 rounded-full bg-white/4 blur-[140px] dark:block' />
      <div className='pointer-events-none absolute top-1/3 right-0 hidden h-125 w-125 rounded-full bg-white/3 blur-[130px] dark:block' />
      <div className='relative flex min-h-0 flex-1 flex-col'>
        <UserNavbar />
        <div className='flex min-h-0 flex-1'>
          <Sidebar activeSession={activeSession} setActiveSession={setActiveSession} />
          <div className='min-h-0 flex-1 overflow-y-auto px-8 py-8 scrollbar-thin [scrollbar-color:rgba(100, 116, 139, 0.35)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20'>
            <div className='mb-8 flex items-start justify-between'>
              <div>
                <h1 className='flex items-center gap-2 text-[26px] font-bold text-slate-900 dark:text-white'>
                  Welcome Back, {(userData?.name || "User").split(" ")[0]} <span>👋</span>
                </h1>
                <p className='mt-1 text-[13.5px] text-slate-500 dark:text-slate-400'>Ready to build something amazing today?</p>
              </div>
              <button onClick={() => setOpenModel(true)} className='flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-opacity duration-150 hover:opacity-90 dark:bg-white dark:text-slate-900'>
                <Plus size={16} />
                New Project
              </button>
            </div>

            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-[16px] font-semibold text-slate-900 dark:text-white'>
                {activeSession === "starred" ? "Starred Projects" : "Recent Projects"}
              </h2>
            </div>

            {loadingProjects ? (
              <div className='flex min-h-75 items-center justify-center'>
                <Loader2 className='animate-spin text-slate-400 dark:text-slate-500' />
              </div>
            ) : (activeSession === "starred" ? (starredProjects || []) : (projects || [])).length === 0 ? (
              <div className='mb-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/40 py-16 text-center dark:border-white/10 dark:bg-white/5'>
                <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/5 dark:bg-white/10'>
                  <Folder size={24} className='text-slate-500 dark:text-white' />
                </div>
                <h3 className='mb-1.5 text-[16px] font-semibold text-slate-900 dark:text-white'>
                  {activeSession === "starred" ? "No Starred Projects" : "No Projects yet"}
                </h3>
                <p className='mb-5 max-w-xs text-[13px] text-slate-500 dark:text-slate-400'>
                  {activeSession === "starred" ? "Star a project to see it here." : "Create your first project and start building something amazing!"}
                </p>
              </div>
            ) : (
              <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {(activeSession === "starred" ? starredProjects || [] : projects || []).map((p) => (
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
