import { Folder, Loader2 } from 'lucide-react'
import ProjectCard from './ProjectCard'

function ProjectsSection({
  activeSession,
  setActiveSession,
  loadingProjects,
  projectError,
  visibleProjects,
  onCreateProject
}) {
  return (
    <>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-[16px] font-medium text-[#20212A] dark:text-[#F5F3FA]'>
          {activeSession === 'starred' ? 'Starred Projects' : 'Recent Projects'}
        </h2>
        <div className='flex gap-2 sm:hidden'>
          <button
            type='button'
            onClick={() => setActiveSession('projects')}
            className={`rounded-lg px-3 py-1.5 text-sm ${activeSession === 'projects' ? 'bg-cyan-600 text-white' : 'border border-[#E1E3EC] text-[#55596B] dark:border-[#343643] dark:text-[#B5B6C5]'}`}
          >
            Projects
          </button>
          <button
            type='button'
            onClick={() => setActiveSession('starred')}
            className={`rounded-lg px-3 py-1.5 text-sm ${activeSession === 'starred' ? 'bg-cyan-600 text-white' : 'border border-[#E1E3EC] text-[#55596B] dark:border-[#343643] dark:text-[#B5B6C5]'}`}
          >
            Starred
          </button>
        </div>
      </div>

      {loadingProjects ? (
        <div className='flex min-h-72 items-center justify-center'>
          <Loader2 className='animate-spin text-[#70758A] dark:text-[#9295A7]' aria-label='Loading projects' />
        </div>
      ) : projectError ? (
        <div className='mb-8 rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-6 text-center text-sm text-[#F87171] dark:border-[#F87171]/30 dark:bg-[#F87171]/10'>
          {projectError}
        </div>
      ) : visibleProjects.length === 0 ? (
          <div className='mb-8 flex flex-col items-center justify-center rounded-lg border border-[#E1E3EC] bg-white px-6 py-12 text-center dark:border-[#343643] dark:bg-ink-850'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F2F7] dark:bg-[#20232D]'>
            <Folder size={22} className='text-[#70758A] dark:text-[#9295A7]' />
          </div>
          <h3 className='mb-1.5 text-[16px] font-medium text-[#20212A] dark:text-[#F5F3FA]'>
            {activeSession === 'starred' ? 'No Starred Projects' : 'No projects yet'}
          </h3>
          <p className='mb-5 max-w-xs text-[13px] leading-relaxed text-[#55596B] dark:text-[#B5B6C5]'>
            {activeSession === 'starred' ? 'Star a project to see it here.' : 'Your first project starts here. Create a workspace and begin building with NexPulse.'}
          </p>
          {activeSession !== 'starred' && (
            <button
              type='button'
              onClick={onCreateProject}
            className='rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
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
