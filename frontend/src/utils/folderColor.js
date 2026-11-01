// Lightweight, deterministic accent colour for a project/folder name.
// Deliberately dependency-free: the dashboard must not pull in the full
// icon-set bundle just to colour one glyph.
const PALETTE = [
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
  "#f87171",
  "#2dd4bf",
]

const KEYWORD_COLORS = [
  { match: /(^|\/)(src|source)$/, color: "#34d399" },
  { match: /(^|\/)(web|frontend|client|app)$/, color: "#38bdf8" },
  { match: /(^|\/)(api|backend|server)$/, color: "#fbbf24" },
  { match: /(^|\/)(docs?|documentation)$/, color: "#60a5fa" },
  { match: /(^|\/)(test|tests|spec)$/, color: "#f472b6" },
  { match: /(^|\/)(design|ui|ux)$/, color: "#a78bfa" },
]

export const getProjectColor = (name = "") => {
  const key = String(name).trim().toLowerCase()
  if (!key) return PALETTE[0]

  const keyword = KEYWORD_COLORS.find((entry) => entry.match.test(key))
  if (keyword) return keyword.color

  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0
  }

  return PALETTE[hash % PALETTE.length]
}

export const PROJECT_COLORS = PALETTE
