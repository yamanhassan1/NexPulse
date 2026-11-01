import { useCallback, useEffect, useMemo, useState } from "react"
import { ThemeContext } from "./themeContext"
import {
  BUILT_IN_THEMES,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  defaultThemeForType,
  getTheme,
  normaliseTheme,
  themeVariables,
  validateTheme,
} from "../themes/themes"

const KEYS = {
  theme: "nexpulse:theme",
  follow: "nexpulse:theme:follow-system",
  favorites: "nexpulse:theme:favorites",
  recents: "nexpulse:theme:recents",
  custom: "nexpulse:themes:custom",
  vars: "nexpulse:theme:vars",
  legacy: "theme",
}

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* preferences are a convenience; the app still works without storage */
  }
}

const ALL_BUILT_INS = BUILT_IN_THEMES.map(normaliseTheme)

const readStoredThemeId = () => {
  const stored = readJson(KEYS.theme, null)
  if (typeof stored === "string" && stored) return stored

  // Migrate the old binary theme key ("dark" / "light").
  try {
    const legacy = window.localStorage.getItem(KEYS.legacy)
    if (legacy === "light") return DEFAULT_LIGHT_THEME
    if (legacy === "dark") return DEFAULT_DARK_THEME
  } catch {
    /* ignore */
  }

  return DEFAULT_DARK_THEME
}

const prefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches

function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(readStoredThemeId)
  const [followSystem, setFollowSystem] = useState(() => readJson(KEYS.follow, false))
  const [favorites, setFavorites] = useState(() => readJson(KEYS.favorites, []))
  const [recents, setRecents] = useState(() => readJson(KEYS.recents, []))
  const [customThemes, setCustomThemes] = useState(() =>
    readJson(KEYS.custom, []).map(normaliseTheme),
  )
  const [systemDark, setSystemDark] = useState(prefersDark)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!query) return undefined

    const onChange = (event) => setSystemDark(event.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  const themes = useMemo(() => [...ALL_BUILT_INS, ...customThemes], [customThemes])

  const resolvedId = followSystem
    ? systemDark
      ? DEFAULT_DARK_THEME
      : DEFAULT_LIGHT_THEME
    : themeId

  const theme = useMemo(
    () => themes.find((item) => item.id === resolvedId) ?? getTheme(DEFAULT_DARK_THEME),
    [resolvedId, themes],
  )

  // Apply the palette as CSS variables. Built-ins come from the generated
  // stylesheet; custom themes set the same variables inline on <html>.
  useEffect(() => {
    const root = document.documentElement
    const variables = themeVariables(theme)

    if (theme.custom) {
      Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value))
      root.dataset.theme = theme.id
      // Kept so index.html can paint a custom theme before React mounts.
      writeJson(KEYS.vars, variables)
    } else {
      Object.keys(variables).forEach((name) => root.style.removeProperty(name))
      root.dataset.theme = theme.id
      try {
        window.localStorage.removeItem(KEYS.vars)
      } catch {
        /* ignore */
      }
    }

    root.classList.toggle("dark", theme.type === "dark")
    root.style.colorScheme = theme.type
  }, [theme])

  useEffect(() => {
    writeJson(KEYS.theme, themeId)
  }, [themeId])

  useEffect(() => {
    writeJson(KEYS.follow, followSystem)
  }, [followSystem])

  useEffect(() => {
    writeJson(KEYS.favorites, favorites)
  }, [favorites])

  useEffect(() => {
    writeJson(KEYS.recents, recents)
  }, [recents])

  useEffect(() => {
    writeJson(KEYS.custom, customThemes)
  }, [customThemes])

  const rememberRecent = useCallback((id) => {
    setRecents((current) => [id, ...current.filter((item) => item !== id)].slice(0, 6))
  }, [])

  const setTheme = useCallback(
    (id) => {
      setThemeId(id)
      setFollowSystem(false)
      rememberRecent(id)
    },
    [rememberRecent],
  )

  const toggleTheme = useCallback(() => {
    const isDark = theme.type === "dark"
    const remembered = recents
      .map((id) => themes.find((item) => item.id === id))
      .find((item) => item && item.type === (isDark ? "light" : "dark"))

    const next = remembered ?? defaultThemeForType(isDark ? "light" : "dark")
    setTheme(next.id)
  }, [recents, setTheme, theme.type, themes])

  const toggleFavorite = useCallback((id) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }, [])

  const saveCustomTheme = useCallback((input) => {
    const result = validateTheme(input)
    if (!result.ok) return result

    const id = input.id?.startsWith("custom-") ? input.id : `custom-${Date.now().toString(36)}`
    const next = { ...result.theme, id, custom: true }

    setCustomThemes((current) => {
      const exists = current.some((item) => item.id === id)
      return exists ? current.map((item) => (item.id === id ? next : item)) : [...current, next]
    })

    return { ok: true, theme: next }
  }, [])

  const deleteCustomTheme = useCallback(
    (id) => {
      setCustomThemes((current) => current.filter((item) => item.id !== id))
      if (themeId === id) setThemeId(DEFAULT_DARK_THEME)
    },
    [themeId],
  )

  const duplicateTheme = useCallback(
    (id) => {
      const source = themes.find((item) => item.id === id)
      if (!source) return null

      const copy = normaliseTheme({
        ...source,
        id: "",
        name: `${source.name} copy`,
        custom: true,
      })
      const saved = saveCustomTheme(copy)
      return saved.ok ? saved.theme : null
    },
    [saveCustomTheme, themes],
  )

  const importTheme = useCallback(
    (json) => {
      let parsed
      try {
        parsed = JSON.parse(json)
      } catch {
        return { ok: false, errors: ["That file is not valid JSON"] }
      }

      return saveCustomTheme({ ...parsed, id: "", name: parsed.name || "Imported theme" })
    },
    [saveCustomTheme],
  )

  const resetPreferences = useCallback(() => {
    setFollowSystem(false)
    setThemeId(DEFAULT_DARK_THEME)
    setFavorites([])
    setRecents([])
    setCustomThemes([])
  }, [])

  const value = useMemo(
    () => ({
      themeId: theme.id,
      theme,
      themes,
      isDark: theme.type === "dark",
      followSystem,
      systemDark,
      favorites,
      recents,
      customThemes,
      switcherOpen,
      setTheme,
      toggleTheme,
      setFollowSystem,
      openSwitcher: () => setSwitcherOpen(true),
      closeSwitcher: () => setSwitcherOpen(false),
      toggleFavorite,
      saveCustomTheme,
      deleteCustomTheme,
      duplicateTheme,
      importTheme,
      resetPreferences,
    }),
    [
      customThemes,
      deleteCustomTheme,
      duplicateTheme,
      favorites,
      followSystem,
      importTheme,
      recents,
      resetPreferences,
      saveCustomTheme,
      setTheme,
      switcherOpen,
      systemDark,
      theme,
      themes,
      toggleFavorite,
      toggleTheme,
    ],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
