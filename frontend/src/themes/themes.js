// The theme registry: one source of truth for every built-in palette.
//
// Each theme is a partial palette; `normaliseTheme` fills the remaining UI and
// syntax slots from the ones given, so a theme can never be half-defined and
// leave stale colours from a previously selected theme.

export const THEME_CATEGORIES = ["dark", "light", "minimal", "colorful", "classic", "premium"]

const SYNTAX_FALLBACKS = {
  keyword: "#c792ea",
  string: "#c3e88d",
  number: "#f78c6c",
  fn: "#82aaff",
  constant: "#ffcb6b",
  klass: "#ffcb6b",
  operator: "#89ddff",
  comment: "#697386",
  property: "#80cbc4",
  tag: "#f07178",
  attr: "#ffcb6b",
  punct: "#a1a7b5",
}

export const BUILT_IN_THEMES = [
  {
    id: "one-dark",
    name: "One Dark Pro",
    description: "Atom's classic: warm graphite with a calm blue accent.",
    type: "dark",
    categories: ["dark", "classic", "premium"],
    bg: "#282c34",
    sidebar: "#21252b",
    panel: "#2c313a",
    border: "#3b4048",
    fg: "#abb2bf",
    muted: "#8b929e",
    dim: "#5c6370",
    accent: "#61afef",
    selection: "#3e4451",
    activeLine: "#2c313c",
    syntax: {
      keyword: "#c678dd",
      string: "#98c379",
      number: "#d19a66",
      fn: "#61afef",
      constant: "#d19a66",
      klass: "#e5c07b",
      operator: "#56b6c2",
      comment: "#5c6370",
      property: "#e06c75",
      tag: "#e06c75",
      attr: "#d19a66",
      punct: "#abb2bf",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    description: "High-contrast purple and pink on a deep violet background.",
    type: "dark",
    categories: ["dark", "colorful", "premium"],
    bg: "#282a36",
    sidebar: "#21222c",
    panel: "#2b2d3a",
    border: "#44475a",
    fg: "#f8f8f2",
    muted: "#a6a9c0",
    dim: "#6272a4",
    accent: "#bd93f9",
    selection: "#44475a",
    activeLine: "#2f3241",
    syntax: {
      keyword: "#ff79c6",
      string: "#f1fa8c",
      number: "#bd93f9",
      fn: "#50fa7b",
      constant: "#bd93f9",
      klass: "#8be9fd",
      operator: "#ff79c6",
      comment: "#6272a4",
      property: "#f8f8f2",
      tag: "#ff79c6",
      attr: "#50fa7b",
      punct: "#f8f8f2",
    },
  },
  {
    id: "github-dark-dimmed",
    name: "GitHub Dark Dimmed",
    description: "GitHub's softer dark theme — low glare, clear structure.",
    type: "dark",
    categories: ["dark", "minimal"],
    bg: "#22272e",
    sidebar: "#1c2128",
    panel: "#2d333b",
    border: "#444c56",
    fg: "#adbac7",
    muted: "#909dab",
    dim: "#768390",
    accent: "#539bf5",
    selection: "#3d444d",
    activeLine: "#2d333b",
    syntax: {
      keyword: "#f47067",
      string: "#96d0ff",
      number: "#6cb6ff",
      fn: "#dcbdfb",
      constant: "#6cb6ff",
      klass: "#f69d50",
      operator: "#768390",
      comment: "#768390",
      property: "#6cb6ff",
      tag: "#8ddb8c",
      attr: "#6cb6ff",
      punct: "#adbac7",
    },
  },
  {
    id: "tokyo-night-storm",
    name: "Tokyo Night Storm",
    description: "Neon city blues with a soft indigo base.",
    type: "dark",
    categories: ["dark", "colorful", "premium"],
    bg: "#24283b",
    sidebar: "#1f2335",
    panel: "#2a2f45",
    border: "#3b4261",
    fg: "#c0caf5",
    muted: "#9aa5ce",
    dim: "#565f89",
    accent: "#7aa2f7",
    selection: "#28344a",
    activeLine: "#2a2f45",
    syntax: {
      keyword: "#bb9af7",
      string: "#9ece6a",
      number: "#ff9e64",
      fn: "#7aa2f7",
      constant: "#ff9e64",
      klass: "#2ac3de",
      operator: "#89ddff",
      comment: "#565f89",
      property: "#73daca",
      tag: "#f7768e",
      attr: "#e0af68",
      punct: "#c0caf5",
    },
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Built for late nights: deep navy, vivid accents, low glare.",
    type: "dark",
    categories: ["dark", "colorful"],
    bg: "#011627",
    sidebar: "#01111d",
    panel: "#0b2942",
    border: "#1d3b53",
    fg: "#d6deeb",
    muted: "#a7b6c9",
    dim: "#637777",
    accent: "#82aaff",
    selection: "#1d3b53",
    activeLine: "#0b2942",
    syntax: {
      keyword: "#c792ea",
      string: "#ecc48d",
      number: "#f78c6c",
      fn: "#82aaff",
      constant: "#f78c6c",
      klass: "#ffcb8b",
      operator: "#7fdbca",
      comment: "#637777",
      property: "#addb67",
      tag: "#7fdbca",
      attr: "#addb67",
      punct: "#d6deeb",
    },
  },
  {
    id: "nord",
    name: "Nord",
    description: "Arctic blues and muted greys; calm and consistent.",
    type: "dark",
    categories: ["dark", "minimal"],
    bg: "#2e3440",
    sidebar: "#292e39",
    panel: "#3b4252",
    border: "#4c566a",
    fg: "#d8dee9",
    muted: "#aebacd",
    dim: "#616e88",
    accent: "#88c0d0",
    selection: "#434c5e",
    activeLine: "#3b4252",
    syntax: {
      keyword: "#81a1c1",
      string: "#a3be8c",
      number: "#b48ead",
      fn: "#88c0d0",
      constant: "#b48ead",
      klass: "#8fbcbb",
      operator: "#81a1c1",
      comment: "#616e88",
      property: "#d8dee9",
      tag: "#81a1c1",
      attr: "#8fbcbb",
      punct: "#d8dee9",
    },
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    description: "Pastel warmth on a soft espresso base.",
    type: "dark",
    categories: ["dark", "colorful", "premium"],
    bg: "#1e1e2e",
    sidebar: "#181825",
    panel: "#252537",
    border: "#313244",
    fg: "#cdd6f4",
    muted: "#a6adc8",
    dim: "#6c7086",
    accent: "#cba6f7",
    selection: "#45475a",
    activeLine: "#252537",
    syntax: {
      keyword: "#cba6f7",
      string: "#a6e3a1",
      number: "#fab387",
      fn: "#89b4fa",
      constant: "#fab387",
      klass: "#f9e2af",
      operator: "#89dceb",
      comment: "#6c7086",
      property: "#89dceb",
      tag: "#f38ba8",
      attr: "#f9e2af",
      punct: "#cdd6f4",
    },
  },
  {
    id: "ayu-mirage",
    name: "Ayu Mirage",
    description: "Warm sand tones over a hazy midnight blue.",
    type: "dark",
    categories: ["dark", "minimal", "premium"],
    bg: "#1f2430",
    sidebar: "#1a1f29",
    panel: "#242936",
    border: "#33415e",
    fg: "#cbccc6",
    muted: "#a1a6b5",
    dim: "#5c6773",
    accent: "#ffcc66",
    selection: "#33415e",
    activeLine: "#242936",
    syntax: {
      keyword: "#ffa759",
      string: "#bae67e",
      number: "#ffcc66",
      fn: "#ffd580",
      constant: "#ffcc66",
      klass: "#73d0ff",
      operator: "#f29e74",
      comment: "#5c6773",
      property: "#95e6cb",
      tag: "#5ccfe6",
      attr: "#ffd580",
      punct: "#cbccc6",
    },
  },
  {
    id: "material-palenight",
    name: "Material Palenight",
    description: "Material depth: indigo surfaces with vivid pastels.",
    type: "dark",
    categories: ["dark", "colorful", "classic"],
    bg: "#292d3e",
    sidebar: "#232635",
    panel: "#2f3346",
    border: "#3a3f58",
    fg: "#a6accd",
    muted: "#959dcb",
    dim: "#676e95",
    accent: "#82aaff",
    selection: "#3a3f58",
    activeLine: "#2f3346",
    syntax: {
      keyword: "#c792ea",
      string: "#c3e88d",
      number: "#f78c6c",
      fn: "#82aaff",
      constant: "#f78c6c",
      klass: "#ffcb6b",
      operator: "#89ddff",
      comment: "#676e95",
      property: "#80cbc4",
      tag: "#f07178",
      attr: "#ffcb6b",
      punct: "#a6accd",
    },
  },
  {
    id: "github-light",
    name: "GitHub Light",
    description: "GitHub's default light: crisp, neutral, high legibility.",
    type: "light",
    categories: ["light", "minimal"],
    bg: "#ffffff",
    sidebar: "#f6f8fa",
    panel: "#f6f8fa",
    border: "#d0d7de",
    fg: "#24292f",
    muted: "#57606a",
    dim: "#6e7781",
    accent: "#0969da",
    selection: "#ddf4ff",
    activeLine: "#f6f8fa",
    syntax: {
      keyword: "#cf222e",
      string: "#0a3069",
      number: "#0550ae",
      fn: "#8250df",
      constant: "#0550ae",
      klass: "#953800",
      operator: "#0550ae",
      comment: "#6e7781",
      property: "#116329",
      tag: "#116329",
      attr: "#0550ae",
      punct: "#24292f",
    },
  },
  {
    id: "one-light",
    name: "One Light",
    description: "The light twin of One Dark — soft paper, cool accents.",
    type: "light",
    categories: ["light", "classic"],
    bg: "#fafafa",
    sidebar: "#f0f0f1",
    panel: "#f0f0f1",
    border: "#dcdcdd",
    fg: "#383a42",
    muted: "#696c77",
    dim: "#a0a1a7",
    accent: "#4078f2",
    selection: "#e5e5e6",
    activeLine: "#f2f2f3",
    syntax: {
      keyword: "#a626a4",
      string: "#50a14f",
      number: "#986801",
      fn: "#4078f2",
      constant: "#986801",
      klass: "#c18401",
      operator: "#0184bc",
      comment: "#a0a1a7",
      property: "#e45649",
      tag: "#e45649",
      attr: "#986801",
      punct: "#383a42",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    description: "Ethan Schoonover's precision palette on warm paper.",
    type: "light",
    categories: ["light", "classic"],
    bg: "#fdf6e3",
    sidebar: "#f5efdc",
    panel: "#eee8d5",
    border: "#ded8c4",
    // Solarized's base01 (#586e75) lands at 4.39:1 on base2, just under AA, so
    // it is nudged darker — the only deviation from the published palette.
    fg: "#4e6369",
    muted: "#5b7178",
    dim: "#8a9a9a",
    accent: "#268bd2",
    selection: "#eee8d5",
    activeLine: "#f5efdc",
    syntax: {
      keyword: "#859900",
      string: "#2aa198",
      number: "#d33682",
      fn: "#268bd2",
      constant: "#d33682",
      klass: "#b58900",
      operator: "#859900",
      comment: "#93a1a1",
      property: "#268bd2",
      tag: "#268bd2",
      attr: "#b58900",
      punct: "#586e75",
    },
  },
]

export const DEFAULT_DARK_THEME = "one-dark"
export const DEFAULT_LIGHT_THEME = "github-light"

/** Fills every gap so no slot can inherit a colour from the previous theme. */
export const normaliseTheme = (theme = {}) => {
  const bg = theme.bg || "#282c34"
  const panel = theme.panel || bg
  const fg = theme.fg || "#abb2bf"
  const accent = theme.accent || "#61afef"
  const syntax = { ...SYNTAX_FALLBACKS, ...(theme.syntax || {}) }

  return {
    id: String(theme.id || "custom").trim() || "custom",
    name: String(theme.name || "Custom theme").trim() || "Custom theme",
    description: String(theme.description || "").trim(),
    type: theme.type === "light" ? "light" : "dark",
    categories: Array.isArray(theme.categories) ? theme.categories.filter((item) => THEME_CATEGORIES.includes(item)) : [],
    custom: Boolean(theme.custom),
    bg,
    sidebar: theme.sidebar || bg,
    panel,
    hover: theme.hover || panel,
    border: theme.border || panel,
    borderStrong: theme.borderStrong || theme.border || panel,
    fg,
    muted: theme.muted || fg,
    dim: theme.dim || theme.muted || fg,
    accent,
    selection: theme.selection || panel,
    activeLine: theme.activeLine || panel,
    lineNumber: theme.lineNumber || theme.dim || theme.muted || fg,
    cursor: theme.cursor || accent,
    syntax,
  }
}

const HEX = /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i

export const isHexColor = (value) => typeof value === "string" && HEX.test(value.trim())

const channel = (hex, index) => {
  const value = parseInt(hex.slice(index, index + 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const expand = (hex) => {
  const value = hex.trim().replace("#", "")
  return value.length === 3 ? value.split("").map((part) => part + part).join("") : value
}

/** WCAG relative luminance of a hex colour. */
export const relativeLuminance = (hex) => {
  const value = expand(hex)
  return 0.2126 * channel(value, 0) + 0.7152 * channel(value, 2) + 0.0722 * channel(value, 4)
}

/** WCAG contrast ratio between two hex colours (1–21). */
export const contrastRatio = (a, b) => {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}

export const ON_DARK = "#0b0d12"
export const ON_LIGHT = "#ffffff"

/** Picks whichever foreground has more contrast on `background`. */
export const readableOn = (background) =>
  contrastRatio(ON_LIGHT, background) >= contrastRatio(ON_DARK, background) ? ON_LIGHT : ON_DARK

/** Validates an imported/edited theme before it is allowed anywhere near the UI. */
export const validateTheme = (input) => {
  const errors = []
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Theme must be an object"] }
  }

  if (typeof input.name !== "string" || !input.name.trim()) errors.push("name is required")
  if (input.type !== "dark" && input.type !== "light") errors.push('type must be "dark" or "light"')

  const colourFields = ["bg", "fg", "accent"]
  colourFields.forEach((field) => {
    if (input[field] !== undefined && !isHexColor(input[field])) {
      errors.push(`${field} must be a hex colour`)
    }
  })

  if (input.bg === undefined) errors.push("bg is required")
  if (input.fg === undefined) errors.push("fg is required")

  const optional = ["sidebar", "panel", "hover", "border", "borderStrong", "muted", "dim", "selection", "activeLine", "lineNumber", "cursor"]
  optional.forEach((field) => {
    if (input[field] !== undefined && !isHexColor(input[field])) {
      errors.push(`${field} must be a hex colour`)
    }
  })

  if (input.syntax !== undefined) {
    if (typeof input.syntax !== "object" || Array.isArray(input.syntax)) {
      errors.push("syntax must be an object")
    } else {
      Object.entries(input.syntax).forEach(([key, value]) => {
        if (!Object.prototype.hasOwnProperty.call(SYNTAX_FALLBACKS, key)) {
          errors.push(`unknown syntax slot "${key}"`)
        } else if (!isHexColor(value)) {
          errors.push(`syntax.${key} must be a hex colour`)
        }
      })
    }
  }

  if (errors.length) return { ok: false, errors }

  return { ok: true, errors: [], theme: normaliseTheme({ ...input, custom: true }) }
}

/** CSS custom properties for one theme. Consumed by the generator script. */
export const themeVariables = (theme) => {
  const t = normaliseTheme(theme)

  // Hover and selection must be visibly different from the surface they sit on;
  // when a palette reuses one colour for both, derive a subtle shift instead of
  // shipping an invisible state.
  const hover =
    t.hover === t.panel
      ? `color-mix(in oklab, ${t.panel} 90%, ${t.fg} 12%)`
      : t.hover
  const border =
    t.border === t.panel
      ? `color-mix(in oklab, ${t.panel} 76%, ${t.fg} 24%)`
      : t.border
  const selection =
    t.selection === t.panel
      ? `color-mix(in oklab, ${t.accent} 30%, ${t.panel})`
      : t.selection

  // A comment colour is fine in code but often too faint for UI labels, so fall
  // back to the muted tone when the dim one would disappear against the surface.
  const secondary = contrastRatio(t.dim, t.bg) >= 3 ? t.dim : t.muted

  return {
    "--color-surface": t.bg,
    "--color-panel": t.panel,
    "--color-hover": hover,
    "--color-line": border,
    "--color-line-strong": t.borderStrong === t.border ? border : t.borderStrong,
    "--color-line-dark": border,
    "--color-graphite": t.fg,
    "--color-muted": t.muted,
    "--color-subtle": secondary,
    "--color-faint": secondary,
    "--color-mist": t.fg,
    "--color-mist-muted": t.muted,
    "--color-ink-950": t.bg,
    "--color-ink-900": t.sidebar,
    "--color-ink-850": t.panel,
    "--color-ink-800": hover,
    "--color-ink-700": border,
    "--color-brand-700": `color-mix(in oklab, ${t.accent} 76%, black)`,
    "--color-brand-600": t.accent,
    "--color-brand-500": `color-mix(in oklab, ${t.accent} 88%, white)`,
    "--color-brand-400": `color-mix(in oklab, ${t.accent} 70%, white)`,
    "--color-brand-300": `color-mix(in oklab, ${t.accent} 52%, white)`,
    // Text placed on top of a filled accent surface. Several themes have light
    // accents (Ayu amber, Catppuccin mauve, Nord ice), where white is unreadable.
    "--color-on-brand": readableOn(t.accent),
    "--editor-bg": t.bg,
    "--editor-fg": t.fg,
    "--editor-gutter": t.sidebar,
    "--editor-line-number": t.lineNumber,
    "--editor-line-number-active": t.fg,
    "--editor-active-line": t.activeLine,
    "--editor-selection": selection,
    "--editor-cursor": t.cursor,
    "--syntax-keyword": t.syntax.keyword,
    "--syntax-string": t.syntax.string,
    "--syntax-number": t.syntax.number,
    "--syntax-fn": t.syntax.fn,
    "--syntax-constant": t.syntax.constant,
    "--syntax-class": t.syntax.klass,
    "--syntax-operator": t.syntax.operator,
    "--syntax-comment": t.syntax.comment,
    "--syntax-property": t.syntax.property,
    "--syntax-tag": t.syntax.tag,
    "--syntax-attr": t.syntax.attr,
    "--syntax-punct": t.syntax.punct,
  }
}

export const THEMES_BY_ID = new Map(BUILT_IN_THEMES.map((theme) => [theme.id, normaliseTheme(theme)]))

export const getTheme = (id) => THEMES_BY_ID.get(id) ?? THEMES_BY_ID.get(DEFAULT_DARK_THEME)

export const defaultThemeForType = (type) =>
  getTheme(type === "light" ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME)
