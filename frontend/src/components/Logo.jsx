import logoColor from '../assets/logo.svg'
import logoWhite from '../assets/logo-white.svg'

function Logo({ className = 'h-6 w-6', variant = 'color' }) {
    return (
        <img
            src={variant === 'white' ? logoWhite : logoColor}
            alt='NexPulse'
            className={className}
            draggable='false'
        />
    )
}

export default Logo
