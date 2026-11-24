import { Suspense, lazy, useState } from "react"
import { useTheme } from "../../hooks/themeContext.js"

const ThemeSwitcher = lazy(() => import("./ThemeSwitcher.jsx"))

function ThemeSwitcherHost() {
  const { switcherOpen } = useTheme()
  const [hasOpened, setHasOpened] = useState(false)

  // Latch once opened so AnimatePresence exit animations continue working
  // after the first open without eagerly bundling ThemeSwitcher at startup.
  if (switcherOpen && !hasOpened) {
    setHasOpened(true)
  }

  if (!hasOpened && !switcherOpen) return null

  return (
    <Suspense fallback={null}>
      <ThemeSwitcher />
    </Suspense>
  )
}

export default ThemeSwitcherHost
