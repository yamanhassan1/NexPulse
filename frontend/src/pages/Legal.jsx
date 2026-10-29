import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

const content = {
  terms: {
    title: 'Terms of Service',
    updated: 'Last updated: October 2026',
    sections: [
      {
        heading: 'Using NexPulse',
        body: 'NexPulse provides a browser-based workspace for creating and managing projects. By signing in, you agree to use the service responsibly and only for content you have the right to create.',
      },
      {
        heading: 'Your account',
        body: 'Access is provided through Google sign-in. You are responsible for the activity that happens under your account and for keeping your sign-in credentials secure.',
      },
      {
        heading: 'Your content',
        body: 'You retain ownership of the projects and content you create. We store your data so you can access it across sessions and devices.',
      },
      {
        heading: 'Availability',
        body: 'The service is provided as-is while in early access. Features may change, and downtime may occur as the platform evolves.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: October 2026',
    sections: [
      {
        heading: 'What we collect',
        body: 'When you sign in with Google we receive basic profile information such as your name, email address, and profile identifier. We also store the projects you create.',
      },
      {
        heading: 'How we use it',
        body: 'Your information is used to authenticate you, restore your session, and show your projects. We do not sell your personal data.',
      },
      {
        heading: 'Cookies and sessions',
        body: 'We use a secure session cookie to keep you signed in. Signing out clears that session on the server.',
      },
      {
        heading: 'Your choices',
        body: 'You can delete your projects at any time from the dashboard. For account deletion requests, contact the NexPulse team.',
      },
    ],
  },
}

function Legal({ kind }) {
  const page = content[kind] || content.terms

  return (
    <div className='min-h-dvh bg-surface text-graphite transition-colors duration-200 dark:bg-ink-950 dark:text-mist'>
      <header className='border-b border-line dark:border-line-dark'>
        <div className='mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-8'>
          <Link to='/' className='flex items-center gap-2.5'>
            <Logo className='h-7 w-7' />
            <span className='text-[17px] font-semibold tracking-tight'>NexPulse</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className='mx-auto w-full max-w-3xl px-4 py-10 sm:px-8'>
        <Link
          to='/'
          className='mb-6 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-subtle transition-colors hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:text-faint dark:hover:text-mist'
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>
        <h1 className='text-3xl font-semibold tracking-tight'>{page.title}</h1>
        <p className='mt-2 text-[13px] text-faint'>{page.updated}</p>
        <div className='mt-8 space-y-6'>
          {page.sections.map((section) => (
            <section
              key={section.heading}
              className='rounded-lg border border-line bg-panel p-6 dark:border-line-dark dark:bg-ink-850'
            >
              <h2 className='text-[15px] font-semibold'>{section.heading}</h2>
              <p className='mt-2 text-[14px] leading-relaxed text-muted dark:text-mist-muted'>
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Legal
