// Indentation guide maths for the editor canvas.
//
// Guides are drawn per visual line at each indentation level, the way VS Code
// and JetBrains editors do it, so they only appear where code is actually
// indented rather than forming a grid across the whole file.

const TAB = "\t"

/**
 * Number of full indentation levels at the start of a line.
 * Tabs advance to the next tab stop; spaces count one column each.
 */
export const countIndentLevels = (line = "", tabSize = 2) => {
  const size = Math.max(1, Math.floor(tabSize))
  let columns = 0

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === " ") columns += 1
    else if (character === TAB) columns += size - (columns % size)
    else break
  }

  return Math.floor(columns / size)
}

/** Vertical offset of the first visible line for a scroll position. */
export const visibleLineRange = ({ scrollTop = 0, viewportHeight = 0, lineHeight = 20, paddingTop = 12, lineCount = 0 }) => {
  if (!lineHeight || lineCount === 0) return { first: 0, last: -1 }

  const first = Math.floor((scrollTop - paddingTop) / lineHeight)
  const last = Math.ceil((scrollTop + viewportHeight - paddingTop) / lineHeight)

  return {
    first: Math.max(0, first),
    last: Math.min(lineCount - 1, last),
  }
}

/**
 * The x offsets (in columns) of every guide on one line.
 * Depth is clamped so a pathological line cannot spawn thousands of rules.
 */
export const guideColumns = (line = "", tabSize = 2, maxDepth = 12) => {
  const depth = Math.min(countIndentLevels(line, tabSize), maxDepth)
  const columns = []

  for (let level = 1; level <= depth; level += 1) {
    columns.push(level * tabSize)
  }

  return columns
}
