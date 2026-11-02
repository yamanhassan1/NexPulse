import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Loader2, RotateCw, X } from "lucide-react"
import { getFile } from "../features/file"
import { languageOf } from "../utils/highlight"
import { renderJson, renderMarkdown } from "../utils/markdown"
import { collectPreviewRefs, inlinePreviewDocument } from "../utils/preview"

const extensionOf = (name = "") => {
  const base = name.split("/").pop() ?? ""
  const dot = base.lastIndexOf(".")
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ""
}

/**
 * The preview panel renders the open file instead of showing it as code:
 * Markdown becomes HTML, HTML renders in a sandboxed frame, JSON is formatted,
 * anything else falls back to plain text.
 */
function PreviewPanel({
  file,
  value = "",
  projectEntries = [],
  filePath = "",
  buffers = {},
  onClose,
}) {
  const name = file?.name ?? ""
  const extension = extensionOf(name)
  const language = languageOf(name)
  const isHtml = extension === "html" || extension === "htm"
  const isSvg = extension === "svg"
  const isBinary = file?.encoding === "base64"

  const svgSource = useMemo(
    () => (isSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}` : ""),
    [isSvg, value],
  )

  const openInBrowser = () => {
    const url = URL.createObjectURL(new Blob([linked.html], { type: "text/html" }))
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [bundled, setBundled] = useState({
    html: "",
    source: null,
    filePath: null,
    refreshKey: -1,
    missing: [],
  })

  const entryByPath = useMemo(
    () => new Map(projectEntries.map((entry) => [entry.path, entry])),
    [projectEntries],
  )
  const bufferByPath = useMemo(
    () => new Map(projectEntries.map((entry) => [entry.path, buffers[entry.id]])),
    [buffers, projectEntries],
  )

  useEffect(() => {
    if (!isHtml) return undefined

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      const refs = collectPreviewRefs(value, filePath, projectEntries)
      const paths = [...new Set(refs.map((ref) => ref.path).filter(Boolean))]
      const contents = {}

      await Promise.all(
        paths.map(async (path) => {
          const buffer = bufferByPath.get(path)
          if (buffer && buffer.status !== "loading" && buffer.status !== "error") {
            contents[path] = buffer.value
            return
          }

          const entry = entryByPath.get(path)
          if (!entry?.id) return

          try {
            const data = await getFile(entry.id)
            contents[path] = typeof data?.content === "string" ? data.content : ""
          } catch (error) {
            console.error(`[preview] ${error.message}`)
          }
        }),
      )

      if (cancelled) return
      const result = inlinePreviewDocument({
        html: value,
        filePath,
        projectEntries,
        contents,
      })
      setBundled({
        html: result.html,
        source: value,
        filePath,
        refreshKey,
        missing: result.missing,
      })
      setLoading(false)
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [bufferByPath, entryByPath, filePath, isHtml, projectEntries, refreshKey, value])

  const markdown = useMemo(
    () => (language === "markdown" ? renderMarkdown(value) : ""),
    [language, value],
  )

  const json = useMemo(() => (language === "json" ? renderJson(value) : ""), [language, value])

  const linked =
    bundled.source === value && bundled.filePath === filePath && bundled.refreshKey === refreshKey
      ? bundled
      : { html: value, missing: [] }

  let body
  if (isBinary) {
    body = (
      <p className="px-4 py-6 text-center text-[12px] text-subtle dark:text-faint">
        Binary files have their own preview in the editor pane.
      </p>
    )
  } else if (isHtml) {
    body = (
      <iframe
        title={`Preview of ${name}`}
        srcDoc={linked.html}
        sandbox="allow-scripts"
        className="h-full w-full border-0 bg-white"
      />
    )
  } else if (isSvg) {
    body = (
      <div className="flex h-full items-center justify-center overflow-auto bg-white p-4">
        <img src={svgSource} alt={`Preview of ${name}`} className="max-h-full max-w-full" />
      </div>
    )
  } else if (language === "markdown") {
    body = (
      <div
        className="md-preview px-5 py-4"
        // renderMarkdown escapes all source text before emitting its own tags.
        dangerouslySetInnerHTML={{ __html: markdown }}
      />
    )
  } else if (language === "json") {
    body = (
      <pre className="px-4 py-3 font-mono text-[12px] leading-relaxed text-graphite dark:text-mist">
        {json}
      </pre>
    )
  } else {
    body = (
      <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono text-[12px] leading-relaxed text-graphite dark:text-mist">
        {value || "This file is empty."}
      </pre>
    )
  }

  return (
    <aside
      aria-label="Preview"
      className="flex min-h-0 min-w-0 flex-col border-line bg-panel/40 dark:border-line-dark dark:bg-ink-900/40 max-lg:border-t lg:w-[42%] lg:border-l"
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-line px-2.5 dark:border-line-dark">
        <span className="truncate text-[11.5px] font-semibold uppercase tracking-wide text-subtle dark:text-faint">
          Preview
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {isHtml && loading && (
            <Loader2
              size={12}
              className="animate-spin text-subtle dark:text-faint"
              aria-label="Refreshing preview"
            />
          )}
          {isHtml && (
            <>
              <button
                type="button"
                onClick={openInBrowser}
                aria-label="Open preview in a new tab"
                title="Open preview in a new tab"
                className="rounded p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
              >
                <ExternalLink size={13} />
              </button>
              <button
                type="button"
                onClick={() => setRefreshKey((current) => current + 1)}
                aria-label="Refresh preview"
                title="Refresh preview"
                className="rounded p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
              >
                <RotateCw size={13} />
              </button>
            </>
          )}
          {linked.missing.length > 0 && (
            <span
              title={`Not found: ${linked.missing.join(", ")}`}
              className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700 dark:text-amber-300"
            >
              {linked.missing.length} missing
            </span>
          )}
          <span className="max-w-40 truncate text-[11px] text-subtle dark:text-faint">{name}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">{body}</div>
    </aside>
  )
}

export default PreviewPanel
