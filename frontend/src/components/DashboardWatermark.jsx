import Logo from './Logo'

function DashboardWatermark() {
  return (
    <div className='pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block'>
      <div className='flex flex-col items-center opacity-[0.08] dark:opacity-[0.12]'>
        <Logo className='h-32 w-32' />
        <span className='mt-4 text-sm font-medium tracking-[0.4em] uppercase text-graphite dark:text-white'>
          NexPulse
        </span>
      </div>
    </div>
  )
}

export default DashboardWatermark
