import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { me } from './features/me'
import { setAuthChecked, setUserData } from './redux/userSlice'
import PageLoader from './components/PageLoader'
import ProtectedRoute from './components/ProtectedRoute'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const SignIn = lazy(() => import('./pages/SignIn'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Legal = lazy(() => import('./pages/Legal'))
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const data = await me()
        if (data) dispatch(setUserData(data))
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error(`[me] ${error.message}`)
        }
      } finally {
        dispatch(setAuthChecked(true))
      }
    }
    fetchCurrentUser()
  }, [dispatch])

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
                <ProjectDetail />
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
