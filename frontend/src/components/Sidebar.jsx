import { motion } from 'motion/react'
import { Folder, Star, Zap } from 'lucide-react'

function Sidebar({ activeSession, setActiveSession }) {
  return (
    <aside className='hidden h-full w-64 shrink-0 flex-col border-r border-[#E1E3EC] bg-white px-3 py-5 font-sans transition-colors duration-200 sm:flex dark:border-[#343643] dark:bg-ink-900'>
      <nav className='flex flex-col gap-1' aria-label='Project views'>
        <motion.button
          type='button'
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveSession('projects')}
          aria-current={activeSession === 'projects' ? 'page' : undefined}
          className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${activeSession === 'projects' ? 'bg-cyan-50 font-medium text-cyan-700 dark:bg-ink-800 dark:text-brand-300' : 'text-[#55596B] hover:bg-[#F1F2F7] hover:text-[#20212A] dark:text-[#B5B6C5] dark:hover:bg-ink-800 dark:hover:text-[#F5F3FA]'}`}
        >
          <Folder size={17} strokeWidth={2} className='relative' />
          <span className='relative'>Projects</span>
        </motion.button>

        <motion.button
          type='button'
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveSession('starred')}
          aria-current={activeSession === 'starred' ? 'page' : undefined}
          className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${activeSession === 'starred' ? 'bg-cyan-50 font-medium text-cyan-700 dark:bg-ink-800 dark:text-brand-300' : 'text-[#55596B] hover:bg-[#F1F2F7] hover:text-[#20212A] dark:text-[#B5B6C5] dark:hover:bg-ink-800 dark:hover:text-[#F5F3FA]'}`}
        >
          <Star size={17} strokeWidth={2} className='relative' />
          <span className='relative'>Starred</span>
        </motion.button>
      </nav>

      <div className='my-4 h-px bg-[#E1E3EC] dark:bg-[#343643]' />

      <div className='rounded-lg border border-[#E1E3EC] bg-white p-3.5 dark:border-[#343643] dark:bg-ink-850'>
        <p className='mb-1 text-[13px] font-medium text-[#20212A] dark:text-[#F5F3FA]'>Upgrade Plan</p>
        <p className='mb-3 text-[12px] leading-snug text-[#70758A] dark:text-[#9295A7]'>Upgrade to Pro for more credits</p>
        <motion.button
          type='button'
          whileTap={{ scale: 0.98 }}
          className='flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-600 py-2 text-[12.5px] font-medium text-white transition-colors duration-150 hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
        >
          <Zap size={13} fill='currentColor' />
          Upgrade Now
        </motion.button>
      </div>
    </aside>
  )
}

export default Sidebar
