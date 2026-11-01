// A minimal ZIP writer (store method, no compression).
//
// No zip dependency is available offline, and the format is small enough to
// implement exactly: local file header, data, central directory, end record.
// Storing without compression keeps it simple and lossless; project sources are
// usually small and often already text-compressed by the transport.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

export const crc32 = (bytes) => {
  let crc = 0xffffffff
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const dosDateTime = (date = new Date()) => ({
  time:
    ((date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)) &
    0xffff,
  date:
    (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff,
})

const toBytes = (value) => {
  if (value instanceof Uint8Array) return value
  if (typeof value === "string") return new TextEncoder().encode(value)
  return new Uint8Array(value)
}

/**
 * Builds a ZIP from [{ path, data }]. `data` may be a string or Uint8Array.
 * Returns a Blob so the caller can hand it straight to a download.
 */
export const createZip = (entries = [], { date = new Date() } = {}) => {
  if (!entries.length) throw new Error("Nothing to archive")

  const stamp = dosDateTime(date)
  const chunks = []
  const central = []
  let offset = 0

  entries.forEach((entry) => {
    const nameBytes = new TextEncoder().encode(entry.path)
    const data = toBytes(entry.data)
    const checksum = crc32(data)

    const local = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true) // local file header
    localView.setUint16(4, 20, true) // version needed
    localView.setUint16(6, 0x0800, true) // UTF-8 file names
    localView.setUint16(8, 0, true) // method: store
    localView.setUint16(10, stamp.time, true)
    localView.setUint16(12, stamp.date, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true)
    local.set(nameBytes, 30)

    chunks.push(local, data)

    const directory = new Uint8Array(46 + nameBytes.length)
    const directoryView = new DataView(directory.buffer)
    directoryView.setUint32(0, 0x02014b50, true) // central directory header
    directoryView.setUint16(4, 20, true) // version made by
    directoryView.setUint16(6, 20, true) // version needed
    directoryView.setUint16(8, 0x0800, true)
    directoryView.setUint16(10, 0, true)
    directoryView.setUint16(12, stamp.time, true)
    directoryView.setUint16(14, stamp.date, true)
    directoryView.setUint32(16, checksum, true)
    directoryView.setUint32(20, data.length, true)
    directoryView.setUint32(24, data.length, true)
    directoryView.setUint16(28, nameBytes.length, true)
    directoryView.setUint16(30, 0, true) // extra length
    directoryView.setUint16(32, 0, true) // comment length
    directoryView.setUint16(34, 0, true) // disk number
    directoryView.setUint16(36, 0, true) // internal attributes
    directoryView.setUint32(38, 0, true) // external attributes
    directoryView.setUint32(42, offset, true)
    directory.set(nameBytes, 46)
    central.push(directory)

    offset += local.length + data.length
  })

  const centralSize = central.reduce((sum, part) => sum + part.length, 0)

  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true) // end of central directory
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true)

  return new Blob([...chunks, ...central, end], { type: "application/zip" })
}

const decodeBase64 = (value = "") => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const safeSegment = (value, fallback) => {
  const cleaned = String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "")
    .trim()
  return cleaned || fallback
}

const safePath = (value) =>
  String(value ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => safeSegment(part, "file"))
    .join("/")

/**
 * Turns the export payload from the API into zip entries.
 * The project name becomes the top-level folder, so unzipping gives a tidy tree.
 */
export const buildProjectEntries = ({ project, files } = {}) => {
  const root = safeSegment(project, "project")
  return (files ?? []).map((file) => ({
    path: `${root}/${safePath(file.path)}`,
    data: file.encoding === "base64" ? decodeBase64(file.content) : file.content ?? "",
  }))
}

export const suggestedFileName = (project) => `${safeSegment(project, "project")}.zip`
