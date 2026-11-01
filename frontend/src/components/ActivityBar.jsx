import { Bot, Files, SquareTerminal } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"

function ActivityIcon({ icon: Icon, label, active, onClick }) {
    const [hovered, setHovered] = useState(false)
    return (
        <div
            className="relative"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={onClick}
                aria-label={label}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 dark:hover:bg-ink-800"
            >
                <AnimatePresence>
                    {active && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 rounded-lg bg-brand-500/10 ring-1 ring-brand-500/20 dark:bg-ink-800 dark:ring-white/10"
                        />
                    )}
                </AnimatePresence>

                <Icon size={19}
                    className={`relative z-10 transition-colors ${active ? "text-brand-600 dark:text-brand-400" : "text-subtle hover:text-graphite dark:text-faint dark:hover:text-mist"}`}
                />

                <AnimatePresence>
                    {active && (
                        <motion.div
                            initial={{ opacity: 0, scaleY: 0.5 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            exit={{ opacity: 0, scaleY: 0.5 }}
                            className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-linear-to-b from-brand-400 to-brand-600"
                            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            className="pointer-events-none absolute left-11 top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-line bg-panel px-2 py-1 text-[11px] font-medium text-graphite shadow-lg shadow-black/10 dark:border-line-dark dark:bg-ink-850 dark:text-mist dark:shadow-black/40"
                            transition={{ duration: 0.12 }}
                        >
                            {label}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    )
}


const ActivityBar = ({showExplorer, showAiChat, showTerminal, setShowExplorer, setShowAiChat, setShowTerminal}) => {

    return (
        <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-line bg-panel py-3 transition-colors duration-200 dark:border-line-dark dark:bg-ink-900">
            <ActivityIcon
                icon={Files}
                label={"Explorer"}
                active={showExplorer}
                onClick={() => setShowExplorer((v) => !v)}
            />

            <ActivityIcon
                icon={Bot}
                label={"AI Chat"}
                active={showAiChat}
                onClick={() => setShowAiChat((v) => !v)}
            />

            <div className="mt-auto flex flex-col items-center gap-2">
                <div className="mb-1 h-px w-6 bg-line dark:bg-line-dark" />
                <ActivityIcon
                    icon={SquareTerminal}
                    label={"Terminal"}
                    active={showTerminal}
                    onClick={() => setShowTerminal((v) => !v)}
                />
            </div>

        </div>
    )
}

export default ActivityBar
