import { motion } from 'motion/react'
import { Folder, Star, Zap } from 'lucide-react'
import { useToast } from '../hooks/toastContext'

function Sidebar({ activeSession, setActiveSession }) {
  const { pushToast } = useToast()

  const handleUpgrade = () => {
    pushToast('Upgrade plans are coming soon.', { variant: 'info' })
  }

  return (
    <aside className='hidden h-full w-64 shrink-0 flex-col border-r border-line bg-panel px-3 py-5 font-sans transition-colors duration-200 sm:flex dark:border-line-dark dark:bg-ink-900'>
      <nav className='flex flex-col gap-1' aria-label='Project views'>
        <motion.button
          type='button'
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveSession('projects')}
          aria-current={activeSession === 'projects' ? 'page' : undefined}
          className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${activeSession === 'projects' ? 'bg-brand-500/10 font-medium text-brand-700 dark:bg-ink-800 dark:text-brand-300' : 'text-muted hover:bg-hover hover:text-graphite dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist'}`}
        >
          <Folder size={17} strokeWidth={2} className='relative' />
          <span className='relative'>Projects</span>
        </motion.button>

        <motion.button
          type='button'
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveSession('starred')}
          aria-current={activeSession === 'starred' ? 'page' : undefined}
          className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${activeSession === 'starred' ? 'bg-brand-500/10 font-medium text-brand-700 dark:bg-ink-800 dark:text-brand-300' : 'text-muted hover:bg-hover hover:text-graphite dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist'}`}
        >
          <Star size={17} strokeWidth={2} className='relative' />
          <span className='relative'>Starred</span>
        </motion.button>
      </nav>

      <div className='my-4 h-px bg-line dark:bg-line-dark' />

      <div className='rounded-lg border border-line bg-panel p-3.5 dark:border-line-dark dark:bg-ink-850'>
        <p className='mb-1 text-[13px] font-medium text-graphite dark:text-mist'>Upgrade Plan</p>
        <p className='mb-3 text-[12px] leading-snug text-subtle dark:text-faint'>
          Upgrade to Pro for more credits
        </p>
        <motion.button
          type='button'
          whileTap={{ scale: 0.98 }}
          onClick={handleUpgrade}
          className='flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-[12.5px] font-medium text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
        >
          <Zap size={13} fill='currentColor' />
          Upgrade Now
        </motion.button>
      </div>
    </aside>
  )
}

export default Sidebar
