import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiLogOut } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { logout } from "../features/logout";
import { setUserData } from "../redux/userSlice";
import { clearProjects } from "../redux/projectSlice";

const UserNavbar = () => {
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

    return (
        <header className="relative z-30 flex h-16 w-full shrink-0 items-center gap-4 border-b border-line bg-panel px-4 font-sans transition-colors duration-200 sm:px-6 dark:border-line-dark dark:bg-ink-900">
            <div className="flex items-center gap-2.5 shrink-0">
                <Logo className="h-7 w-7" />
                <span className="tracking-tight text-graphite dark:text-mist font-semibold text-[17px]">NexPulse</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0">
                <ThemeToggle />
                <div ref={menuRef} className="relative ml-1">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(p => !p)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        className="flex h-10 max-w-[16rem] items-center gap-2 rounded-lg py-1 pl-1.5 pr-2.5 transition-colors duration-150 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:hover:bg-ink-800"
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-400 to-brand-600">
                            <span className="text-[13px] font-semibold text-white">{initials}</span>
                        </div>
                        <span className="hidden min-w-0 truncate text-[13.5px] text-graphite sm:inline dark:text-mist">{name}</span>
                        <FiChevronDown size={14} className={`shrink-0 text-subtle transition-transform duration-150 dark:text-faint ${menuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-lg border border-line bg-panel py-1 animate-menu-in dark:border-line-dark dark:bg-ink-850"
                        >
                            <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5 dark:border-line-dark">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-400 to-brand-600">
                                    <span className="text-[13px] font-semibold text-white">{initials}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] text-graphite dark:text-mist">{name}</p>
                                    {email && (
                                        <p className="truncate text-[11px] text-subtle dark:text-faint">{email}</p>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                role="menuitem"
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-red-600 transition-colors duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10"
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
