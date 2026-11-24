import { memo, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Loader2, Maximize2, Minimize2, RotateCw } from "lucide-react"
import { getFile } from "../../features/file"

const PREVIEW_DEBOUNCE_MS = 300

const extensionOf = (name = "") => name.split(".").pop()?.toLowerCase() ?? ""

const isExternalReference = (reference) =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/|#|data:)/i.test(reference.trim())

const getAttribute = (tag, name) => {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)
  return match ? match[1] ?? match[2] ?? match[3] ?? "" : ""
}

const normaliseRelPath = (baseDirParts, ref) => {
  const clean = ref.split(/[?#]/)[0].trim().replace(/\\/g, "/")
  if (!clean) return ""
  const parts = clean.startsWith("/") ? [] : [...baseDirParts]
  for (const seg of clean.replace(/^\/+/, "").split("/")) {
    if (!seg || seg === ".") continue
    if (seg === "..") parts.pop()
    else parts.push(seg)
  }
  return parts.join("/").toLowerCase()
}

const inlineProjectAssets = (sourceHtml, entryDirParts, filesByRelPath, fallbackCss, fallbackJs) => {
  let matchedCss = false
  let matchedJs = false

  let html = sourceHtml.replace(/<link\b[^>]*>/gi, (tag) => {
    const isStylesheet = getAttribute(tag, "rel").toLowerCase().split(/\s+/).includes("stylesheet")
    const href = getAttribute(tag, "href")
    if (!isStylesheet || !href || isExternalReference(href)) return tag

    const resolved = normaliseRelPath(entryDirParts, href)
    const cssContent = filesByRelPath.get(resolved)
    if (typeof cssContent === "string") {
      matchedCss = true
      return `<style>\n${cssContent.replace(/<\/style/gi, "<\\/style")}\n</style>`
    }
    return ""
  })

  html = html.replace(
    /<script\b([^>]*?)\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>[\s\S]*?<\/script\s*>/gi,
    (tag, _before, doubleQuoted, singleQuoted, unquoted) => {
      const source = doubleQuoted ?? singleQuoted ?? unquoted ?? ""
      if (!source || isExternalReference(source)) return tag

      const resolved = normaliseRelPath(entryDirParts, source)
      const jsContent = filesByRelPath.get(resolved)
      if (typeof jsContent === "string") {
        matchedJs = true
        return `<script>\n${jsContent.replace(/<\/script/gi, String.raw`<\/script`)}\n</script>`
      }
      return ""
    },
  )

  if (!matchedCss && fallbackCss) {
    const styleTag = `<style>\n${fallbackCss.replace(/<\/style/gi, "<\\/style")}\n</style>`
    html = html.includes("</head>")
      ? html.replace("</head>", `${styleTag}</head>`)
      : `${styleTag}${html}`
  }

  if (!matchedJs && fallbackJs) {
    const script = `<script>\n${fallbackJs.replace(/<\/script/gi, String.raw`<\/script`)}\n</script>`
    html = html.includes("</body>")
      ? html.replace("</body>", `${script}</body>`)
      : `${html}${script}`
  }

  return html
}

function Preview({ tree = [], buffers = {} }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [fileContents, setFileContents] = useState({})
  const [missingFiles, setMissingFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [debouncedSrcDoc, setDebouncedSrcDoc] = useState("")

  const cacheRef = useRef({})
  const buffersRef = useRef(buffers)
  useEffect(() => {
    buffersRef.current = buffers
  }, [buffers])

  const sourceFiles = useMemo(() => {
    const files = []
    const walk = (items = [], parentParts = []) => {
      items.forEach((node) => {
        const nextParts = [...parentParts, node.name]
        if (node.type === "folder") {
          walk(node.children, nextParts)
          return
        }

        if (node.type === "file" && ["html", "htm", "css", "js"].includes(extensionOf(node.name))) {
          files.push({ node, pathParts: nextParts })
        }
      })
    }

    walk(tree)
    return files
  }, [tree])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const forceReload = refreshKey > 0

    Promise.resolve()
      .then(async () => {
        if (cancelled) return
        const missing = []
        const fetched = {}
        const toFetch = []

        for (const { node } of sourceFiles) {
          const buf = buffersRef.current[node._id]
          if (buf && buf.status !== "loading" && buf.status !== "error") {
            fetched[node._id] = buf.value
            continue
          }
          if (typeof node.content === "string") {
            fetched[node._id] = node.content
            continue
          }
          if (!forceReload && typeof cacheRef.current[node._id] === "string") {
            fetched[node._id] = cacheRef.current[node._id]
            continue
          }
          toFetch.push(node)
        }

        if (toFetch.length) {
          setLoading(true)
          const results = await Promise.all(
            toFetch.map(async (file) => {
              try {
                const data = await getFile(file._id, { signal: controller.signal })
                return [file._id, typeof data?.content === "string" ? data.content : ""]
              } catch (error) {
                if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
                  return [file._id, cacheRef.current[file._id] ?? null]
                }
                console.error(`[preview] ${error.message}`)
                return [file._id, null]
              }
            }),
          )

          if (cancelled) return
          for (const [id, content] of results) {
            if (content !== null) {
              fetched[id] = content
              cacheRef.current[id] = content
            } else {
              const name = sourceFiles.find((item) => item.node._id === id)?.node?.name
              if (name) missing.push(name)
            }
          }
        }

        if (cancelled) return
        setFileContents(fetched)
        setMissingFiles(missing)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [refreshKey, sourceFiles])

  const { entryName, srcDoc } = useMemo(() => {
    let html = ""
    let entryName = ""
    let entryDirParts = []
    const cssParts = []
    const jsParts = []
    const filesByRelPath = new Map()

    for (const { node, pathParts } of sourceFiles) {
      const buffer = buffers[node._id]
      const content =
        buffer && buffer.status !== "loading" && buffer.status !== "error"
          ? buffer.value
          : fileContents[node._id] ?? node.content ?? ""

      // Strip the top project root folder name so relative paths from index.html work.
      const relWithoutRoot = pathParts.slice(1).join("/").toLowerCase()
      if (relWithoutRoot) filesByRelPath.set(relWithoutRoot, content)
      filesByRelPath.set(pathParts.join("/").toLowerCase(), content)

      const name = node.name.toLowerCase()
      if (name === "index.html" && !entryName) {
        html = content
        entryName = node.name
        entryDirParts = pathParts.slice(1, -1)
      } else if (name.endsWith(".css")) {
        cssParts.push(content)
      } else if (name.endsWith(".js")) {
        jsParts.push(content)
      }
    }

    return {
      entryName,
      srcDoc: entryName
        ? inlineProjectAssets(
            html,
            entryDirParts,
            filesByRelPath,
            cssParts.join("\n"),
            jsParts.join("\n"),
          )
        : "",
    }
  }, [buffers, fileContents, sourceFiles])

  // Debounce iframe reloads while typing so rapid keystrokes never flicker or freeze the frame.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSrcDoc(srcDoc)
    }, PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [srcDoc])

  const effectiveSrcDoc = debouncedSrcDoc || srcDoc

  useEffect(() => {
    if (!isFullscreen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsFullscreen(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen])

  return (
    <section
      aria-label="Preview"
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-line dark:border-line-dark ${
        isFullscreen
          ? "fixed inset-0 z-[90] bg-panel dark:bg-ink-950"
          : "max-lg:border-t lg:w-[42%] lg:flex-none lg:border-l"
      }`}
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-line px-3 dark:border-line-dark">
        <span className="truncate text-[11.5px] font-medium text-muted dark:text-mist-muted">
          {entryName || "Preview"}
        </span>
        <div className="flex items-center gap-2">
          {loading && (
            <Loader2
              size={13}
              className="animate-spin text-subtle dark:text-faint"
              aria-label="Loading preview files"
            />
          )}
          {missingFiles.length > 0 && (
            <span
              className="flex items-center gap-1 text-[10.5px] text-amber-700 dark:text-amber-300"
              title={`Could not load: ${missingFiles.join(", ")}`}
            >
              <AlertTriangle size={12} />
              {missingFiles.length} unavailable
            </span>
          )}
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            aria-label="Refresh preview"
            title="Refresh preview"
            className="rounded p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
          >
            <RotateCw size={13} />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((current) => !current)}
            aria-label={isFullscreen ? "Exit full-screen preview" : "View preview full screen"}
            aria-pressed={isFullscreen}
            title={isFullscreen ? "Exit full screen (Esc)" : "View full screen"}
            className="rounded p-1 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {entryName ? (
        <iframe
          title={`Preview of ${entryName}`}
          srcDoc={effectiveSrcDoc}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="min-h-0 flex-1 border-0 bg-white"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-subtle dark:text-faint">
          Add an HTML file to the project to see its preview.
        </div>
      )}
    </section>
  )
}

export default memo(Preview)
