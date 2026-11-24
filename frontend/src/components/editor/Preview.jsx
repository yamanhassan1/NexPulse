import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2, Maximize2, Minimize2, RotateCw } from "lucide-react"
import { getFile } from "../../features/file"

const extensionOf = (name = "") => name.split(".").pop()?.toLowerCase() ?? ""

const isExternalReference = (reference) =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/|#|data:)/i.test(reference.trim())

const getAttribute = (tag, name) => {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag)
  return match ? match[1] ?? match[2] ?? match[3] ?? "" : ""
}

const removeProjectAssetReferences = (html) => {
  const withoutStylesheets = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const isStylesheet = getAttribute(tag, "rel").toLowerCase().split(/\s+/).includes("stylesheet")
    const href = getAttribute(tag, "href")
    return isStylesheet && href && !isExternalReference(href) ? "" : tag
  })

  return withoutStylesheets.replace(
    /<script\b([^>]*?)\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>[\s\S]*?<\/script\s*>/gi,
    (tag, _before, doubleQuoted, singleQuoted, unquoted) => {
      const source = doubleQuoted ?? singleQuoted ?? unquoted ?? ""
      return source && !isExternalReference(source) ? "" : tag
    },
  )
}

const addAssetsToDocument = (sourceHtml, css, js) => {
  let html = removeProjectAssetReferences(sourceHtml)

  if (css) {
    const styleTag = `<style>\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>`
    html = html.includes("</head>")
      ? html.replace("</head>", `${styleTag}</head>`)
      : `${styleTag}${html}`
  }

  if (js) {
    const script = `<script>\n${js.replace(/<\/script/gi, String.raw`<\/script`)}\n</script>`
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

  const sourceFiles = useMemo(() => {
    const files = []
    const walk = (items = []) => {
      items.forEach((node) => {
        if (node.type === "folder") {
          walk(node.children)
          return
        }

        if (node.type === "file" && ["html", "htm", "css", "js"].includes(extensionOf(node.name))) {
          files.push(node)
        }
      })
    }

    walk(tree)
    return files
  }, [tree])

  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(async () => {
        if (cancelled) return
        setLoading(true)
        setMissingFiles([])

        const results = await Promise.all(
          sourceFiles.map(async (file) => {
            if (typeof file.content === "string") return [file._id, file.content]
            try {
              const data = await getFile(file._id)
              return [file._id, typeof data?.content === "string" ? data.content : ""]
            } catch (error) {
              console.error(`[preview] ${error.message}`)
              return [file._id, null]
            }
          }),
        )

        if (cancelled) return
        setFileContents(Object.fromEntries(results.filter(([, content]) => content !== null)))
        setMissingFiles(
          results
            .filter(([, content]) => content === null)
            .map(([id]) => sourceFiles.find((file) => file._id === id)?.name)
            .filter(Boolean),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey, sourceFiles])

  const { entryName, srcDoc } = useMemo(() => {
    let html = ""
    let css = ""
    let js = ""
    let entryName = ""

    const walk = (items = []) => {
      for (const item of items) {
        if (item.type === "file") {
          const buffer = buffers[item._id]
          const content =
            buffer && buffer.status !== "loading" && buffer.status !== "error"
              ? buffer.value
              : fileContents[item._id] ?? item.content ?? ""
          const name = item.name.toLowerCase()

          if (name === "index.html") {
            html = content
            entryName = item.name
          }
          if (name.endsWith(".css")) css = content
          if (name.endsWith(".js")) js = content
        }

        if (item.children?.length) walk(item.children)
      }
    }

    walk(tree)

    return {
      entryName,
      srcDoc: entryName ? addAssetsToDocument(html, css, js) : "",
    }
  }, [buffers, fileContents, tree])

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
          srcDoc={srcDoc}
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

export default Preview
