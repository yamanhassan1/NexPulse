import { useEffect, useRef, useState } from "react"
import { SquareTerminal, Trash2, X } from "lucide-react"
import { createFile, createFolder, deleteFile, getFile } from "../../features/file"

const parseArguments = (source) => {
  const parts = source.match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s]+/g) ?? []
  return parts.map((part) => {
    if (
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith("'") && part.endsWith("'"))
    ) {
      return part.slice(1, -1).replace(/\\(["'\\])/g, "$1")
    }
    return part
  })
}

const resolvePath = (path, cwd, rootName) => {
  const value = path.trim().replace(/\\/g, "/")
  const isAbsolute =
    value.startsWith("/") || value === rootName || value.startsWith(`${rootName}/`)
  const parts = isAbsolute ? [] : cwd ? cwd.split("/") : []
  const segments = value.replace(/^\/+/, "").split("/")
  if (segments[0] === rootName) segments.shift()

  for (const segment of segments) {
    if (!segment || segment === ".") continue
    if (segment === "..") parts.pop()
    else parts.push(segment)
  }

  return parts
}

const findNode = (root, pathParts) => {
  let node = root
  for (const part of pathParts) {
    node = node?.children?.find((child) => child.name.toLowerCase() === part.toLowerCase())
    if (!node) return null
  }
  return node
}

const formatTree = (node, prefix = "") => {
  const children = node?.children ?? []
  return children.flatMap((child, index) => {
    const last = index === children.length - 1
    const branch = last ? "└── " : "├── "
    const nextPrefix = `${prefix}${last ? "    " : "│   "}`
    const label = `${prefix}${branch}${child.name}${child.type === "folder" ? "/" : ""}`
    return child.type === "folder" ? [label, ...formatTree(child, nextPrefix)] : [label]
  })
}

function ProjectTerminal({
  tree = [],
  buffers = {},
  rows = [],
  projectId,
  projectName = "",
  onOpenPath,
  onRefresh,
  onPreview,
  onClose,
}) {
  const [cwd, setCwd] = useState("")
  const [input, setInput] = useState("")
  const [entries, setEntries] = useState([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const outputRef = useRef(null)
  const historyRef = useRef([])
  const historyPositionRef = useRef(0)
  const draftRef = useRef("")
  const nextIdRef = useRef(0)

  const root = tree.find((node) => node.type === "folder")
  const rootName = root?.name ?? projectName

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
  }, [entries])

  const readFileContent = async (node) => {
    if (node.encoding === "base64") throw new Error(`${node.name} is a binary file`)

    const buffer = buffers[node._id]
    if (buffer && buffer.status !== "loading" && buffer.status !== "error") return buffer.value

    const file = await getFile(node._id)
    return typeof file?.content === "string" ? file.content : ""
  }

  const runCommand = async (rawCommand) => {
    const trimmed = rawCommand.trim()
    if (!trimmed) return

    const [command = "", ...args] = parseArguments(trimmed)
    const argument = args.join(" ")
    const resolveTarget = (path = ".") => resolvePath(path, cwd, rootName)
    const commandCwd = cwd

    if (command === "clear") {
      setEntries([])
      return
    }

    let output = ""
    let isError = false

    try {
      if (command === "help") {
        output = [
          "Project workspace commands:",
          "  help                       Show this list",
          "  ls [path]                  List files in a folder",
          "  cd [path]                  Change project directory",
          "  pwd                        Show current project path",
          "  tree [path]                Print the project tree",
          "  cat <file>                 Print a text file",
          "  head|tail [-n count] <file> Print the first or last lines",
          "  grep <text> <file>          Find matching lines",
          "  wc <file>                  Count lines, words, and characters",
          "  touch <file>               Create an empty file",
          "  mkdir <folder>             Create a folder",
          "  rm [-r] <path>             Delete a file or folder",
          "  open <file>                Open a file in the editor",
          "  preview                    Open the HTML project preview",
          "  echo <text>                Print text",
          "  clear                      Clear terminal output",
          "",
          "Commands work inside this project only. This browser workspace cannot run",
          "OS commands, install packages, or execute npm scripts.",
        ].join("\n")
      } else if (command === "pwd") {
        output = `/${rootName}${cwd ? `/${cwd}` : ""}`
      } else if (command === "echo") {
        output = args.join(" ")
      } else if (command === "ls" || command === "dir") {
        const path = args.filter((arg) => !arg.startsWith("-")).join(" ") || "."
        const node = findNode(root, resolveTarget(path))
        if (!node) {
          output = `ls: path not found: ${path}`
          isError = true
        } else if (node.type === "file") {
          output = node.name
        } else {
          output =
            node.children?.map((child) => `${child.name}${child.type === "folder" ? "/" : ""}`).join("  ") ||
            "(empty folder)"
        }
      } else if (command === "cd") {
        const path = argument || "/"
        const targetPath = resolveTarget(path)
        const node = findNode(root, targetPath)
        if (!node || node.type !== "folder") {
          output = `cd: directory not found: ${path}`
          isError = true
        } else {
          setCwd(targetPath.join("/"))
        }
      } else if (command === "tree") {
        const path = argument || "."
        const node = findNode(root, resolveTarget(path))
        if (!node || node.type !== "folder") {
          output = `tree: directory not found: ${path}`
          isError = true
        } else {
          output = [node.name, ...formatTree(node)].join("\n")
        }
      } else if (command === "cat" || command === "open") {
        if (!argument) {
          output = `${command}: provide a file path`
          isError = true
        } else {
          const targetPath = resolveTarget(argument)
          const node = findNode(root, targetPath)
          if (!node || node.type !== "file") {
            output = `${command}: file not found: ${argument}`
            isError = true
          } else if (command === "open") {
            const row = rows.find((item) => item.node._id === node._id)
            if (row) {
              onOpenPath?.(row.relPath)
              output = `Opened ${node.name}`
            } else {
              output = `open: could not resolve file path: ${argument}`
              isError = true
            }
          } else {
            output = await readFileContent(node)
          }
        }
      } else if (command === "touch" || command === "mkdir") {
        const path = argument
        if (!path) {
          output = `${command}: provide a name`
          isError = true
        } else {
          const targetPath = resolveTarget(path)
          const name = targetPath.pop()
          const parent = findNode(root, targetPath)
          const existing = parent?.children?.find(
            (child) => child.name.toLowerCase() === name?.toLowerCase(),
          )
          if (!name || name === "." || name === ".." || !parent || parent.type !== "folder") {
            output = `${command}: parent directory not found: ${path}`
            isError = true
          } else if (existing) {
            output = `${command}: ${path} already exists`
            isError = true
          } else {
            if (command === "mkdir") {
              await createFolder({ projectId, name, parentId: parent._id })
            } else {
              await createFile({ projectId, name, parentId: parent._id })
            }
            await onRefresh?.()
            output = `Created ${command === "mkdir" ? "folder" : "file"} ${path}`
          }
        }
      } else if (command === "rm" || command === "rmdir") {
        const recursive =
          command === "rm" &&
          (args.includes("-r") || args.includes("-rf") || args.includes("-fr"))
        const path = args.filter((arg) => !arg.startsWith("-")).join(" ")
        const targetPath = resolveTarget(path)
        const node = findNode(root, targetPath)
        if (!path || !node) {
          output = `${command}: path not found: ${path}`
          isError = true
        } else if (node === root) {
          output = `${command}: cannot remove the project root`
          isError = true
        } else if (command === "rmdir" && node.type !== "folder") {
          output = `rmdir: ${path} is not a directory`
          isError = true
        } else if (command === "rmdir" && node.children?.length) {
          output = `rmdir: ${path} is not empty`
          isError = true
        } else if (command === "rm" && node.type === "folder" && !recursive) {
          output = `${command}: ${path} is a directory (use -r to remove it)`
          isError = true
        } else {
          await deleteFile(node._id)
          await onRefresh?.()
          output = `Removed ${path}`
        }
      } else if (command === "head" || command === "tail") {
        const countIndex = args.indexOf("-n")
        const count = countIndex >= 0 ? Number(args[countIndex + 1]) : 10
        const pathArgs =
          countIndex >= 0
            ? args.filter((_, index) => index !== countIndex && index !== countIndex + 1)
            : args
        const path = pathArgs.join(" ")
        const node = findNode(root, resolveTarget(path))
        if (!path || !node || node.type !== "file") {
          output = `${command}: file not found: ${path}`
          isError = true
        } else if (!Number.isInteger(count) || count < 0) {
          output = `${command}: line count must be a non-negative integer`
          isError = true
        } else {
          const lines = (await readFileContent(node)).split(/\r?\n/)
          output = (command === "head" ? lines.slice(0, count) : lines.slice(-count || lines.length)).join("\n")
        }
      } else if (command === "wc") {
        const node = findNode(root, resolveTarget(argument))
        if (!node || node.type !== "file") {
          output = `wc: file not found: ${argument}`
          isError = true
        } else {
          const content = await readFileContent(node)
          const lines = content ? content.split(/\r?\n/).length : 0
          const words = content.trim() ? content.trim().split(/\s+/).length : 0
          output = `${lines} ${words} ${content.length} ${node.name}`
        }
      } else if (command === "grep") {
        const filePath = args.at(-1)
        const query = args.slice(0, -1).join(" ")
        const node = findNode(root, resolveTarget(filePath ?? ""))
        if (!query || !node || node.type !== "file") {
          output = "grep: usage: grep <text> <file>"
          isError = true
        } else {
          const matches = (await readFileContent(node))
            .split(/\r?\n/)
            .map((line, index) => ({ line, number: index + 1 }))
            .filter(({ line }) => line.includes(query))
          output = matches.map(({ line, number }) => `${number}:${line}`).join("\n") || "No matches found."
        }
      } else if (command === "preview") {
        if (onPreview?.()) {
          output = "Opened the project preview."
        } else {
          output = "preview: add an index.html file to this project first"
          isError = true
        }
      } else if (command === "npm" || command === "node" || command === "npx") {
        output = `${command}: package scripts and runtime commands cannot execute in this browser workspace. Use "preview" for an HTML project.`
        isError = true
      } else {
        output = `${command}: command not found. Type "help" for available commands.`
        isError = true
      }
    } catch (error) {
      console.error(`[terminal:${command}] ${error.message}`)
      output = `${command}: ${error.response?.data?.message || error.message || "command failed"}`
      isError = true
    }

    setEntries((current) => [
      ...current,
      { id: nextIdRef.current++, command: trimmed, cwd: commandCwd, output, isError },
    ])
  }

  const submit = async (event) => {
    event.preventDefault()
    const command = input
    setInput("")
    if (!command.trim()) return

    historyRef.current = [...historyRef.current, command]
    historyPositionRef.current = historyRef.current.length
    draftRef.current = ""

    setBusy(true)
    try {
      await runCommand(command)
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const handleInputKeyDown = (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (!historyRef.current.length) return
      if (historyPositionRef.current === historyRef.current.length) draftRef.current = input
      historyPositionRef.current = Math.max(0, historyPositionRef.current - 1)
      setInput(historyRef.current[historyPositionRef.current] ?? "")
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      historyPositionRef.current = Math.min(historyRef.current.length, historyPositionRef.current + 1)
      setInput(
        historyPositionRef.current === historyRef.current.length
          ? draftRef.current
          : historyRef.current[historyPositionRef.current] ?? "",
      )
    } else if (event.key === "c" && event.ctrlKey) {
      event.preventDefault()
      setInput("")
    }
  }

  return (
    <section
      aria-label="Project terminal"
      className="flex h-[min(16rem,40dvh)] min-h-28 shrink-0 flex-col border-t border-line bg-[#1e1e1e] font-mono text-[12px] text-[#cccccc] dark:border-line-dark sm:h-64 sm:min-h-40"
    >
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 bg-[#181818] px-3">
        <div className="flex h-full items-center gap-5">
          <div
            aria-current="page"
            className="flex h-full items-center gap-2 border-b border-[#007fd4] text-[11px] font-medium text-[#e7e7e7]"
          >
            <SquareTerminal size={14} className="text-[#9da2a6]" />
            TERMINAL
          </div>
          <span className="text-[10px] text-[#858585]">{rootName || "Project workspace"}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEntries([])}
            aria-label="Clear terminal"
            title="Clear terminal"
            className="rounded p-1 text-[#9da2a6] transition-colors hover:bg-white/10 hover:text-white"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close terminal"
            title="Close terminal"
            className="rounded p-1 text-[#9da2a6] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      <div ref={outputRef} className="min-h-0 flex-1 overflow-auto px-3 py-2.5">
        <p className="mb-2 text-[#858585]">
          NexPulse project terminal. Type <span className="text-[#ce9178]">help</span> for commands.
        </p>
        {entries.map((entry) => (
          <div key={entry.id} className="mb-2">
            <div className="flex gap-2">
              <span className="select-none text-[#4ec9b0]" aria-hidden="true">
                {rootName || "project"}{entry.cwd ? `/${entry.cwd}` : ""} $
              </span>
              <span className="whitespace-pre-wrap break-all text-[#d4d4d4]">{entry.command}</span>
            </div>
            {entry.output && (
              <pre
                className={`mt-1 whitespace-pre-wrap break-words pl-2 ${
                  entry.isError ? "text-[#f48771]" : "text-[#cccccc]"
                }`}
              >
                {entry.output}
              </pre>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-2">
        <span className="max-w-[45%] truncate text-[#4ec9b0]" title={`/${rootName}${cwd ? `/${cwd}` : ""}`}>
          {rootName || "project"}{cwd ? `/${cwd}` : ""}
        </span>
        <span className="select-none text-[#4ec9b0]" aria-hidden="true">$</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={busy}
          aria-label="Project terminal command"
          autoComplete="off"
          spellCheck="false"
          className="min-w-0 flex-1 bg-transparent text-[#d4d4d4] outline-none placeholder:text-[#858585] disabled:opacity-60"
          placeholder="Type a command..."
        />
      </form>
    </section>
  )
}

export default ProjectTerminal
