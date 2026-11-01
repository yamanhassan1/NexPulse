import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'
import { ToastContext } from '../hooks/toastContext'

const DEFAULT_DURATION = 4000
const ACTION_DURATION = 8000

const toastStyles = {
  success: {
    icon: FiCheckCircle,
    iconClass: 'text-emerald-500 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  error: {
    icon: FiAlertTriangle,
    iconClass: 'text-red-500 dark:text-red-400',
    border: 'border-red-500/30',
  },
  info: {
    icon: FiInfo,
    iconClass: 'text-brand-600 dark:text-brand-400',
    border: 'border-brand-500/30',
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const counter = useRef(0)

  const dismissToast = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    (message, { variant = 'info', duration, action } = {}) => {
      counter.current += 1
      const id = `toast-${counter.current}`
      const lifetime = duration ?? (action ? ACTION_DURATION : DEFAULT_DURATION)

      setToasts((current) => [...current, { id, message, variant, action }])

      if (lifetime > 0) {
        const timer = setTimeout(() => dismissToast(id), lifetime)
        timers.current.set(id, timer)
      }

      return id
    },
    [dismissToast],
  )

  const runAction = useCallback(
    async (toast) => {
      dismissToast(toast.id)
      try {
        await toast.action?.onClick?.()
      } catch (error) {
        console.error(`[toast action] ${error.message}`)
      }
    },
    [dismissToast],
  )

  useEffect(() => {
    const pendingTimers = timers.current
    return () => {
      pendingTimers.forEach((timer) => clearTimeout(timer))
      pendingTimers.clear()
    }
  }, [])

  const value = useMemo(
    () => ({ pushToast, dismissToast }),
    [pushToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live='polite'
        className='pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end'
      >
        {toasts.map((toast) => {
          const style = toastStyles[toast.variant] || toastStyles.info
          const Icon = style.icon
          return (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-panel px-4 py-3 text-sm text-graphite shadow-lg shadow-black/10 dark:border-line-dark dark:bg-ink-850 dark:text-mist ${style.border}`}
            >
              <Icon className={`mt-0.5 shrink-0 ${style.iconClass}`} size={18} />
              <p className='flex-1 leading-relaxed'>{toast.message}</p>

              {toast.action && (
                <button
                  type='button'
                  onClick={() => runAction(toast)}
                  className='shrink-0 rounded-md px-2 py-0.5 text-[12.5px] font-semibold text-brand-700 transition-colors hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:text-brand-300 dark:hover:bg-brand-400/10'
                >
                  {toast.action.label}
                </button>
              )}

              <button
                type='button'
                onClick={() => dismissToast(toast.id)}
                aria-label='Dismiss notification'
                className='shrink-0 rounded-md p-0.5 text-subtle transition-colors hover:text-graphite dark:text-faint dark:hover:text-mist'
              >
                <FiX size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
