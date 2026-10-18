import { FiArrowRight, FiCheck, FiFileText, FiGitBranch, FiSearch, FiTerminal, FiZap } from 'react-icons/fi'
import Logo from './Logo'

const files = [
    { name: 'App.jsx', active: true },
    { name: 'main.jsx' },
    { name: 'index.css' },
    { name: 'firebase.js' },
]

function CodeWindow() {
    return (
        <div className='relative'>
            <div className='absolute -inset-x-10 -bottom-10 top-16 -z-10 rounded-4xl bg-brand-600/20 blur-3xl' />
            <div className='glass-panel ring-hairline overflow-hidden rounded-2xl animate-float'>
                <div className='flex items-center gap-2 border-b border-white/8 px-4 py-3'>
                    <span className='h-3 w-3 rounded-full bg-[#ff5f57]' />
                    <span className='h-3 w-3 rounded-full bg-[#febc2e]' />
                    <span className='h-3 w-3 rounded-full bg-[#28c840]' />
                    <div className='ml-3 flex items-center gap-2 font-mono text-[11px] text-slate-400'>
                        <span className='rounded bg-white/5 px-2 py-0.5 text-slate-200'>App.jsx</span>
                        <span className='hidden px-2 py-0.5 sm:inline'>index.css</span>
                    </div>
                </div>

                <div className='flex'>
                    <aside className='hidden w-40 shrink-0 border-r border-white/8 p-3 sm:block'>
                        <div className='mb-3 flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-[11px] text-slate-400'>
                            <FiSearch className='shrink-0' /> Search
                        </div>
                        <p className='mb-2 px-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase'>src</p>
                        <ul className='space-y-0.5'>
                            {files.map((f) => (
                                <li key={f.name} className={`flex items-center gap-2 rounded-md px-2 py-1 font-mono text-[11px] ${f.active ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400'}`}>
                                    <FiFileText className='shrink-0 opacity-70' /> {f.name}
                                </li>
                            ))}
                        </ul>
                    </aside>

                    <div className='min-w-0 flex-1 p-4 font-mono text-[12.5px] leading-6'>
                        <pre className='overflow-hidden'>
                            <code>
                                <span className='mr-4 inline-block w-4 text-right text-slate-600 select-none'>1</span><span className='text-[#c792ea]'>import</span> <span className='text-slate-300'>{'{ '}</span><span className='text-[#82aaff]'>useState</span><span className='text-slate-300'>{' }'}</span> <span className='text-[#c792ea]'>from</span> <span className='text-[#c3e88d]'>'react'</span>{'\n'}
                                <span className='mr-4 inline-block w-4 text-right text-slate-600 select-none'>2</span>{'\n'}
                                <span className='mr-4 inline-block w-4 text-right text-slate-600 select-none'>3</span><span className='text-[#c792ea]'>export default function</span> <span className='text-[#ffcb6b]'>App</span><span className='text-slate-300'>()</span> <span className='text-slate-300'>{'{'}</span>{'\n'}
                                <span className='mr-4 inline-block w-4 text-right text-slate-600 select-none'>4</span>  <span className='text-[#c792ea]'>const</span> <span className='text-slate-300'>[</span><span className='text-slate-200'>ready</span><span className='text-slate-300'>] = </span><span className='text-[#82aaff]'>useState</span><span className='text-slate-300'>(</span><span className='text-[#f78c6c]'>true</span><span className='text-slate-300'>)</span>{'\n'}
                                <span className='mr-4 inline-block w-4 text-right text-slate-600 select-none'>5</span>  <span className='text-[#546e7a] italic'>// ask NexPulse to build this for you</span>{'\n'}
                                <span className='mr-4 inline-block w-4 text-right text-slate-600 select-none'>6</span>  <span className='text-[#c792ea]'>return</span> <span className='text-slate-300'>&lt;</span><span className='text-[#f07178]'>main</span><span className='text-slate-300'>&gt;</span><span className='text-slate-200'>ready</span><span className='text-slate-300'>&lt;/</span><span className='text-[#f07178]'>main</span><span className='text-slate-300'>&gt;</span>{'\n'}
                                <span className='mr-4 inline-block w-4 text-right text-slate-600 select-none'>7</span><span className='text-slate-300'>{'}'}</span><span className='ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-brand-400 animate-caret' />
                            </code>
                        </pre>

                        <div className='mt-3 flex items-center gap-2 rounded-lg border border-brand-500/25 bg-brand-500/10 px-3 py-2 text-[11.5px] text-brand-200'>
                            <FiZap className='shrink-0 text-brand-300' />
                            <span className='truncate'>Generate a dashboard with charts &amp; auth</span>
                            <FiArrowRight className='ml-auto shrink-0 text-brand-300' />
                        </div>
                    </div>
                </div>

                <div className='flex items-center gap-4 border-t border-white/8 px-4 py-2 font-mono text-[10.5px] text-slate-500'>
                    <span className='flex items-center gap-1.5 text-emerald-400'><FiCheck /> main</span>
                    <span className='flex items-center gap-1.5'><FiGitBranch /> 0 problems</span>
                    <span className='ml-auto flex items-center gap-1.5'><FiTerminal /> NexPulse AI: ready</span>
                </div>
            </div>

            <div className='absolute -bottom-6 -left-4 hidden w-52 rounded-xl border border-white/10 bg-ink-800/90 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:block'>
                <div className='flex items-center gap-2'>
                    <span className='flex h-6 w-6 items-center justify-center rounded-md bg-linear-to-br from-brand-500 to-brand-700 text-white'><Logo variant='white' className='h-3.5 w-3.5' /></span>
                    <span className='text-[11.5px] font-medium text-slate-200'>NexPulse</span>
                    <span className='ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400' />
                </div>
                <p className='mt-2 text-[11px] leading-relaxed text-slate-400'>
                    Added auth guard and 3 components. <span className='text-brand-300'>Run tests?</span>
                </p>
            </div>
        </div>
    )
}

export default CodeWindow
