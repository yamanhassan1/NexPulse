import { Folder, Loader2 } from 'lucide-react'
import ProjectCard from './ProjectCard'

function ProjectsSection({
  activeSession,
  setActiveSession,
  loadingProjects,
  projectError,
  visibleProjects,
  onCreateProject,
  onRetry,
}) {
  return (
    <>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-[16px] font-medium text-graphite dark:text-mist'>
          {activeSession === 'starred' ? 'Starred Projects' : 'Recent Projects'}
        </h2>
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
      ) : visibleProjects.length === 0 ? (
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
          {visibleProjects.map((p) => (
            <ProjectCard key={p._id} project={p} />
          ))}
        </div>
      )}
    </>
  )
}

export default ProjectsSection
