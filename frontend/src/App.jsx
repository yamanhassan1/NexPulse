import { signInWithPopup } from 'firebase/auth'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { auth, googleProvider } from '../firebase'
import { login } from './features/login'

function App() {

  const handleLogin = async () => {
    const result = await signInWithPopup(auth, googleProvider)
    const token = await result.user.getIdToken();
    const data = await login(token)
    console.log(data)
  }

  return (
    <div>
      <button onClick={handleLogin}>Continue with google</button>
    </div>
  )
}

export default App