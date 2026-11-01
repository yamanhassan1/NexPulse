import { FiRefreshCw, FiWifiOff } from 'react-icons/fi'
import Logo from './Logo'

function SessionError({ message, onRetry, retrying = false }) {
  return (
    <div className='relative flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center text-graphite dark:bg-ink-950 dark:text-mist'>
      <div className='pointer-events-none absolute -top-32 left-1/2 h-80 w-100 -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]' />

      <div className='relative z-10 flex w-full max-w-sm flex-col items-center'>
        <Logo className='mb-6 h-8 w-8' />

        <div className='mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-hover dark:bg-ink-800'>
          <FiWifiOff size={22} className='text-subtle dark:text-faint' />
        </div>

        <h1 className='text-[22px] font-semibold tracking-tight'>
          We can&apos;t reach NexPulse
        </h1>

        <p className='mt-2 text-[13.5px] leading-relaxed text-muted dark:text-mist-muted'>
          {message || 'Something went wrong while checking your session.'}
        </p>

        <button
          type='button'
          onClick={onRetry}
          disabled={retrying}
          className='mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-wait disabled:opacity-60'
        >
          <FiRefreshCw size={15} className={retrying ? 'animate-spin' : undefined} />
          {retrying ? 'Retrying…' : 'Try again'}
        </button>

        <p className='mt-5 text-[11.5px] leading-relaxed text-subtle dark:text-faint'>
          Your projects are untouched. You will not need to sign in again unless the
          session really expired.
        </p>
      </div>
    </div>
  )
}

export default SessionError
