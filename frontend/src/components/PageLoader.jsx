import { Loader2 } from 'lucide-react'

function PageLoader({ label = 'Loading' }) {
  return (
    <div className='flex min-h-dvh items-center justify-center bg-surface text-subtle dark:bg-ink-950 dark:text-faint'>
      <Loader2 className='animate-spin' aria-label={label} />
    </div>
  )
}

export default PageLoader
