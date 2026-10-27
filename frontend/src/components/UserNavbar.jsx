import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiLogOut, FiMoon, FiSun } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import Logo from "./Logo";
import { logout } from "../features/logout";
import { setUserData } from "../redux/userSlice";
import { clearProjects } from "../redux/projectSlice";

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
            dispatch(clearProjects())
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
        <header className="relative z-30 flex h-16 w-full shrink-0 items-center gap-4 border-b border-[#E1E3EC] bg-white px-4 font-sans transition-colors duration-200 sm:px-6 dark:border-[#343643] dark:bg-ink-900">
            <div className="flex items-center gap-2.5 shrink-0">
                <Logo className="h-7 w-7" />
                <span className="tracking-tight text-[#20212A] dark:text-[#F5F3FA] font-semibold text-[17px]">NexPulse</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    title={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#70758A] transition-colors duration-150 hover:bg-[#F1F2F7] hover:text-[#20212A] dark:text-[#9295A7] dark:hover:bg-ink-800 dark:hover:text-[#F5F3FA]"
                >
                    {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                </button>
                <div ref={menuRef} className="relative ml-1">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(p => !p)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        className="flex h-10 max-w-[16rem] items-center gap-2 rounded-lg py-1 pl-1.5 pr-2.5 transition-colors duration-150 hover:bg-[#F1F2F7] dark:hover:bg-ink-800"
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-400 to-cyan-600">
                            <span className="text-[13px] font-semibold text-white">{initials}</span>
                        </div>
                        <span className="hidden min-w-0 truncate text-[13.5px] text-[#20212A] sm:inline dark:text-[#F5F3FA]">{name}</span>
                        <FiChevronDown size={14} className={`shrink-0 text-[#70758A] transition-transform duration-150 dark:text-[#9295A7] ${menuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-lg border border-[#E1E3EC] bg-white py-1 animate-menu-in dark:border-[#343643] dark:bg-ink-850"
                        >
                            <div className="flex items-center gap-2.5 border-b border-[#E1E3EC] px-3.5 py-2.5 dark:border-[#343643]">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-400 to-cyan-600">
                                    <span className="text-[13px] font-semibold text-white">{initials}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] text-[#20212A] dark:text-[#F5F3FA]">{name}</p>
                                    {email && (
                                        <p className="truncate text-[11px] text-[#70758A] dark:text-[#9295A7]">{email}</p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                role="menuitem"
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-[#B42318] transition-colors duration-150 hover:bg-[#FEF2F2] dark:text-[#F87171] dark:hover:bg-[#F87171]/10"
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
