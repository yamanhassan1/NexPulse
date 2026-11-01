import { useParams } from "react-router-dom"
import ProjectView from "../components/ProjectView"

// Keyed by project id so switching projects resets tabs, buffers and the
// explorer's stored expansion state instead of leaking them across.
function ProjectPage() {
  const { id } = useParams()
  return <ProjectView key={id} projectId={id} />
}

export default ProjectPage
