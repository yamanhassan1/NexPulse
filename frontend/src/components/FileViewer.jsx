import { useEffect, useState } from "react"
import { Download, FileWarning, Loader2 } from "lucide-react"
import CodeEditor from "./editor/CodeEditor"
import { getRawFile } from "../features/file"
import { formatBytes } from "../utils/formatCode"
import { DEFAULT_SETTINGS } from "../utils/editorSettings"

/** Images and other binaries are fetched as a blob so the cookie is sent. */
function BinaryPreview({ file }) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const contentType = file.contentType || ""
  // Mirrors the server allowlist: only raster images are served inline, so
  // an uploaded SVG is offered as a download instead of being rendered.
  const isImage = /^image\/(png|jpe?g|gif|webp|avif|bmp|x-icon)$/i.test(contentType)

  useEffect(() => {
    let cancelled = false
    let objectUrl = ""

    getRawFile(file._id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(`[raw] ${err.message}`)
          setError("Could not load this file.")
        }
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file._id])

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-auto px-6 py-8">
      {isImage ? (
        error ? (
          <p className="text-[12.5px] text-red-600 dark:text-red-400">{error}</p>
        ) : url ? (
          <img
            src={url}
            alt={file.name}
            className="max-h-full max-w-full rounded-lg border border-line object-contain dark:border-line-dark"
          />
        ) : (
          <Loader2 className="animate-spin text-subtle dark:text-faint" aria-label="Loading image" />
        )
      ) : (
        <div className="flex max-w-xs flex-col items-center gap-2 text-center">
          <FileWarning size={26} className="text-subtle dark:text-faint" />
          <p className="text-[13px] font-medium text-graphite dark:text-mist">
            No preview for this file type
          </p>
          <p className="text-[11.5px] leading-relaxed text-muted dark:text-mist-muted">
            {contentType || "Binary file"} · {formatBytes(file.size)}
          </p>
        </div>
      )}

      <a
        href={url || undefined}
        download={file.name}
        aria-disabled={!url}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-graphite dark:border-line-dark dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist ${!url ? "pointer-events-none opacity-40" : ""}`}
      >
        <Download size={13} />
        Download
      </a>
    </div>
  )
}

function FileViewer({
  file,
  value = "",
  onChange,
  preview = false,
  status = "ready",
  error = "",
  language = "plain",
  settings = DEFAULT_SETTINGS,
  onSettingsChange,
  saveStatus = "saved",
  onSave,
  eol = "LF",
}) {
  const name = file?.name ?? ""

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="animate-spin text-subtle dark:text-faint" aria-label="Opening file" />
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <FileWarning size={26} className="text-red-500/70 dark:text-red-400/70" />
        <p className="text-[12.5px] text-red-600 dark:text-red-400">{error}</p>
        <p className="max-w-xs text-[11.5px] leading-relaxed text-subtle dark:text-faint">
          It may have been deleted or renamed in another tab.
        </p>
      </div>
    )
  }

  if (file?.encoding === "base64") {
    return <BinaryPreview file={file} />
  }

  return (
    <CodeEditor
      value={value}
      onChange={onChange}
      language={language}
      fileName={name}
      settings={settings}
      onSettingsChange={onSettingsChange}
      saveStatus={saveStatus}
      onSave={onSave}
      eol={eol}
      readOnly={preview}
      ariaLabel={preview ? `Preview of ${name}` : `Contents of ${name}`}
    />
  )
}

export default FileViewer
