import { FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../hooks/themeContext'

function ThemeToggle({ className = '' }) {
  const { isDark, openSwitcher } = useTheme()
  const label = isDark ? 'Change theme (currently dark)' : 'Change theme (currently light)'

  return (
    <button
      type='button'
      onClick={openSwitcher}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-subtle transition-colors duration-150 hover:bg-hover hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist ${className}`}
    >
      {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
    </button>
  )
}

export default ThemeToggle
