// Generates src/themes/themes.css from the registry in src/themes/themes.js.
//
// Themes live in one place (the JS registry) so they can be validated and
// previewed; this script flattens them into CSS custom properties that the
// already-themeable Tailwind tokens pick up. Run after editing palettes:
//
//   node scripts/generate-theme-css.mjs

import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { BUILT_IN_THEMES, themeVariables } from "../src/themes/themes.js"

const here = dirname(fileURLToPath(import.meta.url))
const output = resolve(here, "../src/themes/themes.css")

const blocks = BUILT_IN_THEMES.map((theme) => {
  const variables = themeVariables(theme)
  const body = Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n")

  // `html[data-theme=...]` beats the `:root` defaults emitted by @theme.
  return `/* ${theme.name} - ${theme.type} */\nhtml[data-theme="${theme.id}"] {\n${body}\n}`
})

const css = `/* GENERATED FILE - run \`node scripts/generate-theme-css.mjs\` after editing
   src/themes/themes.js. Do not edit by hand. */

${blocks.join("\n\n")}
`

writeFileSync(output, css, "utf8")
console.log(`wrote ${BUILT_IN_THEMES.length} themes → ${output}`)
