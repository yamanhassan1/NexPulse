// Tree helpers for the editor: flattening with paths, ancestor lookup, and a
// small fuzzy matcher for Quick Open. Deliberately dependency-free.

/**
 * Flattens a nested file tree into display rows.
 * `relPath` is the path including the root folder name, e.g. "NexPulse/src/App.jsx".
 */
export const flattenTree = (tree = []) => {
  const rows = []

  const walk = (nodes, parentPath, parentIds, depth) => {
    nodes.forEach((node) => {
      const relPath = parentPath ? `${parentPath}/${node.name}` : node.name
      rows.push({ node, relPath, parentIds, depth })
      if (node.children?.length) {
        walk(node.children, relPath, [...parentIds, node._id], depth + 1)
      }
    })
  }

  walk(tree, "", [], 0)
  return rows
}

export const rootNameOf = (tree = []) =>
  tree.find((node) => node.type === "folder")?.name ?? ""

/** "NexPulse/src/App.jsx" -> "src/App.jsx" */
export const relativePathOf = (relPath = "", rootName = "") => {
  if (!rootName) return relPath
  if (relPath === rootName) return ""
  return relPath.startsWith(`${rootName}/`) ? relPath.slice(rootName.length + 1) : relPath
}

export const parentPathOf = (relPath = "") => {
  const index = relPath.lastIndexOf("/")
  return index === -1 ? "" : relPath.slice(0, index)
}

export const baseNameOf = (relPath = "") => {
  const index = relPath.lastIndexOf("/")
  return index === -1 ? relPath : relPath.slice(index + 1)
}

/**
 * Subsequence match with a light quality score.
 * Returns null when the query does not match at all, otherwise
 * { score, indices } where indices are the matched character positions in
 * `text` (used to highlight results).
 */
export const fuzzyMatch = (query = "", text = "") => {
  const needle = query.trim().toLowerCase()
  if (!needle) return { score: 0, indices: [] }

  const haystack = text.toLowerCase()
  const indices = []
  let score = 0
  let cursor = 0
  let lastMatch = -2

  for (let i = 0; i < haystack.length && cursor < needle.length; i += 1) {
    if (haystack[i] !== needle[cursor]) continue

    indices.push(i)
    // Reward adjacency and matches at a path boundary; both make results feel
    // "smart" without needing a full fuzzy-ranking library.
    score += i === lastMatch + 1 ? 4 : 1
    const previous = haystack[i - 1]
    if (i === 0 || previous === "/" || previous === "." || previous === "-" || previous === "_") {
      score += 3
    }

    lastMatch = i
    cursor += 1
  }

  if (cursor < needle.length) return null

  // Prefer shorter paths when scores tie.
  score -= Math.floor(text.length / 24)
  return { score, indices }
}

export const searchFiles = (files = [], query = "") => {
  const trimmed = query.trim()
  if (!trimmed) return []

  return files
    .map((entry) => {
      const match = fuzzyMatch(trimmed, entry.relPath)
      return match ? { ...entry, ...match } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
}

/** Splits text into matched/unmatched runs for highlighting. */
export const splitHighlight = (text = "", indices = []) => {
  if (!indices.length) return [{ text, match: false }]

  const marked = new Set(indices)
  const parts = []
  let buffer = ""
  let current = null

  for (let i = 0; i < text.length; i += 1) {
    const isMatch = marked.has(i)
    if (current === null || current === isMatch) {
      buffer += text[i]
      current = isMatch
    } else {
      parts.push({ text: buffer, match: current })
      buffer = text[i]
      current = isMatch
    }
  }

  if (buffer) parts.push({ text: buffer, match: Boolean(current) })
  return parts
}
