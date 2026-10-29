import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'
import { ToastContext } from '../hooks/toastContext'

const DEFAULT_DURATION = 4000

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
    (message, { variant = 'info', duration = DEFAULT_DURATION } = {}) => {
      counter.current += 1
      const id = `toast-${counter.current}`
      setToasts((current) => [...current, { id, message, variant }])

      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration)
        timers.current.set(id, timer)
      }

      return id
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
