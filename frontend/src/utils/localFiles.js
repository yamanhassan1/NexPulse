// Reading files and folders the user drags in from their own computer.
//
// Browsers never hand over a real filesystem path, so "open from your computer"
// means: read the entries the user granted us, then recreate that structure
// through the existing file API. Text stays text; everything else is read as
// base64 so images, fonts and archives survive the round-trip.

export const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  ".parcel-cache",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  ".idea",
])

const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "mjs", "cjs", "ts", "tsx", "json", "jsonc", "css", "scss", "sass", "less",
  "html", "htm", "md", "mdx", "txt", "yml", "yaml", "xml", "csv", "toml", "ini",
  "conf", "config", "sh", "bash", "zsh", "py", "java", "kt", "kts", "go", "rs", "rb",
  "php", "c", "h", "cpp", "hpp", "cs", "swift", "sql", "graphql", "gql", "vue", "svelte",
  "astro", "prisma", "env", "gitignore", "editorconfig", "lock", "map", "svg",
])

const TEXT_FILE_NAMES = new Set([
  "dockerfile",
  "makefile",
  "procfile",
  "license",
  "licence",
  "readme",
  "changelog",
  "authors",
  ".env",
  ".gitignore",
  ".npmrc",
  ".nvmrc",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
  ".babelrc",
])

const MIME_BY_EXTENSION = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
  wasm: "application/wasm",
}

export const MAX_IMPORT_FILES = 400
export const MAX_IMPORT_FILE_BYTES = 6 * 1024 * 1024
export const MAX_IMPORT_TOTAL_BYTES = 16 * 1024 * 1024

export const extensionOf = (path = "") => {
  const name = path.split("/").pop() ?? ""
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ""
}

export const isTextPath = (path = "") => {
  const name = (path.split("/").pop() ?? "").toLowerCase()
  if (!name) return false
  if (TEXT_FILE_NAMES.has(name)) return true

  const extension = extensionOf(name)
  // Extension-less files are usually text (LICENSE, Makefile, Dockerfile).
  return extension ? TEXT_EXTENSIONS.has(extension) : true
}

export const guessContentType = (path = "") => {
  const extension = extensionOf(path)
  if (MIME_BY_EXTENSION[extension]) return MIME_BY_EXTENSION[extension]
  return isTextPath(path) ? "text/plain; charset=utf-8" : "application/octet-stream"
}

export const shouldSkipPath = (path = "") =>
  path.split("/").some((segment) => SKIPPED_DIRECTORIES.has(segment.toLowerCase()))

const readDirectoryEntries = (entry) =>
  new Promise((resolve, reject) => {
    const reader = entry.createReader()
    const collected = []

    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(collected)
            return
          }
          collected.push(...batch)
          readBatch()
        },
        (error) => reject(error),
      )
    }

    readBatch()
  })

const readEntry = async (entry, prefix, out) => {
  if (!entry) return

  const path = prefix ? `${prefix}/${entry.name}` : entry.name

  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject))
    out.push({ path, file })
    return
  }

  if (entry.isDirectory) {
    const children = await readDirectoryEntries(entry)
    for (const child of children) {
      await readEntry(child, path, out)
    }
  }
}

/**
 * Turns a drop event's DataTransfer into [{ path, file }].
 * Falls back to flat files when the browser does not expose entries.
 */
export const readDroppedItems = async (dataTransfer) => {
  const items = Array.from(dataTransfer?.items ?? [])
  const entries = items
    .filter((item) => item.kind === "file")
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter(Boolean)

  if (!entries.length) {
    return Array.from(dataTransfer?.files ?? []).map((file) => ({ path: file.name, file }))
  }

  const out = []
  for (const entry of entries) {
    await readEntry(entry, "", out)
  }
  return out
}

/** `<input type="file" webkitdirectory>` results, as [{ path, file }]. */
export const readFileList = (fileList) =>
  Array.from(fileList ?? []).map((file) => ({
    path: file.webkitRelativePath || file.name,
    file,
  }))

const toBase64 = async (file) => {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

/**
 * Filters and reads the entries into the payload the import endpoint expects.
 * `stripRoot` removes the top folder — used when importing a whole project
 * whose folder name already becomes the project name.
 */
export const buildImportPayload = async (entries = [], { stripRoot = false } = {}) => {
  const files = []
  const skipped = { ignored: 0, tooLarge: 0, overflow: 0 }
  let totalBytes = 0

  for (const entry of entries) {
    const path = String(entry.path ?? "").replace(/\\/g, "/").replace(/^\/+/, "")
    if (!path) continue

    if (shouldSkipPath(path)) {
      skipped.ignored += 1
      continue
    }
    if (entry.file.size > MAX_IMPORT_FILE_BYTES) {
      skipped.tooLarge += 1
      continue
    }
    if (files.length >= MAX_IMPORT_FILES) {
      skipped.overflow += 1
      continue
    }
    if (totalBytes + entry.file.size > MAX_IMPORT_TOTAL_BYTES) {
      skipped.overflow += 1
      continue
    }

    const relative = stripRoot ? path.split("/").slice(1).join("/") : path
    if (!relative) continue

    const text = isTextPath(path)
    const content = text ? await entry.file.text() : await toBase64(entry.file)

    totalBytes += entry.file.size
    files.push({
      path: relative,
      content,
      encoding: text ? "utf8" : "base64",
      contentType: entry.file.type || guessContentType(path),
    })
  }

  return { files, skipped, totalBytes }
}

/** The folder name of a dropped/selected tree, used to name a new project. */
export const rootFolderName = (entries = []) => {
  const first = entries.find((entry) => entry.path?.includes("/"))
  if (!first) return ""
  return first.path.split("/")[0]
}

export const describeSkipped = (skipped = {}) => {
  const parts = []
  if (skipped.ignored) parts.push(`${skipped.ignored} ignored (build/dependency folders)`)
  if (skipped.tooLarge) parts.push(`${skipped.tooLarge} over the size limit`)
  if (skipped.overflow) parts.push(`${skipped.overflow} over the count/size budget`)
  return parts.join(", ")
}
