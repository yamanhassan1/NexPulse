import { useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import CodeEditor from "./components/editor/CodeEditor"
import { DEFAULT_SETTINGS } from "./utils/editorSettings"

const initial = "const first = 1\r\nconst second = 2\r\nconst third = 3\r\n"

function Harness() {
  const [value, setValue] = useState(initial)
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS })
  const [width, setWidth] = useState(700)

  const update = (next) => {
    window.__buffer = next
    setValue(next)
  }

  window.__setBuffer = update
  window.__setSettings = (next) => setSettings((current) => ({ ...current, ...next }))
  window.__setWidth = setWidth
  window.__getState = () => ({
    buffer: value,
    settings,
    width,
  })

  const eol = value.includes("\r\n") ? "CRLF" : "LF"

  return (
    <div style={{ width, height: 500, display: "flex" }}>
      <CodeEditor
        value={value}
        onChange={update}
        language="javascript"
        fileName="test.js"
        filePath="test.js"
        eol={eol}
        settings={settings}
        onSettingsChange={setSettings}
        onSave={() => {}}
        ariaLabel="Harness"
      />
    </div>
  )
}

createRoot(document.getElementById("root")).render(<Harness />)
