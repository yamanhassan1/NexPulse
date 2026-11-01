import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProjectEntries,
  createZip,
  crc32,
  suggestedFileName,
} from './zip.js'

const encode = (value) => new TextEncoder().encode(value)

// Reads the archive back the way a real unzip tool would: end record, then the
// central directory, then each local header. If this passes, the file opens.
const readArchive = async (blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  const eocd = bytes.length - 22
  assert.equal(view.getUint32(eocd, true), 0x06054b50, 'end of central directory')

  const count = view.getUint16(eocd + 10, true)
  const centralSize = view.getUint32(eocd + 12, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  assert.equal(centralOffset + centralSize, eocd, 'central directory sits before the end record')

  const entries = []
  let cursor = centralOffset
  for (let index = 0; index < count; index += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50, 'central header')
    const crc = view.getUint32(cursor + 16, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const size = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localOffset = view.getUint32(cursor + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))

    assert.equal(compressedSize, size, 'stored entries are uncompressed')

    assert.equal(view.getUint32(localOffset, true), 0x04034b50, 'local header')
    const localNameLength = view.getUint16(localOffset + 26, true)
    const dataStart = localOffset + 30 + localNameLength
    const data = bytes.subarray(dataStart, dataStart + size)

    entries.push({ name, crc, size, data })
    cursor += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(encode('123456789')), 0xcbf43926)
  assert.equal(crc32(new Uint8Array(0)), 0)
})

test('createZip produces an archive a reader can walk', async () => {
  const blob = createZip([
    { path: 'demo/src/App.jsx', data: 'export default 1' },
    { path: 'demo/README.md', data: '# hi' },
  ])

  assert.equal(blob.type, 'application/zip')

  const entries = await readArchive(blob)
  assert.deepEqual(
    entries.map((entry) => entry.name),
    ['demo/src/App.jsx', 'demo/README.md'],
  )

  entries.forEach((entry) => {
    assert.equal(entry.crc, crc32(entry.data), `${entry.name} checksum`)
  })

  assert.equal(new TextDecoder().decode(entries[0].data), 'export default 1')
})

test('createZip stores binary payloads byte for byte', async () => {
  const binary = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff])
  const blob = createZip([{ path: 'demo/logo.png', data: binary }])

  const [entry] = await readArchive(blob)
  assert.deepEqual(Array.from(entry.data), Array.from(binary))
})

test('createZip refuses an empty archive', () => {
  assert.throws(() => createZip([]), /Nothing to archive/)
})

test('buildProjectEntries nests files under the project folder', () => {
  const entries = buildProjectEntries({
    project: 'My App',
    files: [
      { path: 'src/App.jsx', content: 'x', encoding: 'utf8' },
      { path: 'assets/logo.png', content: 'AQID', encoding: 'base64' },
    ],
  })

  assert.deepEqual(
    entries.map((entry) => entry.path),
    ['My App/src/App.jsx', 'My App/assets/logo.png'],
  )
  assert.equal(entries[0].data, 'x')
  assert.deepEqual(Array.from(entries[1].data), [1, 2, 3])
})

test('buildProjectEntries strips traversal segments from paths', () => {
  const entries = buildProjectEntries({
    project: 'demo',
    files: [{ path: '../../etc/passwd', content: 'x' }],
  })

  assert.equal(entries[0].path, 'demo/etc/passwd')
})

test('suggestedFileName sanitises the project name', () => {
  assert.equal(suggestedFileName('My App'), 'My App.zip')
  assert.equal(suggestedFileName('a/b:c'), 'a_b_c.zip')
  assert.equal(suggestedFileName(''), 'project.zip')
})
