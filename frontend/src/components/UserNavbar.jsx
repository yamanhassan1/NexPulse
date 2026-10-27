import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiLogOut, FiMoon, FiSun } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import Logo from "./Logo";
import { logout } from "../features/logout";
import { setUserData } from "../redux/userSlice";

const UserNavbar = () => {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === "undefined") return true
        const theme = window.localStorage.getItem("theme")
        return theme ? theme === "dark" : true
    })
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)
    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)
    const name = userData?.name?.trim() || "Guest"
    const email = userData?.email
    const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?"

    const handleLogout = async () => {
        setMenuOpen(false)
        try {
            await logout()
        } finally {
            dispatch(setUserData(null))
        }
    }

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark)
    }, [isDark])

    useEffect(() => {
        if (!menuOpen) return

        const handlePointerDown = (event) => {
            if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
        }
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setMenuOpen(false)
        }

        document.addEventListener("mousedown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("mousedown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [menuOpen])

    const toggleTheme = () => {
        const next = !isDark
        setIsDark(next)
        window.localStorage.setItem("theme", next ? "dark" : "light")
    }

    return (
        <header className="relative z-30 flex h-16 w-full shrink-0 items-center gap-4 border-b border-slate-200/70 bg-white/80 px-4 font-sans backdrop-blur-xl transition-colors duration-300 sm:px-6 dark:border-white/[0.07] dark:bg-white/3">
            <div className="flex items-center gap-2.5 shrink-0">
                <Logo className="h-7 w-7" variant={isDark ? "white" : "color"} />
                <span className="tracking-tight text-slate-900 dark:text-white font-bold text-[17px]">NexPulse</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    title={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/6 dark:hover:text-white"
                >
                    {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                </button>
                <div ref={menuRef} className="relative ml-1">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(p => !p)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        className="flex h-10 max-w-[16rem] items-center gap-2 rounded-lg py-1 pl-1.5 pr-2.5 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-white/6"
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-brand-700 ring-1 ring-black/5 dark:ring-white/20">
                            <span className="text-[13px] font-semibold text-white">{initials}</span>
                        </div>
                        <span className="hidden min-w-0 truncate text-[13.5px] font-medium text-slate-700 sm:inline dark:text-slate-200">{name}</span>
                        <FiChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-150 dark:text-slate-500 ${menuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white/95 py-1.5 shadow-xl shadow-slate-900/5 backdrop-blur-xl animate-menu-in dark:border-white/10 dark:bg-ink-850/95 dark:shadow-black/40"
                        >
                            <div className="flex items-center gap-2.5 border-b border-slate-100 px-3.5 py-2.5 dark:border-white/6">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-brand-700 ring-1 ring-black/5 dark:ring-white/20">
                                    <span className="text-[13px] font-semibold text-white">{initials}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">{name}</p>
                                    {email && (
                                        <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{email}</p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                role="menuitem"
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-red-500 transition-colors duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                                <FiLogOut size={15} />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default UserNavbar
