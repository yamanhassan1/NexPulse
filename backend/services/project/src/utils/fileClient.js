import { internalHeaders } from "../../../../shared/src/http/internalAuth.js";

const FILE_SERVICE = process.env.FILE_SERVICE || "http://localhost:8003";
const REQUEST_TIMEOUT_MS = 3000;

const callFileService = async (path, { method, userId, body } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${FILE_SERVICE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        ...internalHeaders(),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

export const createProjectRootFolder = async ({
  userId,
  projectId,
  projectName,
}) => {
  try {
    const response = await callFileService("/create-root-folder", {
      method: "POST",
      userId,
      body: { projectId, projectName },
    });

    if (!response.ok) {
      throw Object.assign(
        new Error(`Root folder creation failed: ${response.status}`),
        { code: "ROOT_FOLDER_SETUP_FAILED", status: response.status },
      );
    }
  } catch (error) {
    if (error?.code === "ROOT_FOLDER_SETUP_FAILED") throw error;
    throw Object.assign(
      new Error(`Root folder request failed: ${error.message}`),
      { code: "ROOT_FOLDER_SETUP_FAILED" },
    );
  }
};

export const renameProjectRootFolder = async ({ userId, projectId, name }) => {
  try {
    const response = await callFileService(`/project-root/${projectId}`, {
      method: "PATCH",
      userId,
      body: { name },
    });

    if (!response.ok) {
      throw Object.assign(
        new Error(`Root folder rename failed: ${response.status}`),
        { code: "ROOT_FOLDER_RENAME_FAILED", status: response.status },
      );
    }
  } catch (error) {
    if (error?.code === "ROOT_FOLDER_RENAME_FAILED") throw error;
    throw Object.assign(
      new Error(`Root folder rename request failed: ${error.message}`),
      { code: "ROOT_FOLDER_RENAME_FAILED" },
    );
  }
};

export const deleteProjectFiles = async ({ userId, projectId }) => {
  try {
    const response = await callFileService(`/project/${projectId}`, {
      method: "DELETE",
      userId,
    });

    if (!response.ok) {
      throw Object.assign(
        new Error(`Project file deletion failed: ${response.status}`),
        { code: "PROJECT_FILES_DELETE_FAILED", status: response.status },
      );
    }
  } catch (error) {
    if (error?.code === "PROJECT_FILES_DELETE_FAILED") throw error;
    throw Object.assign(
      new Error(`Project file delete request failed: ${error.message}`),
      { code: "PROJECT_FILES_DELETE_FAILED" },
    );
  }
};
