import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../firebase'
import { login } from '../features/login'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import Logo from '../components/Logo'
import SignInButton from '../components/SignInButton'
import ThemeToggle from '../components/ThemeToggle'
import PageLoader from '../components/PageLoader'

function SignIn() {
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { userData, authChecked } = useSelector((state) => state.user)
  const from = location.state?.from || '/'

  const handleLogin = async () => {
    setLoading(true)
    setLoginError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const token = await result.user.getIdToken()
      const data = await login(token)
      dispatch(setUserData(data))
      navigate(from, { replace: true })
    } catch (error) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        return
      }
      console.error(`[login] ${error.message}`)
      setLoginError('Sign-in failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) {
    return <PageLoader label='Checking session' />
  }

  if (userData) {
    return <Navigate to={from === '/signin' ? '/' : from} replace />
  }

  return (
    <div className='relative min-h-dvh w-full bg-surface text-graphite dark:bg-ink-950 dark:text-mist'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute left-1/2 top-[-18%] h-96 w-lg -translate-x-1/2 rounded-full bg-brand-500/10 blur-[150px]' />
      </div>
      <div className='absolute right-4 top-4 z-20'>
        <ThemeToggle />
      </div>
      <div className='relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-10'>
        <div className='mb-8 flex items-center gap-2.5'>
          <Logo className='h-7 w-7' />
          <span className='text-[17px] font-semibold tracking-tight'>NexPulse</span>
        </div>
        <main className='w-full max-w-100'>
          <div className='rounded-xl border border-line bg-panel dark:border-line-dark dark:bg-ink-850'>
            <div className='px-8 py-9'>
              <div className='text-center'>
                <h1 className='text-[32px] font-semibold tracking-tight'>
                  Welcome to NexPulse
                </h1>
                <p className='mt-2 text-[14px] leading-relaxed text-muted dark:text-mist-muted'>
                  Your workspace is waiting. Sign in to pick up where you left off.
                </p>
              </div>
              <div className='mt-7'>
                <SignInButton onSignIn={handleLogin} loading={loading} />
              </div>
              {loginError && (
                <p role='alert' className='mt-4 text-center text-sm text-red-500 dark:text-red-400'>
                  {loginError}
                </p>
              )}
              <p className='mt-6 text-center text-[12px] leading-relaxed text-faint'>
                Your projects remain yours. Sign in securely to access your workspace.
              </p>
            </div>
            <div className='border-t border-line px-8 py-4 text-center text-[12px] text-faint dark:border-line-dark'>
              By continuing, you agree to our{' '}
              <Link
                to='/terms'
                className='text-muted transition-colors hover:text-graphite dark:text-mist-muted dark:hover:text-mist'
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to='/privacy'
                className='text-muted transition-colors hover:text-graphite dark:text-mist-muted dark:hover:text-mist'
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </main>
        <footer className='mt-8 text-center text-[12px] text-faint'>
          © {new Date().getFullYear()} NexPulse
        </footer>
      </div>
    </div>
  )
}

export default SignIn
