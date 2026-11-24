import { useRef, useState } from "react"
import { motion } from "motion/react"
import {
  ArrowUp,
  Bot,
  Code2,
  FileCode2,
  FilePlus2,
  FolderPlus,
  Lightbulb,
  MessageCircle,
  Sparkles,
  TestTube2,
  X,
} from "lucide-react"

const askPrompts = [
  { icon: Lightbulb, label: "Explain this project", prompt: "Explain the structure of this project." },
  { icon: FileCode2, label: "Review the active file", prompt: "Review the active file and suggest improvements." },
  { icon: MessageCircle, label: "Help me debug an issue", prompt: "Help me understand and debug an issue in this project." },
]

const buildPrompts = [
  { icon: FilePlus2, label: "Create a component", prompt: "Create a reusable component for " },
  { icon: FolderPlus, label: "Scaffold a project", prompt: "Scaffold a project for " },
  { icon: TestTube2, label: "Add tests", prompt: "Create tests for the active file." },
]

function AiChatSidebar({ projectName = "", activeFilePath = "", dualPanel = false, onClose }) {
  const [mode, setMode] = useState("ask")
  const [prompt, setPrompt] = useState("")
  const promptRef = useRef(null)
  const suggestedPrompts = mode === "build" ? buildPrompts : askPrompts

  const selectPrompt = (value) => {
    setPrompt(value)
    promptRef.current?.focus()
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.16 }}
      aria-label="AI chat sidebar"
      className={`absolute inset-y-0 right-0 z-50 flex h-full w-[min(320px,calc(100vw-3.5rem))] min-w-0 shrink-0 flex-col border-l border-line bg-panel text-graphite shadow-2xl shadow-black/20 dark:border-line-dark dark:bg-ink-900 dark:text-mist max-sm:w-[min(320px,calc(100vw-3.5rem))] sm:relative sm:inset-auto sm:z-auto sm:min-w-64 sm:shadow-none ${
        dualPanel ? "max-sm:w-[calc(50vw_-_1.75rem)]" : ""
      }`}
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-3 dark:border-line-dark">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
            <Bot size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[12.5px] font-semibold">AI Chat</h2>
            <p className="truncate text-[10px] text-subtle dark:text-faint">Ask questions or build with code</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI chat"
          title="Close AI chat"
          className="rounded-md p-1.5 text-subtle transition-colors hover:bg-hover hover:text-graphite dark:text-faint dark:hover:bg-ink-800 dark:hover:text-mist"
        >
          <X size={14} />
        </button>
      </header>

      <div className="shrink-0 px-3 pt-3">
        <div
          role="tablist"
          aria-label="AI assistant mode"
          className="grid grid-cols-2 rounded-lg bg-hover/80 p-1 dark:bg-ink-950"
        >
          {[
            { id: "ask", label: "Ask", icon: MessageCircle },
            { id: "build", label: "Build", icon: Code2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                mode === id
                  ? "bg-panel text-graphite shadow-sm dark:bg-ink-800 dark:text-mist"
                  : "text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <div className="mb-5 flex flex-col items-center px-2 pt-5 text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-500/15 bg-brand-500/10 text-brand-600 dark:text-brand-300">
            <Sparkles size={20} />
          </span>
          <h3 className="text-[13px] font-semibold">
            {mode === "build" ? "Build with your project" : "What are you working on?"}
          </h3>
          <p className="mt-1.5 max-w-56 text-[11px] leading-relaxed text-subtle dark:text-faint">
            {mode === "build"
              ? "Generate files, add features, or scaffold a project from a prompt."
              : "Ask about your code, explore ideas, or get help with your project."}
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            AI not connected
          </div>
          <p className="text-[10.5px] leading-relaxed text-muted dark:text-mist-muted">
            {mode === "build"
              ? "Connect your LLM, RAG, and MCP services to generate project changes."
              : "Connect your LLM, RAG, and MCP services to enable chat responses."}
          </p>
        </div>

        {mode === "build" && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-brand-500/15 bg-brand-500/5 px-3 py-2.5">
            <Code2 size={13} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
            <p className="text-[10.5px] leading-relaxed text-muted dark:text-mist-muted">
              Proposed file changes will be shown for review. Nothing is written to your project until you approve it.
            </p>
          </div>
        )}

        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-subtle dark:text-faint">
          {mode === "build" ? "Build actions" : "Try asking"}
        </p>
        <div className="flex flex-col gap-1.5">
          {suggestedPrompts.map(({ icon: Icon, label, prompt: value }) => (
            <button
              key={label}
              type="button"
              onClick={() => selectPrompt(value)}
              className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-2 text-left text-[11px] text-muted transition-colors hover:border-brand-500/30 hover:bg-hover hover:text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:border-line-dark dark:bg-ink-850 dark:text-mist-muted dark:hover:bg-ink-800 dark:hover:text-mist"
            >
              <Icon size={13} className="shrink-0 text-brand-600 dark:text-brand-300" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-3 dark:border-line-dark">
        <div className="mb-2 flex min-w-0 items-center gap-1.5 text-[10px] text-subtle dark:text-faint">
          <FileCode2 size={12} className="shrink-0" />
          <span className="truncate" title={activeFilePath || projectName}>
            {activeFilePath || projectName || "No project context"}
          </span>
        </div>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="rounded-xl border border-line bg-surface p-2 focus-within:border-brand-500/50 dark:border-line-dark dark:bg-ink-950"
        >
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            maxLength={4000}
            aria-label="Message AI assistant"
            placeholder="Ask a question about your project..."
            className="max-h-32 min-h-16 w-full resize-y bg-transparent px-1 py-0.5 text-[11.5px] leading-relaxed text-graphite outline-none placeholder:text-faint dark:text-mist dark:placeholder:text-faint"
          />
          <div className="flex items-center justify-between px-0.5 pt-1">
            <span className="text-[9.5px] text-faint">
              {mode === "build" ? "Changes require your approval" : "AI service required"}
            </span>
            <button
              type="submit"
              disabled
              title="Connect an AI service before sending messages"
              aria-label="Send message (AI service not connected)"
              className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg bg-brand-600/35 text-white/70"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-[9px] text-faint">
          Prompts stay in this panel and are not sent.
        </p>
      </div>
    </motion.aside>
  )
}

export default AiChatSidebar
