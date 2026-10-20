import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import { useEffect } from 'react'
import { me } from './features/me'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'

function App() {
  const dispatch = useDispatch()
  useEffect(() => {
    const fetch = async () => {
      const data = await me
      dispatch(setUserData(data))
    }
    fetch()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App