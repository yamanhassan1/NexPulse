import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import { useEffect } from 'react'
import { me } from './features/me'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'

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
      }
    }
    fetchCurrentUser()
  }, [dispatch])

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App