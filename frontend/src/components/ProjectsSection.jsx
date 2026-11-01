import { Folder, Loader2, Search, X } from 'lucide-react'
import ProjectCard from './ProjectCard'

function ProjectsSection({
  activeSession,
  setActiveSession,
  loadingProjects,
  projectError,
  visibleProjects,
  totalProjects = 0,
  searchQuery = '',
  onSearchChange,
  onCreateProject,
  onRetry,
}) {
  const searching = searchQuery.trim().length > 0
  const hasNoProjects = totalProjects === 0

  return (
    <>
      <div className='mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
          <h2 className='text-[16px] font-medium text-graphite dark:text-mist'>
            {activeSession === 'starred' ? 'Starred Projects' : 'Recent Projects'}
          </h2>

          {searching && !loadingProjects && !projectError && (
            <span className='text-[12px] text-subtle dark:text-faint'>
              {visibleProjects.length} of {totalProjects} match
            </span>
          )}
        </div>

        <div className='flex items-center gap-2'>
          <div className='relative flex-1 sm:w-64 sm:flex-none'>
            <Search
              size={14}
              className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle dark:text-faint'
            />
            <input
              type='search'
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder='Search projects'
              aria-label='Search projects'
              className='w-full rounded-lg border border-line bg-panel py-2 pl-8 pr-8 text-[13px] text-graphite placeholder-subtle outline-none transition-colors focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/15 dark:border-line-dark dark:bg-ink-850 dark:text-mist dark:placeholder-faint [&::-webkit-search-cancel-button]:appearance-none'
            />
            {searching && (
              <button
                type='button'
                onClick={() => onSearchChange?.('')}
                aria-label='Clear search'
                className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle transition-colors hover:text-graphite dark:text-faint dark:hover:text-mist'
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className='flex gap-2 sm:hidden'>
            <button
              type='button'
              onClick={() => setActiveSession('projects')}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${activeSession === 'projects' ? 'bg-brand-600 text-white' : 'border border-line text-muted hover:bg-hover dark:border-line-dark dark:text-mist-muted dark:hover:bg-ink-800'}`}
            >
              Projects
            </button>
            <button
              type='button'
              onClick={() => setActiveSession('starred')}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${activeSession === 'starred' ? 'bg-brand-600 text-white' : 'border border-line text-muted hover:bg-hover dark:border-line-dark dark:text-mist-muted dark:hover:bg-ink-800'}`}
            >
              Starred
            </button>
          </div>
        </div>
      </div>

      {loadingProjects ? (
        <div className='flex min-h-72 items-center justify-center'>
          <Loader2
            className='animate-spin text-subtle dark:text-faint'
            aria-label='Loading projects'
          />
        </div>
      ) : projectError ? (
        <div className='mb-8 flex flex-col items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-6 text-center text-sm text-red-500 dark:border-red-400/30 dark:text-red-400'>
          <p>{projectError}</p>
          {onRetry && (
            <button
              type='button'
              onClick={onRetry}
              className='rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60'
            >
              Try again
            </button>
          )}
        </div>
      ) : searching && visibleProjects.length === 0 ? (
        <div className='mb-8 flex flex-col items-center justify-center rounded-lg border border-line bg-panel px-6 py-12 text-center dark:border-line-dark dark:bg-ink-850'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hover dark:bg-ink-800'>
            <Search size={20} className='text-subtle dark:text-faint' />
          </div>
          <h3 className='mb-1.5 text-[16px] font-medium text-graphite dark:text-mist'>
            No matches for “{searchQuery.trim()}”
          </h3>
          <p className='mb-5 max-w-xs text-[13px] leading-relaxed text-muted dark:text-mist-muted'>
            Try a different name, or clear the search to see everything again.
          </p>
          <button
            type='button'
            onClick={() => onSearchChange?.('')}
            className='rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:border-line-dark dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist'
          >
            Clear search
          </button>
        </div>
      ) : hasNoProjects ? (
        <div className='mb-8 flex flex-col items-center justify-center rounded-lg border border-line bg-panel px-6 py-12 text-center dark:border-line-dark dark:bg-ink-850'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hover dark:bg-ink-800'>
            <Folder size={22} className='text-subtle dark:text-faint' />
          </div>
          <h3 className='mb-1.5 text-[16px] font-medium text-graphite dark:text-mist'>
            {activeSession === 'starred' ? 'No Starred Projects' : 'No projects yet'}
          </h3>
          <p className='mb-5 max-w-xs text-[13px] leading-relaxed text-muted dark:text-mist-muted'>
            {activeSession === 'starred'
              ? 'Star a project to see it here.'
              : 'Your first project starts here. Create a workspace and begin building with NexPulse.'}
          </p>
          {activeSession !== 'starred' && (
            <button
              type='button'
              onClick={onCreateProject}
              className='rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {visibleProjects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}
    </>
  )
}

export default ProjectsSection
