import Logo from './Logo'

function Navbar({ onSignIn }) {
    return (
        <header className='relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6'>
            <div className='flex items-center gap-2.5'>
                <Logo className='h-7 w-7' />
                <span className='text-[16px] font-semibold tracking-tight text-white'>NexPulse</span>
            </div>
            <nav className='hidden items-center gap-7 text-[13px] text-slate-400 sm:flex'>
                <a href='#' className='transition-colors hover:text-white'>Features</a>
                <a href='#' className='transition-colors hover:text-white'>Docs</a>
                <a href='#' className='transition-colors hover:text-white'>Pricing</a>
            </nav>
            <button onClick={onSignIn} className='rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/10'>
                Sign in
            </button>
        </header>
    )
}

export default Navbar
