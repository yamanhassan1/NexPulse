import { tool } from "@langchain/core/tools";
import { getFile, getTree } from "../utils/fetchFileApis.js";
import { z } from "zod";

const compactTree = (items = []) => {
  return items.map(() => ({
    _id: item._id,
    name: item.name,
    parentId: item.parentId,
    type: item.type,
    extension: item.extension,
    language: item.language,

    children: compactTree(item.children || []),
  }));
};

export const fileTool = ({ projectId, userId }) => {
  const getTreeTool = tool(
    async () => {
      console.log("ai tool-get_tree called");
      const result = await getTree({ userId, projectId });
      const tree = compactTree(result);
      return JSON.stringify({
        success: true,
        tree,
      });
    },
    {
      name: "get_tree",
      description: `Get the complete project file and folder tree.

            IMPORTANT: 

            1. Use this when the project structure is unknown.
            2. Do not repeatedly call get-tree.
            3. type="folder" means a folder.
            4. type="file" means a file.
            5. Folder IDs are used as parentId.
            6. NEVER call get_file with a folder ID.
            7. Do not use terminal commands to inspect the project.
            8. Use the exact IDs returned by this tool.

            The tree contains:
            _id
            parentId
            name
            type
            language
            extension
            children
      `,
      schema: z.object({}),
    },
  );

  const getFileTool = tool(
    async ({ fileId }) => {
      console.log("ai tool-get_file called");
      const file = await getFile({ id: fileId, userId });

      if (file && file.type != "file") {
        console.log("get file blocked: id is a folder");
        return JSON.stringify({
          success: false,
          error: "The provided ID corresponds to a folder, not a file.",
          instructions: "Do not call get_file for folders. Use the folder ID as parentId.",
        });
      }

      if (!file) {
        console.log("get file blocked: file not found");
        return JSON.stringify({
          success: false,
          error: "File not found.",
        });
      }

      return JSON.stringify({
        success: true,
        file: {
          _id: file._id,
          name: file.name,
          parentId: file.parentId,
          type: file.type,
          language: file.language,
          extension: file.extension,
          content: file.content
        },
      });
    },
    {
      name: "get_file",
      description: `Read an EXISTING FILE before modifying it.

            STRICT RULES: 

            1. fileId must belong to a file.
            2. NEVER pass a folder ID.
            3. Use exact file ID from get_tree.
            4. Call this before update_file.
            5. Do not call this for newly created files unless necessary.
            6. Do not call this repeatedly for same file.

            The response contains the complete file content.
      `,
      schema: z.object({
        fileId: z.string(),
      }),
    },
  );

  const createFolderTool = tool(
    async ({ name, parentId }) => {
      console.log("ai tool-create_folder called");
      const folder = await createFolder({ name, parentId, userId, projectId });

      return JSON.stringify({
        success: true,
        operation: "folder_created",
        folder: {
          _id: folder._id,
          name: folder.name,
          parentId: folder.parentId,
          type: folder.type,
        },
      });
    },
    {
      name: "create_folder",
      description: `Create a new folder.

            RULES:

            1. Create parent folders first.
            2. Use exact parentId from get_tree.
            3. NEVER create duplicate folders.
            4. A folder directly inside another folder must use that folder's ID as parentId.
            5. After creation continue with the remaining files.
            6. Do not call get_tree just to verify the folder.

      `,
      schema: z.object({
        name: z.string(),
        parentId: z.string().nullable(),
      }),
    },
  );

  const createFileTool = tool(
    async ({ name, parentId, content, language }) => {
      console.log("ai tool-create_file called");
      const file = await createFile({ name, parentId, userId, projectId, content, language: language || "plaintext" });

      return JSON.stringify({
        success: true,
        operation: "file_created",
        file: {
          _id: file._id,
          name: file.name,
          parentId: file.parentId,
          type: file.type,
          language: file.language,
          extension: file.extension,
          content: file.content
        },
      });
    },
    {
      name: "create_file",
      description: `Create a NEW FILE.

            RULES:

            1. Use get_tree first when project structure is unknown.
            2. Use exact folder ID as a parentId.
            3. NEVER create duplicate files.
            4. Send complete file content.
            5. Create folders before files inside them.
            6. NEVER use terminal commands to create files.
            7. Do not call get_file immediately after creating a file.
            8. Continue creating all files.
            9. Do no stop after creating only one file.

            For React/Vite or etc projects, create all required files.

      `,
      schema: z.object({
        name: z.string(),
        parentId: z.string(),
        language: z.string().optional(),
        content: z.string(),
      }),
    },
  );

  const updateFileTool = tool(
    async ({ name, content, fileId }) => {
      console.log("ai tool-update_file called");
      const file = await updateFile({ name, userId, projectId, content, id: fileId });

      return JSON.stringify({
        success: true,
        operation: "file_updated",
        file: {
          _id: file._id,
          name: file.name,
          parentId: file.parentId,
          type: file.type,
          language: file.language,
          content: file.content
        },
      });
    },
    {
      name: "update_file",
      description: `Update an EXISTING FILE.

            RULES:

            1. Call get_file before updating.
            2. fileId must be an actual file ID.
            3. NEVER use a folder ID.
            4. Send the complete updated file content.
            5. Do not update file that do not exist.
            6. After successful update continue with remaining work.
            7. Do not call get_file again unless another modification is needed.
            
      `,
      schema: z.object({
        name: z.string(),
        fileId: z.string(),
        content: z.string(),
      }),
    },
  );

  const deleteFileTool = tool(
    async ({ fileId }) => {
      console.log("ai tool-delete_file called");
      const file = await deleteFile({userId, id: fileId });

      return JSON.stringify({
        success: true,
        operation: "file_deleted",
        file: {
          _id: file._id,
        },
      });
    },
    {
      name: "delete_file",
      description: `Delete an EXISTING FILE from the project.

            STRICT RULES:

            1. fileId must belong to an actual file ID.
            2. NEVER pass a folder ID.
            3. Use the exact file ID from get_tree.
            4. Before deleting, make sure the target is actually a file.
            5. Do not delete file unless the user's request requires it.
            6. NEVER use terminal commands to delete files.
            7. After successful deletion continue with remaining work.
            8. Do not call get_file after deletion.
            
      `,
      schema: z.object({
        fileId: z.string(),
      }),
    },
  );

  return [
    getTreeTool,
    getFileTool,
    deleteFileTool,
    createFolderTool,
    createFileTool,
    updateFileTool,
  ]
}
