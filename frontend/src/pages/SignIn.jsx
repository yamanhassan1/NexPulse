import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import { login } from '../features/login'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import Logo from '../components/shared/Logo'
import SignInButton from '../components/auth/SignInButton'
import ThemeToggle from '../components/theme/ThemeToggle'
import PageLoader from '../components/shared/PageLoader'
import { authErrorMessage } from '../utils/authErrors'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fieldClass =
  'h-11 w-full rounded-lg border border-line bg-hover px-3 text-[14px] text-graphite outline-none transition-colors placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-400/40 dark:border-line-dark dark:bg-ink-800 dark:text-mist'

function Field({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className='mb-1.5 block text-[13px] font-medium text-graphite dark:text-mist'>
        {label}
      </label>
      {children}
    </div>
  )
}

function SignIn() {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { userData, authChecked } = useSelector((state) => state.user)
  const from = location.state?.from || '/'
  const busy = loading || googleLoading

  const resetFeedback = () => {
    setError('')
    setNotice('')
  }

  const switchMode = (next) => {
    setMode(next)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    resetFeedback()
  }

  const establishSession = async (user) => {
    const token = await user.getIdToken(true)
    const data = await login(token)
    dispatch(setUserData(data))
    navigate(from, { replace: true })
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    resetFeedback()
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await establishSession(result.user)
    } catch (err) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return
      }
      console.error(`[login] ${err.message}`)
      setError(authErrorMessage(err, 'Sign-in failed. Check your connection and try again.'))
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleEmailSignIn = async (event) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }

    setLoading(true)
    resetFeedback()
    try {
      const result = await signInWithEmailAndPassword(auth, trimmedEmail, password)
      if (!result.user.emailVerified) {
        setMode('verify')
        setNotice(`Confirm ${trimmedEmail} before continuing. Open the link we sent, then come back.`)
        return
      }
      await establishSession(result.user)
    } catch (err) {
      console.error(`[login] ${err.message}`)
      setError(authErrorMessage(err, 'Sign-in failed. Check your connection and try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (event) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (trimmedName.length < 1 || trimmedName.length > 120) {
      setError('Enter your name.')
      return
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Use a password of at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    resetFeedback()
    try {
      const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password)
      await updateProfile(result.user, { displayName: trimmedName })
      try {
        await sendEmailVerification(result.user)
      } catch (verifyError) {
        console.error(`[signup] ${verifyError.message}`)
        await signOut(auth)
        setPassword('')
        setConfirmPassword('')
        setMode('signin')
        setError('Account created, but the verification email could not be sent. Sign in to resend it.')
        return
      }
      await signOut(auth)
      setPassword('')
      setConfirmPassword('')
      setMode('signin')
      setNotice(`Account created. We sent a verification link to ${trimmedEmail}. Verify your email, then sign in.`)
    } catch (err) {
      console.error(`[signup] ${err.message}`)
      setError(authErrorMessage(err, 'Could not create the account. Try again.'))
      if (auth.currentUser) {
        await signOut(auth).catch(() => {})
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (event) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    resetFeedback()
    try {
      await sendPasswordResetEmail(auth, trimmedEmail)
      setNotice('If an account exists for that email, a reset link is on its way.')
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        setNotice('If an account exists for that email, a reset link is on its way.')
        return
      }
      console.error(`[reset] ${err.message}`)
      setError(authErrorMessage(err, 'Could not send the reset email. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const user = auth.currentUser
    if (!user) {
      setError('Sign in again to resend the verification email.')
      setMode('signin')
      return
    }
    setLoading(true)
    resetFeedback()
    try {
      await sendEmailVerification(user)
      setNotice(`Verification email sent to ${user.email}.`)
    } catch (err) {
      console.error(`[verify] ${err.message}`)
      setError(authErrorMessage(err, 'Could not resend the email. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifiedContinue = async () => {
    const user = auth.currentUser
    if (!user) {
      setMode('signin')
      setError('Sign in again after verifying your email.')
      return
    }
    setLoading(true)
    resetFeedback()
    try {
      await user.reload()
      if (!user.emailVerified) {
        setError('That email is not verified yet. Open the link, then try again.')
        return
      }
      await establishSession(user)
    } catch (err) {
      console.error(`[verify] ${err.message}`)
      setError(authErrorMessage(err, 'Could not finish sign-in. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveVerify = async () => {
    setLoading(true)
    try {
      await signOut(auth)
    } catch {
      // The app session was never created.
    } finally {
      setLoading(false)
      switchMode('signin')
    }
  }

  if (!authChecked) {
    return <PageLoader label='Checking session' />
  }

  if (userData) {
    return <Navigate to={from === '/signin' ? '/' : from} replace />
  }

  const titles = {
    signin: ['Welcome to NexPulse', 'Sign in with email or Google to pick up where you left off.'],
    signup: ['Create your account', 'Use your email and a password. We will ask you to verify the address.'],
    reset: ['Reset your password', 'Enter the email on your account and we will send a reset link.'],
    verify: ['Verify your email', 'Email and password accounts stay locked until the address is confirmed.'],
  }
  const [title, subtitle] = titles[mode]

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
                <h1 className='text-[28px] font-semibold tracking-tight'>{title}</h1>
                <p className='mt-2 text-[14px] leading-relaxed text-muted dark:text-mist-muted'>
                  {subtitle}
                </p>
              </div>

              {mode === 'verify' ? (
                <div className='mt-7 space-y-3'>
                  <button
                    type='button'
                    onClick={handleVerifiedContinue}
                    disabled={busy}
                    className='flex h-[50px] w-full items-center justify-center rounded-lg bg-brand-600 text-[14px] font-medium text-on-brand transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {loading ? 'Checking…' : "I've verified my email"}
                  </button>
                  <button
                    type='button'
                    onClick={handleResendVerification}
                    disabled={busy}
                    className='flex h-11 w-full items-center justify-center rounded-lg border border-line text-[14px] font-medium text-graphite transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-line-dark dark:text-mist dark:hover:bg-ink-800'
                  >
                    Resend verification email
                  </button>
                  <button
                    type='button'
                    onClick={handleLeaveVerify}
                    disabled={busy}
                    className='w-full text-center text-[13px] text-muted transition-colors hover:text-graphite disabled:opacity-60 dark:text-mist-muted dark:hover:text-mist'
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form
                  className='mt-7 space-y-3.5'
                  onSubmit={mode === 'signup' ? handleSignUp : mode === 'reset' ? handleReset : handleEmailSignIn}
                  noValidate
                >
                  {mode === 'signup' && (
                    <Field id='name' label='Name'>
                      <input
                        id='name'
                        name='name'
                        type='text'
                        autoComplete='name'
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        disabled={busy}
                        required
                        maxLength={120}
                        className={fieldClass}
                        placeholder='Your name'
                      />
                    </Field>
                  )}
                  <Field id='email' label='Email'>
                    <input
                      id='email'
                      name='email'
                      type='email'
                      autoComplete='email'
                      inputMode='email'
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={busy}
                      required
                      className={fieldClass}
                      placeholder='you@example.com'
                    />
                  </Field>
                  {mode !== 'reset' && (
                    <Field id='password' label='Password'>
                      <div className='relative'>
                        <input
                          id='password'
                          name='password'
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          disabled={busy}
                          required
                          minLength={mode === 'signup' ? 8 : undefined}
                          className={`${fieldClass} pr-16`}
                          placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword((value) => !value)}
                          className='absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[12px] font-medium text-muted hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:text-mist-muted dark:hover:text-mist'
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </Field>
                  )}
                  {mode === 'signup' && (
                    <Field id='confirm-password' label='Confirm password'>
                      <input
                        id='confirm-password'
                        name='confirmPassword'
                        type={showPassword ? 'text' : 'password'}
                        autoComplete='new-password'
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        disabled={busy}
                        required
                        className={fieldClass}
                        placeholder='Repeat your password'
                      />
                    </Field>
                  )}

                  {mode === 'signin' && (
                    <div className='flex justify-end'>
                      <button
                        type='button'
                        onClick={() => switchMode('reset')}
                        className='text-[13px] text-muted transition-colors hover:text-graphite dark:text-mist-muted dark:hover:text-mist'
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type='submit'
                    disabled={busy}
                    className='flex h-[50px] w-full items-center justify-center rounded-lg bg-brand-600 text-[14px] font-medium text-on-brand transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {loading
                      ? mode === 'signup'
                        ? 'Creating account…'
                        : mode === 'reset'
                          ? 'Sending link…'
                          : 'Signing you in…'
                      : mode === 'signup'
                        ? 'Create account'
                        : mode === 'reset'
                          ? 'Send reset link'
                          : 'Sign in'}
                  </button>
                </form>
              )}

              {notice && (
                <p role='status' className='mt-4 text-center text-sm text-muted dark:text-mist-muted'>
                  {notice}
                </p>
              )}
              {error && (
                <p role='alert' className='mt-4 text-center text-sm text-red-500 dark:text-red-400'>
                  {error}
                </p>
              )}

              {mode !== 'verify' && (
                <>
                  {mode !== 'reset' && (
                    <>
                      <div className='my-5 flex items-center gap-3 text-[12px] text-faint'>
                        <span className='h-px flex-1 bg-line dark:bg-line-dark' />
                        or
                        <span className='h-px flex-1 bg-line dark:bg-line-dark' />
                      </div>
                      <SignInButton onSignIn={handleGoogleLogin} loading={googleLoading} disabled={busy} />
                    </>
                  )}
                  <p className='mt-5 text-center text-[13px] text-muted dark:text-mist-muted'>
                    {mode === 'signin' && (
                      <>
                        New here?{' '}
                        <button
                          type='button'
                          onClick={() => switchMode('signup')}
                          className='font-medium text-graphite hover:underline dark:text-mist'
                        >
                          Create an account
                        </button>
                      </>
                    )}
                    {mode === 'signup' && (
                      <>
                        Already have an account?{' '}
                        <button
                          type='button'
                          onClick={() => switchMode('signin')}
                          className='font-medium text-graphite hover:underline dark:text-mist'
                        >
                          Sign in
                        </button>
                      </>
                    )}
                    {mode === 'reset' && (
                      <button
                        type='button'
                        onClick={() => switchMode('signin')}
                        className='font-medium text-graphite hover:underline dark:text-mist'
                      >
                        Back to sign in
                      </button>
                    )}
                  </p>
                </>
              )}
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
