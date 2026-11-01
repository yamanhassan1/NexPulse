import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getFile, updateFile } from "../features/file"

const SAVE_DELAY_MS = 700
const MAX_RECENTS = 12

const recentsKey = (projectId) => `nexpulse:recents:${projectId}`
const tabsKey = (projectId) => `nexpulse:tabs:${projectId}`

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
    /* storage can be unavailable; recents are a convenience, not state we own */
  }
}

const MAX_RESTORED_TABS = 12

/** Reopens the tabs that were open last time, so a reload is not destructive. */
const readStoredSession = (projectId) => {
  const stored = readJson(tabsKey(projectId), null)
  if (!stored || !Array.isArray(stored.tabs)) return { tabs: [], activeId: null }

  const tabs = stored.tabs
    .filter((tab) => tab && typeof tab.id === "string" && typeof tab.name === "string")
    .slice(0, MAX_RESTORED_TABS)
    .map((tab) => ({ id: tab.id, name: tab.name, relPath: tab.relPath ?? tab.name }))

  const activeId = tabs.some((tab) => tab.id === stored.activeId)
    ? stored.activeId
    : tabs[0]?.id ?? null

  return { tabs, activeId }
}

const emptyBuffer = (status = "loading") => ({
  value: "",
  saved: "",
  status,
  error: "",
})

/**
 * Owns everything about "which files are open": tabs, the active tab, per-file
 * buffers (so switching tabs never loses unsaved text), autosave, the recently
 * opened list, and a stack of recently closed tabs for reopen.
 */
export function useFileTabs({ projectId, pushToast }) {
  const [session, setSession] = useState(() => readStoredSession(projectId))
  const [buffers, setBuffers] = useState(() => {
    const { tabs } = readStoredSession(projectId)
    return Object.fromEntries(tabs.map((tab) => [tab.id, emptyBuffer()]))
  })
  const [recents, setRecents] = useState(() => readJson(recentsKey(projectId), []))

  const buffersRef = useRef(buffers)
  const loadingRef = useRef(new Set())
  const saveTimersRef = useRef(new Map())
  const closedRef = useRef([])

  // Keep a ref mirror so timers and unmount cleanup can read the latest text
  // without being re-created on every keystroke.
  useEffect(() => {
    buffersRef.current = buffers
  }, [buffers])

  const load = useCallback(async (id) => {
    if (!id || loadingRef.current.has(id)) return
    loadingRef.current.add(id)

    try {
      const data = await getFile(id)
      const text = typeof data?.content === "string" ? data.content : ""
      setBuffers((current) => ({
        ...current,
        [id]: { value: text, saved: text, status: "ready", error: "" },
      }))
    } catch (error) {
      console.error(`[file] ${error.message}`)
      const missing = error.response?.status === 404
      setBuffers((current) => ({
        ...current,
        [id]: {
          value: "",
          saved: "",
          status: "error",
          error: missing
            ? "This file no longer exists."
            : "Could not open this file. Check your connection.",
        },
      }))
    } finally {
      loadingRef.current.delete(id)
    }
  }, [])

  // Restored tabs start as "loading". Fetching happens in a promise callback,
  // so nothing is set synchronously inside the effect.
  const restoredIdsRef = useRef(session.tabs.map((tab) => tab.id))
  useEffect(() => {
    restoredIdsRef.current.forEach((id) => {
      load(id)
    })
  }, [load])

  useEffect(() => {
    writeJson(tabsKey(projectId), { tabs: session.tabs, activeId: session.activeId })
  }, [projectId, session])

  const saveNow = useCallback(
    async (id) => {
      const buffer = buffersRef.current[id]
      if (!buffer || buffer.status === "loading" || buffer.status === "error") return
      if (buffer.value === buffer.saved) return

      const text = buffer.value
      setBuffers((current) =>
        current[id] ? { ...current, [id]: { ...current[id], status: "saving" } } : current,
      )

      try {
        await updateFile(id, { content: text })
        setBuffers((current) => {
          if (!current[id]) return current
          const latest = current[id]
          return {
            ...current,
            [id]: {
              ...latest,
              saved: text,
              // If the user kept typing during the request, stay dirty.
              status: latest.value === text ? "saved" : "dirty",
            },
          }
        })
      } catch (error) {
        console.error(`[save] ${error.message}`)
        setBuffers((current) =>
          current[id]
            ? {
                ...current,
                [id]: { ...current[id], status: "error", error: "Could not save changes." },
              }
            : current,
        )
        pushToast("Could not save your changes.", { variant: "error" })
      }
    },
    [pushToast],
  )

  const scheduleSave = useCallback(
    (id) => {
      const timers = saveTimersRef.current
      if (timers.has(id)) clearTimeout(timers.get(id))
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id)
          saveNow(id)
        }, SAVE_DELAY_MS),
      )
    },
    [saveNow],
  )

  // Best effort flush when leaving the project so a debounce window cannot
  // discard the last edit.
  useEffect(() => {
    const timers = saveTimersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
      Object.entries(buffersRef.current).forEach(([id, buffer]) => {
        if (buffer.status !== "loading" && buffer.status !== "error" && buffer.value !== buffer.saved) {
          updateFile(id, { content: buffer.value }).catch(() => {})
        }
      })
    }
  }, [])

  // A reload inside the autosave window would otherwise silently drop the
  // newest keystrokes, so ask the browser to confirm while anything is dirty.
  useEffect(() => {
    const onBeforeUnload = (event) => {
      const dirty = Object.values(buffersRef.current).some(
        (buffer) =>
          buffer.status !== "loading" && buffer.status !== "error" && buffer.value !== buffer.saved,
      )
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  const rememberRecent = useCallback(
    (entry) => {
      setRecents((current) => {
        const next = [
          {
            id: entry.node._id,
            name: entry.node.name,
            relPath: entry.relPath,
            at: Date.now(),
          },
          ...current.filter((item) => item.id !== entry.node._id),
        ].slice(0, MAX_RECENTS)

        writeJson(recentsKey(projectId), next)
        return next
      })
    },
    [projectId],
  )

  const openFile = useCallback(
    (entry) => {
      if (!entry?.node || entry.node.type !== "file") return
      const node = entry.node

      setSession((current) => {
        const exists = current.tabs.some((tab) => tab.id === node._id)
        const tab = {
          id: node._id,
          name: node.name,
          relPath: entry.relPath,
        }
        return {
          tabs: exists ? current.tabs : [...current.tabs, tab],
          activeId: node._id,
        }
      })

      if (!buffersRef.current[node._id]) {
        setBuffers((current) =>
          current[node._id] ? current : { ...current, [node._id]: emptyBuffer() },
        )
        load(node._id)
      }

      rememberRecent(entry)
    },
    [load, rememberRecent],
  )

  const closeTab = useCallback(
    (id) => {
      const buffer = buffersRef.current[id]
      if (buffer && buffer.value !== buffer.saved) saveNow(id)

      setSession((current) => {
        const index = current.tabs.findIndex((tab) => tab.id === id)
        if (index === -1) return current
        const closed = current.tabs[index]
        closedRef.current = [...closedRef.current.slice(-19), closed]

        const tabs = current.tabs.filter((tab) => tab.id !== id)
        const activeId =
          current.activeId === id ? tabs[Math.min(index, tabs.length - 1)]?.id ?? null : current.activeId

        return { tabs, activeId }
      })
    },
    [saveNow],
  )

  const closeOthers = useCallback(
    (id) => {
      setSession((current) => {
        const kept = current.tabs.filter((tab) => tab.id === id)
        const dropped = current.tabs.filter((tab) => tab.id !== id)
        closedRef.current = [...closedRef.current.slice(-19), ...dropped]
        return { tabs: kept, activeId: kept[0]?.id ?? null }
      })
    },
    [],
  )

  const closeAll = useCallback(() => {
    setSession((current) => {
      closedRef.current = [...closedRef.current.slice(-19), ...current.tabs]
      return { tabs: [], activeId: null }
    })
  }, [])

  const activate = useCallback((id) => {
    setSession((current) => (current.tabs.some((tab) => tab.id === id) ? { ...current, activeId: id } : current))
  }, [])

  const moveTab = useCallback((fromId, toId) => {
    if (fromId === toId) return
    setSession((current) => {
      const from = current.tabs.findIndex((tab) => tab.id === fromId)
      const to = current.tabs.findIndex((tab) => tab.id === toId)
      if (from === -1 || to === -1) return current

      const tabs = [...current.tabs]
      const [moved] = tabs.splice(from, 1)
      tabs.splice(to, 0, moved)
      return { ...current, tabs }
    })
  }, [])

  const reopenClosed = useCallback(() => {
    const tab = closedRef.current.pop()
    if (!tab) return false

    setSession((current) => ({
      tabs: current.tabs.some((item) => item.id === tab.id) ? current.tabs : [...current.tabs, tab],
      activeId: tab.id,
    }))
    if (!buffersRef.current[tab.id]) {
      setBuffers((current) => (current[tab.id] ? current : { ...current, [tab.id]: emptyBuffer() }))
      load(tab.id)
    }
    return true
  }, [load])

  const updateValue = useCallback(
    (id, value) => {
      setBuffers((current) => {
        const buffer = current[id]
        if (!buffer) return current
        return {
          ...current,
          [id]: {
            ...buffer,
            value,
            status: value === buffer.saved ? "ready" : "dirty",
            error: "",
          },
        }
      })
      scheduleSave(id)
    },
    [scheduleSave],
  )

  const clearRecents = useCallback(() => {
    writeJson(recentsKey(projectId), [])
    setRecents([])
  }, [projectId])

  const activeTab = useMemo(
    () => session.tabs.find((tab) => tab.id === session.activeId) ?? null,
    [session],
  )

  const activeBuffer = activeTab ? buffers[activeTab.id] ?? emptyBuffer() : null

  const dirtyIds = useMemo(
    () =>
      Object.entries(buffers)
        .filter(([, buffer]) => buffer.value !== buffer.saved && buffer.status !== "loading")
        .map(([id]) => id),
    [buffers],
  )

  return {
    tabs: session.tabs,
    activeId: session.activeId,
    activeTab,
    activeBuffer,
    buffers,
    dirtyIds,
    recents,
    openFile,
    closeTab,
    closeOthers,
    closeAll,
    activate,
    moveTab,
    reopenClosed,
    updateValue,
    saveNow,
    clearRecents,
  }
}
