function Background() {
    return (
        <>
            <div className='pointer-events-none absolute inset-0 bg-grid mask-[radial-gradient(90%_70%_at_50%_0%,#000_20%,transparent_80%)]' />
            <div className='pointer-events-none absolute -top-40 left-1/2 h-168 w-2xl -translate-x-1/2 rounded-full bg-brand-600/25 blur-[130px] animate-aurora' />
            <div className='pointer-events-none absolute -left-40 top-1/3 h-120 w-120 rounded-full bg-indigo-600/20 blur-[120px] animate-aurora-slow' />
            <div className='pointer-events-none absolute -right-40 bottom-0 h-128 w-lg rounded-full bg-fuchsia-600/15 blur-[120px] animate-aurora' />
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-10%,transparent_40%,#06060a_100%)]' />
        </>
    )
}

export default Background
