import test from 'node:test'
import assert from 'node:assert/strict'
import {
  flattenTree,
  fuzzyMatch,
  relativePathOf,
  searchFiles,
  splitHighlight,
} from './fileTree.js'

const tree = [
  {
    _id: 'root',
    name: 'NexPulse',
    type: 'folder',
    children: [
      {
        _id: 'src',
        name: 'src',
        type: 'folder',
        children: [
          { _id: 'app', name: 'App.jsx', type: 'file', children: [] },
          { _id: 'util', name: 'utils.js', type: 'file', children: [] },
        ],
      },
      { _id: 'readme', name: 'README.md', type: 'file', children: [] },
    ],
  },
]

test('flattenTree walks depth-first and builds full paths', () => {
  const rows = flattenTree(tree)

  assert.deepEqual(
    rows.map((row) => row.relPath),
    ['NexPulse', 'NexPulse/src', 'NexPulse/src/App.jsx', 'NexPulse/src/utils.js', 'NexPulse/README.md'],
  )
})

test('flattenTree records depth and ancestor ids', () => {
  const app = flattenTree(tree).find((row) => row.node._id === 'app')

  assert.equal(app.depth, 2)
  assert.deepEqual(app.parentIds, ['root', 'src'])
})

test('relativePathOf strips the project root', () => {
  assert.equal(relativePathOf('NexPulse/src/App.jsx', 'NexPulse'), 'src/App.jsx')
  assert.equal(relativePathOf('NexPulse', 'NexPulse'), '')
  assert.equal(relativePathOf('Other/file.js', 'NexPulse'), 'Other/file.js')
})

test('fuzzyMatch accepts subsequences and reports indices', () => {
  const match = fuzzyMatch('apx', 'App.jsx')

  assert.ok(match, 'expected a match')
  // "App.jsx": A(0) p(1) p(2) .(3) j(4) s(5) x(6)
  assert.deepEqual(match.indices, [0, 1, 6])
})

test('fuzzyMatch rejects text that is missing characters', () => {
  assert.equal(fuzzyMatch('zzz', 'App.jsx'), null)
})

test('fuzzyMatch prefers path-boundary hits', () => {
  const boundary = fuzzyMatch('app', 'src/App.jsx')
  const scattered = fuzzyMatch('app', 'zzzappzzz')

  assert.ok(boundary.score > scattered.score)
})

test('searchFiles ranks and caps results', () => {
  const files = flattenTree(tree).filter((row) => row.node.type === 'file')
  const results = searchFiles(files, 'app')

  assert.equal(results.length, 1)
  assert.equal(results[0].node._id, 'app')
})

test('searchFiles returns nothing for an empty query', () => {
  const files = flattenTree(tree).filter((row) => row.node.type === 'file')

  assert.deepEqual(searchFiles(files, ''), [])
})

test('splitHighlight marks only the matched characters', () => {
  const parts = splitHighlight('App.jsx', [0, 1, 2])

  assert.deepEqual(parts, [
    { text: 'App', match: true },
    { text: '.jsx', match: false },
  ])
})
