import TopBar from "../components/TopBar"

const ProjectPage = () => {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0a0a0c]">
        <div className="pointer-events-none absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-sky-500/10 blur-[140px]"/>
        <div className="pointer-events-none absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-[140px]"/>
        <TopBar />

        <div className="flex flex-1 overflow-hidden">

        </div>
    </div>
  )
}

export default ProjectPage