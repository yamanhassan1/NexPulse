import { FcGoogle } from 'react-icons/fc'
import { FiArrowRight } from 'react-icons/fi'

function SignInButton({ onSignIn, loading }) {
    return (
        <div className='mt-8 max-w-sm'>
            <button
                type='button'
                onClick={onSignIn}
                disabled={loading}
                className='group flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3 text-[14px] font-semibold text-slate-900 shadow-lg shadow-black/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-600/20 disabled:translate-y-0 disabled:opacity-70'>
                <FcGoogle className='text-lg' />
                {loading ? 'Signing in…' : 'Continue with Google'}
                {!loading && <FiArrowRight className='text-slate-400 transition-transform group-hover:translate-x-0.5' />}
            </button>
            <p className='mt-3 text-center text-[11px] text-slate-500'>
                By continuing you agree to our Terms &amp; Privacy Policy
            </p>
        </div>
    )
}

export default SignInButton
