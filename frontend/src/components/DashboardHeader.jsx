import { FolderInput, Plus } from 'lucide-react'

function DashboardHeader({ userData, onCreateProject, onImportFolder, importing = false }) {
  const firstName = (userData?.name || 'User').split(' ')[0]

  return (
    <div className='relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
      <div>
        <h1 className='text-[28px] font-semibold tracking-tight text-graphite dark:text-mist'>
          Welcome back, {firstName}
        </h1>
        <p className='mt-1.5 text-[14px] text-muted dark:text-mist-muted'>
          Ready to pick up where you left off?
        </p>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        <button
          type='button'
          onClick={onImportFolder}
          disabled={importing}
          title='Import a folder from this computer as a new project'
          className='flex items-center justify-center gap-1.5 rounded-lg border border-line bg-panel px-3.5 py-2.5 text-[13.5px] font-medium text-muted transition-colors hover:bg-hover hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-wait disabled:opacity-60 dark:border-line-dark dark:bg-ink-850 dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist'
        >
          <FolderInput size={16} />
          {importing ? 'Importing…' : 'Import folder'}
        </button>

        <button
          type='button'
          onClick={onCreateProject}
          className='flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
        >
          <Plus size={16} />
          New Project
        </button>
      </div>
    </div>
  )
}

export default DashboardHeader
