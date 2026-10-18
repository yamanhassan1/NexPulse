import { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../firebase'
import { login } from '../features/login'
import Background from '../components/Background'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import CodeWindow from '../components/CodeWindow'
import Footer from '../components/Footer'

function Dashboard() {

    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setLoading(true)
        const result = await signInWithPopup(auth, googleProvider)
        const token = await result.user.getIdToken();
        const data = await login(token)
        setLoading(false)
        console.log(data)
    }

    return (
        <div className='relative min-h-dvh w-full overflow-hidden bg-ink-950 text-slate-200'>
            <Background />
            <Navbar onSignIn={handleLogin} />

            <main className='relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 py-10 lg:grid-cols-2 lg:gap-10 lg:py-16'>
                <Hero onSignIn={handleLogin} loading={loading} />
                <section className='animate-rise [animation-delay:120ms]'>
                    <CodeWindow />
                </section>
            </main>

            <Footer />
        </div>
    )
}

export default Dashboard
