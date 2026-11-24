import { useEffect, useRef, useState } from "react"

/**
 * The explorer's inline name field, used for both creating and renaming — the
 * way VS Code and Cursor do it. Enter commits, Escape cancels, blur commits.
 */
function InlineNameInput({
  initialValue = "",
  kind = "file",
  depth = 0,
  indent = 16,
  padded = true,
  onCommit,
  onCancel,
}) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const commit = async () => {
    if (saving || cancelledRef.current) return

    const trimmed = value.trim()
    if (!trimmed) {
      onCancel?.()
      return
    }
    if (trimmed === initialValue) {
      onCancel?.()
      return
    }
    if (/[\\/]/.test(trimmed)) {
      setError("Names cannot contain slashes.")
      return
    }

    setSaving(true)
    setError("")
    try {
      await onCommit?.(trimmed)
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save that name.")
      setSaving(false)
      inputRef.current?.focus()
    }
  }

  const cancel = () => {
    cancelledRef.current = true
    onCancel?.()
  }

  const input = (
    <input
      ref={inputRef}
      value={value}
      onChange={(event) => {
        setValue(event.target.value)
        setError("")
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          commit()
        } else if (event.key === "Escape") {
          event.preventDefault()
          cancel()
        }
      }}
      onBlur={() => {
        if (!cancelledRef.current) commit()
      }}
      onClick={(event) => event.stopPropagation()}
      disabled={saving}
      spellCheck={false}
      aria-label={kind === "folder" ? "Folder name" : "File name"}
      placeholder={kind === "folder" ? "folder-name" : "file-name.js"}
      className="w-full min-w-0 rounded border border-brand-400/70 bg-panel px-1.5 py-0.5 text-[12.5px] text-graphite outline-none ring-2 ring-brand-400/20 disabled:opacity-60 dark:bg-ink-800 dark:text-mist"
    />
  )

  if (!padded) {
    return (
      <div className="min-w-0 flex-1">
        {input}
        {error && <p className="mt-0.5 text-[10.5px] text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="pr-2" style={{ paddingLeft: `${depth * indent + 22}px` }}>
      {input}
      {error && <p className="mt-0.5 pl-1 text-[10.5px] text-red-500">{error}</p>}
    </div>
  )
}

export default InlineNameInput
