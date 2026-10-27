import { FcGoogle } from 'react-icons/fc'

function SignInButton({ onSignIn, loading }) {
    return (
        <button
            type='button'
            onClick={onSignIn}
            disabled={loading}
            className='flex h-[50px] w-full items-center justify-center gap-3 rounded-lg border border-[#343643] bg-[#20232D] px-4 text-[14px] font-medium text-[#F5F3FA] transition-colors duration-150 hover:bg-[#262934] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60'
        >
            <FcGoogle className='text-lg' />
            {loading ? 'Signing you in…' : 'Continue with Google'}
        </button>
    )
}

export default SignInButton
