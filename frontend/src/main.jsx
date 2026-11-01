import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { store } from './redux/store.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ThemeProvider from './hooks/ThemeProvider.jsx'
import ThemeSwitcher from './components/ThemeSwitcher.jsx'
import { ToastProvider } from './components/Toast.jsx'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <MotionConfig reducedMotion='user'>
            <App />
            <ThemeSwitcher />
          </MotionConfig>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  </ErrorBoundary>
)
