// Boilerplates offered by the "New from template" dialog.
//
// Templates use {{Pascal}}, {{camel}}, {{kebab}}, {{base}}, {{stem}}, {{hook}}
// and {{folder}} placeholders. A starter owns its own folder, while a file
// template becomes a single file inside the chosen folder.

const readme = [
  "# {{Pascal}}",
  "",
  "{{description}}",
  "",
  "## Getting started",
  "",
  "```bash",
  "npm install",
  "npm run dev",
  "```",
  "",
  "## Scripts",
  "",
  "| Command | Description |",
  "| --- | --- |",
  "| `npm run dev` | Start the development server |",
  "| `npm run build` | Build for production |",
  "| `npm test` | Run the tests |",
  "",
  "## Notes",
  "",
  "Built with NexPulse.",
  "",
].join("\n")

export const TEMPLATES = [
  {
    id: "react-component",
    label: "React component",
    description: "Function component with className merging, children and props spread.",
    category: "React",
    mode: "file",
    suggestedName: "Component.jsx",
    files: [
      {
        path: "{{name}}",
        content: `function {{Pascal}}({ className = "", children, ...props }) {
  return (
    <div className={["{{kebab}}", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  )
}

export default {{Pascal}}
`,
      },
    ],
  },
  {
    id: "react-page",
    label: "React page",
    description: "Page shell with local loading state and a ready-to-fill effect.",
    category: "React",
    mode: "file",
    suggestedName: "Page.jsx",
    files: [
      {
        path: "{{name}}",
        content: `import { useEffect, useState } from "react"

function {{Pascal}}() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // TODO: load data here.
    setLoading(false)

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p>Loading…</p>
  }

  return (
    <main className="{{kebab}}">
      <h1>{{Pascal}}</h1>
    </main>
  )
}

export default {{Pascal}}
`,
      },
    ],
  },
  {
    id: "react-hook",
    label: "React hook",
    description: "Custom hook with state, a setter and a memoised reset helper.",
    category: "React",
    mode: "file",
    suggestedName: "useThing.js",
    files: [
      {
        path: "{{name}}",
        content: `import { useCallback, useState } from "react"

export function {{camel}}(initialValue) {
  const [value, setValue] = useState(initialValue)

  const reset = useCallback(() => {
    setValue(initialValue)
  }, [initialValue])

  return { value, setValue, reset }
}
`,
      },
    ],
  },
  {
    id: "react-context",
    label: "React context",
    description: "Typed context provider plus a hook that fails loudly outside the provider.",
    category: "React",
    mode: "file",
    suggestedName: "ThemeContext.jsx",
    files: [
      {
        path: "{{name}}",
        content: `import { createContext, useContext, useMemo, useState } from "react"

const {{Pascal}}Context = createContext(null)

export function {{Pascal}}Provider({ children }) {
  const [value, setValue] = useState(null)
  const contextValue = useMemo(() => ({ value, setValue }), [value])

  return (
    <{{Pascal}}Context.Provider value={contextValue}>
      {children}
    </{{Pascal}}Context.Provider>
  )
}

export function {{hook}}() {
  const context = useContext({{Pascal}}Context)

  if (!context) {
    throw new Error("{{hook}} must be used inside {{Pascal}}Provider")
  }

  return context
}
`,
      },
    ],
  },
  {
    id: "react-form",
    label: "React form",
    description: "Controlled form with local values and a submit handler.",
    category: "React",
    mode: "file",
    suggestedName: "Form.jsx",
    files: [
      {
        path: "{{name}}",
        content: `import { useState } from "react"

const INITIAL_VALUES = {
  name: "",
  email: "",
}

function {{Pascal}}({ onSubmit }) {
  const [values, setValues] = useState(INITIAL_VALUES)

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(values)
  }

  return (
    <form className="{{kebab}}" onSubmit={handleSubmit}>
      <label>
        Name
        <input name="name" value={values.name} onChange={handleChange} />
      </label>
      <label>
        Email
        <input name="email" type="email" value={values.email} onChange={handleChange} />
      </label>
      <button type="submit">Submit</button>
    </form>
  )
}

export default {{Pascal}}
`,
      },
    ],
  },
  {
    id: "express-route",
    label: "Express router",
    description: "Router with list and detail routes wired to a matching controller.",
    category: "Node & Express",
    mode: "file",
    suggestedName: "routes.js",
    files: [
      {
        path: "{{name}}",
        content: `import { Router } from "express"
import { list{{Pascal}}, get{{Pascal}} } from "../controllers/{{kebab}}.controller.js"

const router = Router()

router.get("/", list{{Pascal}})
router.get("/:id", get{{Pascal}})

export default router
`,
      },
    ],
  },
  {
    id: "express-controller",
    label: "Express controller",
    description: "List, read and create handlers with error forwarding.",
    category: "Node & Express",
    mode: "file",
    suggestedName: "controller.js",
    files: [
      {
        path: "{{name}}",
        content: `import {{Pascal}} from "../models/{{kebab}}.model.js"

export const list{{Pascal}} = async (req, res, next) => {
  try {
    const items = await {{Pascal}}.find().limit(100)
    res.json(items)
  } catch (error) {
    next(error)
  }
}

export const get{{Pascal}} = async (req, res, next) => {
  try {
    const item = await {{Pascal}}.findById(req.params.id)

    if (!item) {
      return res.status(404).json({ message: "Not found" })
    }

    res.json(item)
  } catch (error) {
    next(error)
  }
}

export const create{{Pascal}} = async (req, res, next) => {
  try {
    const item = await {{Pascal}}.create(req.body)
    res.status(201).json(item)
  } catch (error) {
    next(error)
  }
}
`,
      },
    ],
  },
  {
    id: "mongoose-model",
    label: "Mongoose model",
    description: "Schema with a required name field, timestamps and a default export.",
    category: "Node & Express",
    mode: "file",
    suggestedName: "model.js",
    files: [
      {
        path: "{{name}}",
        content: `import mongoose from "mongoose"

const {{camel}}Schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

const {{Pascal}} = mongoose.model("{{Pascal}}", {{camel}}Schema)

export default {{Pascal}}
`,
      },
    ],
  },
  {
    id: "express-server",
    label: "Express server",
    description: "Express app with CORS, JSON parsing, logging and an error handler.",
    category: "Node & Express",
    mode: "file",
    suggestedName: "server.js",
    files: [
      {
        path: "{{name}}",
        content: `import express from "express"
import cors from "cors"
import morgan from "morgan"

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan("dev"))

app.get("/health", (req, res) => {
  res.json({ ok: true })
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(error.status || 500).json({ message: error.message || "Server error" })
})

const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log("API listening on http://localhost:" + port)
})
`,
      },
    ],
  },
  {
    id: "node-module",
    label: "ES module",
    description: "Small named and default export ready for unit tests.",
    category: "Node & Express",
    mode: "file",
    suggestedName: "module.js",
    files: [
      {
        path: "{{name}}",
        content: `/**
 * {{Pascal}} module.
 */
export const {{camel}} = (input) => {
  return input
}

export default {{camel}}
`,
      },
    ],
  },
  {
    id: "node-cli",
    label: "Node CLI",
    description: "Executable script that reads process arguments and logs output.",
    category: "Node & Express",
    mode: "file",
    suggestedName: "cli.js",
    files: [
      {
        path: "{{name}}",
        content: `#!/usr/bin/env node

const args = process.argv.slice(2)

const main = () => {
  console.log("Hello from {{camel}}")

  if (args.length) {
    console.log("Arguments:", args.join(" "))
  }
}

main()
`,
      },
    ],
  },
  {
    id: "node-test",
    label: "Node test",
    description: "node:test suite that imports the module with the same name.",
    category: "Node & Express",
    mode: "file",
    suggestedName: "module.test.js",
    files: [
      {
        path: "{{name}}",
        content: `import test from "node:test"
import assert from "node:assert/strict"
import { {{camel}} } from "./{{stem}}.js"

test("{{camel}} returns the input", () => {
  assert.equal({{camel}}(1), 1)
})
`,
      },
    ],
  },
  {
    id: "html-page",
    label: "HTML page",
    description: "Accessible page plus the stylesheet and script it links to.",
    category: "Web",
    mode: "file",
    suggestedName: "index.html",
    files: [
      {
        path: "{{name}}",
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{Pascal}}</title>
    <link rel="stylesheet" href="./{{base}}.css" />
  </head>
  <body>
    <main class="{{kebab}}">
      <h1>{{Pascal}}</h1>
      <p>Start building here.</p>
    </main>
    <script src="./{{base}}.js" defer></script>
  </body>
</html>
`,
      },
      {
        path: "{{base}}.css",
        content: `:root {
  color-scheme: dark;
  --bg: #0f172a;
  --fg: #e2e8f0;
  --accent: #38bdf8;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
}

.{{kebab}} {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
}
`,
      },
      {
        path: "{{base}}.js",
        content: `const root = document.querySelector(".{{kebab}}")

if (root) {
  root.addEventListener("click", (event) => {
    console.log("clicked", event.target)
  })
}
`,
      },
    ],
  },
  {
    id: "css-stylesheet",
    label: "CSS stylesheet",
    description: "Reset, colour variables and a reusable page shell.",
    category: "Web",
    mode: "file",
    suggestedName: "styles.css",
    files: [
      {
        path: "{{name}}",
        content: `:root {
  --bg: #0f172a;
  --fg: #e2e8f0;
  --accent: #38bdf8;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
}

.{{kebab}} {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem;
}
`,
      },
    ],
  },
  {
    id: "vanilla-js",
    label: "Vanilla JS",
    description: "Event listener tied to a class named after the file.",
    category: "Web",
    mode: "file",
    suggestedName: "script.js",
    files: [
      {
        path: "{{name}}",
        content: `const root = document.querySelector(".{{kebab}}")

if (root) {
  root.addEventListener("click", (event) => {
    console.log("clicked", event.target)
  })
}
`,
      },
    ],
  },
  {
    id: "landing-page",
    label: "Landing page",
    description: "Self-contained hero page with inline styling and a call to action.",
    category: "Web",
    mode: "file",
    suggestedName: "landing.html",
    files: [
      {
        path: "{{name}}",
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{Pascal}}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0f172a;
        --fg: #e2e8f0;
        --accent: #38bdf8;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: system-ui, sans-serif;
        background: radial-gradient(circle at top, #1e293b, var(--bg));
        color: var(--fg);
      }

      main {
        max-width: 640px;
        padding: 2rem;
        text-align: center;
      }

      h1 {
        font-size: clamp(2rem, 6vw, 3.5rem);
        margin: 0 0 1rem;
      }

      p {
        color: #94a3b8;
        line-height: 1.6;
      }

      a {
        display: inline-block;
        margin-top: 1.5rem;
        padding: 0.75rem 1.25rem;
        border-radius: 0.5rem;
        background: var(--accent);
        color: var(--bg);
        font-weight: 600;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>{{Pascal}}</h1>
      <p>Replace this copy with the story behind your product and why people should care.</p>
      <a href="#start">Get started</a>
    </main>
  </body>
</html>
`,
      },
    ],
  },
  {
    id: "python-script",
    label: "Python script",
    description: "Entry point with a main guard and docstring.",
    category: "Python",
    mode: "file",
    suggestedName: "script.py",
    files: [
      {
        path: "{{name}}",
        content: `#!/usr/bin/env python3
"""{{Pascal}}."""


def main() -> None:
    print("Hello from {{camel}}")


if __name__ == "__main__":
    main()
`,
      },
    ],
  },
  {
    id: "python-class",
    label: "Python class",
    description: "Class with a typed constructor and a useful repr.",
    category: "Python",
    mode: "file",
    suggestedName: "class.py",
    files: [
      {
        path: "{{name}}",
        content: `class {{Pascal}}:
    """A small data object."""

    def __init__(self, name: str) -> None:
        self.name = name

    def __repr__(self) -> str:
        return f"{{Pascal}}(name={self.name!r})"
`,
      },
    ],
  },
  {
    id: "fastapi-app",
    label: "FastAPI app",
    description: "Health route and a small POST endpoint using Pydantic.",
    category: "Python",
    mode: "file",
    suggestedName: "app.py",
    files: [
      {
        path: "{{name}}",
        content: `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="{{Pascal}}")


class Item(BaseModel):
    name: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/items")
def create_item(item: Item):
    return {"item": item}
`,
      },
    ],
  },
  {
    id: "json-config",
    label: "JSON config",
    description: "Small, valid JSON object named after the file.",
    category: "Data & config",
    mode: "file",
    suggestedName: "config.json",
    files: [
      {
        path: "{{name}}",
        content: `{
  "name": "{{kebab}}",
  "version": "1.0.0",
  "private": true
}
`,
      },
    ],
  },
  {
    id: "readme",
    label: "README",
    description: "Project introduction, setup steps and a script table.",
    category: "Data & config",
    mode: "file",
    suggestedName: "README.md",
    files: [{ path: "{{name}}", content: readme }],
  },
  {
    id: "env-example",
    label: ".env.example",
    description: "Commented environment template for a Node service.",
    category: "Data & config",
    mode: "file",
    suggestedName: ".env.example",
    files: [
      {
        path: "{{name}}",
        content: `# Copy this file to .env and fill in real values.
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/{{kebab}}
JWT_SECRET=replace-me
`,
      },
    ],
  },
  {
    id: "gitignore",
    label: ".gitignore",
    description: "Node, build output, editors and operating system ignores.",
    category: "Data & config",
    mode: "file",
    suggestedName: ".gitignore",
    files: [
      {
        path: "{{name}}",
        content: `node_modules/
dist/
build/
.env
.env.*
!.env.example
coverage/
.DS_Store
Thumbs.db
*.log
`,
      },
    ],
  },
  {
    id: "dockerfile",
    label: "Dockerfile",
    description: "Multi-stage-friendly Node image with production dependencies.",
    category: "Data & config",
    mode: "file",
    suggestedName: "Dockerfile",
    files: [
      {
        path: "{{name}}",
        content: `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
`,
      },
    ],
  },
  {
    id: "package-json",
    label: "package.json",
    description: "ES module package with dev and start scripts.",
    category: "Data & config",
    mode: "file",
    suggestedName: "package.json",
    files: [
      {
        path: "{{name}}",
        content: `{
  "name": "{{kebab}}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
`,
      },
    ],
  },
  {
    id: "vite-react-starter",
    label: "Vite + React starter",
    description: "Complete Vite app: package.json, entry HTML, main.jsx, App.jsx and CSS.",
    category: "Starters",
    mode: "starter",
    suggestedName: "my-react-app",
    files: [
      {
        path: "{{folder}}/package.json",
        content: `{
  "name": "{{kebab}}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
`,
      },
      {
        path: "{{folder}}/index.html",
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{Pascal}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
      },
      {
        path: "{{folder}}/vite.config.js",
        content: `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
})
`,
      },
      {
        path: "{{folder}}/src/main.jsx",
        content: `import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"
import "./index.css"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
      },
      {
        path: "{{folder}}/src/App.jsx",
        content: `import { useState } from "react"

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <h1>{{Pascal}}</h1>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        count is {count}
      </button>
    </main>
  )
}

export default App
`,
      },
      {
        path: "{{folder}}/src/index.css",
        content: `:root {
  font-family: system-ui, sans-serif;
  color: #e2e8f0;
  background: #0f172a;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}

.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  text-align: center;
}

button {
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #38bdf8;
  background: #38bdf8;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
}
`,
      },
    ],
  },
  {
    id: "express-api-starter",
    label: "Express API starter",
    description: "Express + Mongoose API with env template, routes, controller and model.",
    category: "Starters",
    mode: "starter",
    suggestedName: "my-api",
    files: [
      {
        path: "{{folder}}/package.json",
        content: `{
  "name": "{{kebab}}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "mongoose": "^8.6.0",
    "morgan": "^1.10.0"
  }
}
`,
      },
      {
        path: "{{folder}}/.env.example",
        content: `PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/{{kebab}}
`,
      },
      {
        path: "{{folder}}/src/server.js",
        content: `import "dotenv/config"
import express from "express"
import cors from "cors"
import morgan from "morgan"
import mongoose from "mongoose"
import router from "./routes/index.js"

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan("dev"))
app.use("/api", router)

app.get("/health", (req, res) => {
  res.json({ ok: true })
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(error.status || 500).json({ message: error.message || "Server error" })
})

const port = process.env.PORT || 5000

mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/{{kebab}}")
  .then(() => {
    app.listen(port, () => {
      console.log("API listening on port " + port)
    })
  })
  .catch((error) => {
    console.error("Database connection failed", error)
    process.exit(1)
  })
`,
      },
      {
        path: "{{folder}}/src/routes/index.js",
        content: `import { Router } from "express"
import { listItems, createItem } from "../controllers/item.controller.js"

const router = Router()

router.get("/items", listItems)
router.post("/items", createItem)

export default router
`,
      },
      {
        path: "{{folder}}/src/controllers/item.controller.js",
        content: `import Item from "../models/item.model.js"

export const listItems = async (req, res, next) => {
  try {
    const items = await Item.find().limit(100)
    res.json(items)
  } catch (error) {
    next(error)
  }
}

export const createItem = async (req, res, next) => {
  try {
    const item = await Item.create(req.body)
    res.status(201).json(item)
  } catch (error) {
    next(error)
  }
}
`,
      },
      {
        path: "{{folder}}/src/models/item.model.js",
        content: `import mongoose from "mongoose"

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
)

const Item = mongoose.model("Item", itemSchema)

export default Item
`,
      },
    ],
  },
]

export const TEMPLATE_CATEGORIES = ["All", ...Array.from(new Set(TEMPLATES.map((item) => item.category)))]

export const findTemplate = (id) => TEMPLATES.find((item) => item.id === id) ?? null

/** Name parts used by the placeholders. Works for PascalCase, kebab-case and paths. */
export const deriveNames = (input = "") => {
  const name = input.trim()
  const clean = name.split("/").pop() ?? name
  const dot = clean.lastIndexOf(".")
  const base = dot > 0 ? clean.slice(0, dot) : clean
  const ext = dot > 0 ? clean.slice(dot + 1) : ""

  const words = base
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const Pascal =
    words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("") ||
    "Component"
  const camel = Pascal.charAt(0).toLowerCase() + Pascal.slice(1)
  const kebab = words.map((word) => word.toLowerCase()).join("-") || "component"
  const stem = base.replace(/\.(test|spec)$/i, "")
  // Only treat a name like "useThing" as an existing hook. "UserProfile" also
  // starts with "Use", so the check has to look at the words, not the prefix.
  const isHook = words.length > 1 && words[0].toLowerCase() === "use"
  const hook = isHook ? camel : `use${Pascal}`

  return { name, base, ext, stem, Pascal, camel, kebab, hook }
}

const PLACEHOLDER = /\{\{\s*([A-Za-z]+)\s*\}\}/g

const render = (text, values) =>
  text.replace(PLACEHOLDER, (match, key) => (values[key] === undefined ? match : values[key]))

/** Adds the suggested extension when the user typed a bare file name. */
export const normaliseTemplateName = (template, input = "") => {
  const trimmed = input.trim()
  if (!trimmed || template.mode === "starter") return trimmed

  const suggested = template.suggestedName ?? ""
  const dot = suggested.lastIndexOf(".")
  const extension = dot > 0 ? suggested.slice(dot + 1) : ""
  if (!extension || trimmed.includes(".")) return trimmed
  return `${trimmed}.${extension}`
}

/** Paths and contents for a template, with placeholders filled in. */
export const buildTemplateFiles = (template, input = "") => {
  const names = deriveNames(input)
  const values = {
    ...names,
    folder: names.kebab || names.base || "app",
    description: template.description ?? "",
  }

  return template.files.map((file) => ({
    path: render(file.path, values),
    content: render(file.content, values),
  }))
}
