import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { bootstrapSession } from './features/session'
import PageLoader from './components/PageLoader'
import ProtectedRoute from './components/ProtectedRoute'
import SessionError from './components/SessionError'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const SignIn = lazy(() => import('./pages/SignIn'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const Legal = lazy(() => import('./pages/Legal'))
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  const dispatch = useDispatch()
  const { authError, authChecked } = useSelector((state) => state.user)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    bootstrapSession(dispatch)
  }, [dispatch])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await bootstrapSession(dispatch)
    } finally {
      setRetrying(false)
    }
  }

  if (authChecked && authError) {
    return <SessionError message={authError} onRetry={handleRetry} retrying={retrying} />
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path='/signin' element={<SignIn />} />
          <Route
            path='/'
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path='/project/:id'
            element={
              <ProtectedRoute>
                <ProjectPage />
              </ProtectedRoute>
            }
          />
          <Route path='/terms' element={<Legal kind='terms' />} />
          <Route path='/privacy' element={<Legal kind='privacy' />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
