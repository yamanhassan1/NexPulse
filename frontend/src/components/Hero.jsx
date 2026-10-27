import SignInButton from './SignInButton'
import FeatureList from './FeatureList'

function Hero({ onSignIn, loading }) {
    return (
        <section className='animate-rise'>
            <div id='features' className='mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11.5px] text-slate-300'>
                <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                Early access · AI features rolling out
            </div>

            <h1 className='max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl'>
                The AI code editor<br />
                <span className='text-gradient'>built for the web</span>
            </h1>

            <p className='mt-5 max-w-md text-[15px] leading-relaxed text-slate-400'>
                Write, refactor, and ship without leaving your browser. NexPulse pairs a fast
                editor with an AI assistant that understands your whole project.
            </p>

            <SignInButton onSignIn={onSignIn} loading={loading} />
            <FeatureList />
        </section>
    )
}

export default Hero
