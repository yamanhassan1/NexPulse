import { FcGoogle } from 'react-icons/fc'

function SignInButton({ onSignIn, loading }) {
    return (
        <button
            type='button'
            onClick={onSignIn}
            disabled={loading}
            className='flex h-[50px] w-full items-center justify-center gap-3 rounded-lg border border-line bg-hover px-4 text-[14px] font-medium text-graphite transition-colors duration-150 hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-line-dark dark:bg-ink-800 dark:text-mist dark:hover:bg-ink-700'
        >
            <FcGoogle className='text-lg' />
            {loading ? 'Signing you in…' : 'Continue with Google'}
        </button>
    )
}

export default SignInButton
