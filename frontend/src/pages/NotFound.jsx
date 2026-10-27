import { Link } from 'react-router-dom'
import Background from '../components/Background'

function NotFound() {
  return (
    <div className='relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-ink-950 px-6 text-center text-slate-200'>
      <Background />
      <div className='relative z-10'>
        <p className='text-sm font-medium tracking-wide text-slate-400'>404</p>
        <h1 className='mt-2 text-3xl font-semibold text-white'>Page not found</h1>
        <p className='mt-3 max-w-md text-sm text-slate-400'>
          That route does not exist yet. Head back to the home screen to continue.
        </p>
        <Link
          to='/'
          className='mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-opacity hover:opacity-90'
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

export default NotFound
