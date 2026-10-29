import { Link } from 'react-router-dom'
import Background from '../components/Background'
import ThemeToggle from '../components/ThemeToggle'

function NotFound() {
  return (
    <div className='relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-surface px-6 text-center text-graphite dark:bg-ink-950 dark:text-mist'>
      <Background />
      <div className='absolute right-4 top-4 z-20'>
        <ThemeToggle />
      </div>
      <div className='relative z-10'>
        <p className='text-sm font-medium tracking-wide text-subtle dark:text-faint'>404</p>
        <h1 className='mt-2 text-3xl font-semibold'>Page not found</h1>
        <p className='mt-3 max-w-md text-sm text-muted dark:text-mist-muted'>
          That route does not exist yet. Head back to the home screen to continue.
        </p>
        <Link
          to='/'
          className='mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

export default NotFound
