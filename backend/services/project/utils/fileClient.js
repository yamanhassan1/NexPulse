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
      console.warn(
        `[project] root folder not created: ${response.status}`,
      );
    }
  } catch (error) {
    console.warn(`[project] root folder request failed: ${error.message}`);
  }
};

export const deleteProjectFiles = async ({ userId, projectId }) => {
  try {
    const response = await callFileService(`/project/${projectId}`, {
      method: "DELETE",
      userId,
    });

    if (!response.ok) {
      console.warn(`[project] files not deleted: ${response.status}`);
    }
  } catch (error) {
    console.warn(`[project] file delete request failed: ${error.message}`);
  }
};
