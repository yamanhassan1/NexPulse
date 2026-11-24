import { useCallback, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "../src/index.css"
import CodeEditor from "../src/components/editor/CodeEditor"
import ThemeProvider from "../src/hooks/ThemeProvider"
import { DEFAULT_SETTINGS } from "../src/utils/editorSettings"

const initial = "const first = 1\r\nconst second = 2\r\nconst third = 3\r\n"

function Harness() {
  const [value, setValue] = useState(initial)
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS })
  const [width, setWidth] = useState(700)

  const update = useCallback((next) => {
    window.__buffer = next
    setValue(next)
  }, [])

  useEffect(() => {
    window.__setBuffer = update
    window.__setSettings = (next) => setSettings((current) => ({ ...current, ...next }))
    window.__setWidth = setWidth
    window.__getState = () => ({ buffer: value, settings, width })

    return () => {
      delete window.__setBuffer
      delete window.__setSettings
      delete window.__setWidth
      delete window.__getState
    }
  }, [update, value, settings, width])

  const eol = value.includes("\r\n") ? "CRLF" : "LF"

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  )
}

createRoot(document.getElementById("root")).render(<Harness />)

export { Harness }
