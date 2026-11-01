import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BUILT_IN_THEMES,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEME_CATEGORIES,
  contrastRatio,
  defaultThemeForType,
  getTheme,
  isHexColor,
  normaliseTheme,
  readableOn,
  relativeLuminance,
  themeVariables,
  validateTheme,
} from './themes.js'

const HEX = /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i

test('the collection ships 12 themes: 9 dark and 3 light', () => {
  assert.equal(BUILT_IN_THEMES.length, 12)
  assert.equal(BUILT_IN_THEMES.filter((theme) => theme.type === 'dark').length, 9)
  assert.equal(BUILT_IN_THEMES.filter((theme) => theme.type === 'light').length, 3)
})

test('theme ids are unique and match the requested collection', () => {
  const ids = BUILT_IN_THEMES.map((theme) => theme.id)
  assert.equal(new Set(ids).size, ids.length)

  ;[
    'one-dark', 'dracula', 'github-dark-dimmed', 'tokyo-night-storm', 'night-owl',
    'nord', 'catppuccin-mocha', 'ayu-mirage', 'material-palenight',
    'github-light', 'one-light', 'solarized-light',
  ].forEach((id) => assert.ok(ids.includes(id), `missing theme ${id}`))
})

test('every theme is complete: no slot falls through to a previous palette', () => {
  BUILT_IN_THEMES.forEach((theme) => {
    const normalised = normaliseTheme(theme)
    const colours = [
      normalised.bg, normalised.sidebar, normalised.panel, normalised.hover,
      normalised.border, normalised.borderStrong, normalised.fg, normalised.muted,
      normalised.dim, normalised.accent, normalised.selection, normalised.activeLine,
      normalised.lineNumber, normalised.cursor,
    ]

    colours.forEach((value) => assert.match(value, HEX, `${theme.id} has an invalid colour`))

    Object.entries(normalised.syntax).forEach(([slot, value]) => {
      assert.match(value, HEX, `${theme.id} syntax.${slot} is not a hex colour`)
    })

    assert.ok(normalised.name.length > 0)
    assert.ok(normalised.description.length > 0)
    assert.ok(normalised.categories.every((item) => THEME_CATEGORIES.includes(item)))
  })
})

test('themeVariables covers every UI and syntax variable the app reads', () => {
  const required = [
    '--color-surface', '--color-panel', '--color-line', '--color-graphite',
    '--color-mist', '--color-ink-950', '--color-ink-900', '--color-brand-600',
    '--editor-bg', '--editor-fg', '--editor-line-number', '--editor-active-line',
    '--editor-selection', '--editor-cursor',
    '--syntax-keyword', '--syntax-string', '--syntax-number', '--syntax-fn',
    '--syntax-constant', '--syntax-class', '--syntax-operator', '--syntax-comment',
    '--syntax-property', '--syntax-tag', '--syntax-attr', '--syntax-punct',
  ]

  BUILT_IN_THEMES.forEach((theme) => {
    const variables = themeVariables(theme)
    required.forEach((name) => {
      assert.ok(variables[name], `${theme.id} is missing ${name}`)
      assert.equal(String(variables[name]).includes('undefined'), false)
    })
  })
})

test('normaliseTheme fills gaps for a minimal input', () => {
  const theme = normaliseTheme({ id: 'x', name: 'X', type: 'dark', bg: '#101010', fg: '#eeeeee' })

  assert.equal(theme.sidebar, '#101010')
  assert.equal(theme.panel, '#101010')
  assert.equal(theme.cursor, theme.accent)
  assert.ok(theme.syntax.keyword)
})

test('validateTheme accepts a complete theme and normalises it', () => {
  const result = validateTheme({
    name: 'My theme',
    type: 'light',
    bg: '#ffffff',
    fg: '#111111',
    accent: '#2255ff',
    syntax: { keyword: '#ff0000' },
  })

  assert.equal(result.ok, true)
  assert.equal(result.theme.custom, true)
  assert.equal(result.theme.type, 'light')
  assert.equal(result.theme.syntax.keyword, '#ff0000')
  assert.ok(result.theme.syntax.string, 'missing syntax slots are filled')
})

test('validateTheme rejects broken input instead of corrupting the editor', () => {
  assert.equal(validateTheme(null).ok, false)
  assert.equal(validateTheme('nope').ok, false)
  assert.equal(validateTheme({ type: 'dark', bg: '#000', fg: '#fff' }).ok, false, 'name required')
  assert.equal(validateTheme({ name: 'x', bg: '#000', fg: '#fff' }).ok, false, 'type required')
  assert.equal(validateTheme({ name: 'x', type: 'dark', fg: '#fff' }).ok, false, 'bg required')
  assert.equal(
    validateTheme({ name: 'x', type: 'dark', bg: 'red', fg: '#fff' }).ok,
    false,
    'bg must be hex',
  )
  assert.equal(
    validateTheme({ name: 'x', type: 'dark', bg: '#000', fg: '#fff', syntax: { nope: '#fff' } }).ok,
    false,
    'unknown syntax slot',
  )
})

test('isHexColor accepts 3 and 6 digit hex only', () => {
  assert.equal(isHexColor('#fff'), true)
  assert.equal(isHexColor('#ffffff'), true)
  assert.equal(isHexColor('#ffff'), false)
  assert.equal(isHexColor('white'), false)
  assert.equal(isHexColor(null), false)
})

test('getTheme falls back to the default for unknown ids', () => {
  assert.equal(getTheme('nope').id, DEFAULT_DARK_THEME)
  assert.equal(getTheme('dracula').id, 'dracula')
})

test('defaultThemeForType returns a theme of the requested type', () => {
  assert.equal(defaultThemeForType('dark').type, 'dark')
  assert.equal(defaultThemeForType('light').type, 'light')
  assert.equal(defaultThemeForType('light').id, DEFAULT_LIGHT_THEME)
})

test('relativeLuminance and contrastRatio follow WCAG', () => {
  assert.equal(Math.round(relativeLuminance('#000000') * 100) / 100, 0)
  assert.equal(Math.round(relativeLuminance('#ffffff') * 100) / 100, 1)
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21)
  assert.equal(Math.round(contrastRatio('#777777', '#777777')), 1)
})

test('readableOn picks black on light accents and white on dark ones', () => {
  assert.equal(readableOn('#ffcc66'), '#0b0d12', 'Ayu amber needs dark text')
  assert.equal(readableOn('#0969da'), '#ffffff', 'GitHub blue takes white text')
})

// Regression: buttons used `text-white` on `bg-brand-600`, which was invisible
// on themes with a light accent (Ayu, Catppuccin, Nord).
test('text on accent fills meets WCAG AA for every theme', () => {
  BUILT_IN_THEMES.forEach((theme) => {
    const variables = themeVariables(theme)
    const ratio = contrastRatio(variables['--color-on-brand'], variables['--color-brand-600'])
    assert.ok(ratio >= 4.5, `${theme.id}: on-brand contrast is only ${ratio.toFixed(2)}:1`)
  })
})

test('primary and secondary text stay readable on every surface', () => {
  BUILT_IN_THEMES.forEach((theme) => {
    const variables = themeVariables(theme)
    const onSurface = contrastRatio(variables['--color-graphite'], variables['--color-surface'])
    const secondary = contrastRatio(variables['--color-faint'], variables['--color-surface'])
    const onPanel = contrastRatio(variables['--color-graphite'], variables['--color-panel'])

    // WCAG AA for body text is 4.5:1; AAA (7:1) would mean altering authentic
    // palettes such as One Dark, so AA is the bar we hold them to.
    assert.ok(onSurface >= 4.5, `${theme.id}: body text ${onSurface.toFixed(2)}:1 on surface`)
    assert.ok(onPanel >= 4.5, `${theme.id}: body text ${onPanel.toFixed(2)}:1 on panel`)
    assert.ok(secondary >= 3, `${theme.id}: secondary text ${secondary.toFixed(2)}:1 on surface`)
  })
})
