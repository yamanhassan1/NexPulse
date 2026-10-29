import { Component } from 'react'
import { FiRefreshCw } from 'react-icons/fi'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ui] Unhandled error', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className='flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center text-graphite dark:bg-ink-950 dark:text-mist'>
        <div className='max-w-md'>
          <p className='text-sm font-medium tracking-wide text-subtle dark:text-faint'>
            Something went wrong
          </p>
          <h1 className='mt-2 text-3xl font-semibold'>
            The app hit an unexpected error
          </h1>
          <p className='mt-3 text-sm leading-relaxed text-muted dark:text-mist-muted'>
            Your work is safe. Reload the page to get back to your dashboard.
          </p>
          <button
            type='button'
            onClick={this.handleReload}
            className='mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
          >
            <FiRefreshCw size={15} />
            Reload
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
