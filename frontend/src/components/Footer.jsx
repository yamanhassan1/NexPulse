import Logo from './Logo'

function Footer() {
    return (
        <footer id='pricing' className='relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/8 px-6 py-8 text-[12px] text-slate-600 sm:flex-row'>
            <div className='flex items-center gap-2.5'>
                <Logo className='h-5 w-5' />
                <span>© {new Date().getFullYear()} NexPulse • Made with care by a small team</span>
            </div>
            <nav className='flex items-center gap-5' aria-label='Legal'>
                <a href='#docs' className='transition-colors hover:text-slate-300'>Privacy</a>
                <a href='#docs' className='transition-colors hover:text-slate-300'>Terms</a>
                <a href='#pricing' className='transition-colors hover:text-slate-300'>Contact</a>
            </nav>
        </footer>
    )
}

export default Footer
