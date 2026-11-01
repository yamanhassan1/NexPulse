import { getFolderIconBody } from "../utils/materialFolders"

/**
 * Folder icon from the Material Icon Theme set, chosen by folder name
 * (src → green code folder, node_modules → package folder, and so on).
 */
function MaterialFolderIcon({ name = "", size = 16, className = "", title }) {
    return (
        <svg
            viewBox="0 0 16 16"
            width={size}
            height={size}
            className={className}
            role={title ? "img" : undefined}
            aria-label={title}
            aria-hidden={title ? undefined : "true"}
            focusable="false"
            dangerouslySetInnerHTML={{ __html: getFolderIconBody(name) }}
        />
    )
}

export default MaterialFolderIcon
