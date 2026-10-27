import { motion } from 'motion/react'
import { Folder, Star, Zap } from 'lucide-react'

function Sidebar({ activeSession, setActiveSession }) {
  return (
    <aside className='hidden h-full w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/60 px-3 py-5 font-sans backdrop-blur-xl transition-colors duration-300 sm:flex dark:border-white/10 dark:bg-white/5'>
      <nav className='flex flex-col gap-1' aria-label='Project views'>
        <motion.button
          type='button'
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveSession('projects')}
          aria-current={activeSession === 'projects' ? 'page' : undefined}
          className={`relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors duration-150 ${activeSession === 'projects' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'}`}
        >
          {activeSession === 'projects' && (
            <div className='absolute inset-0 rounded-lg border border-slate-900/10 bg-slate-900/5 dark:border-white/10 dark:bg-white/10' />
          )}
          <Folder size={17} strokeWidth={2} className='relative' />
          <span className='relative'>Projects</span>
        </motion.button>

        <motion.button
          type='button'
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveSession('starred')}
          aria-current={activeSession === 'starred' ? 'page' : undefined}
          className={`relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors duration-150 ${activeSession === 'starred' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'}`}
        >
          {activeSession === 'starred' && (
            <div className='absolute inset-0 rounded-lg border border-slate-900/10 bg-slate-900/5 dark:border-white/10 dark:bg-white/10' />
          )}
          <Star size={17} strokeWidth={2} className='relative' />
          <span className='relative'>Starred</span>
        </motion.button>
      </nav>

      <div className='my-4 h-px bg-slate-200/70 dark:bg-white/10' />

      <div className='rounded-xl border border-slate-200/70 bg-white/70 p-3.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none'>
        <p className='mb-1 text-[12.5px] font-medium text-slate-700 dark:text-slate-300'>Upgrade Plan</p>
        <p className='mb-3 text-[11.5px] leading-snug text-slate-400 dark:text-slate-500'>Upgrade to Pro for more credits</p>
        <motion.button
          type='button'
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className='flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-opacity duration-150 hover:opacity-90 dark:bg-white dark:text-slate-900'
        >
          <Zap size={13} fill='currentColor' />
          Upgrade Now
        </motion.button>
      </div>
    </aside>
  )
}

export default Sidebar
