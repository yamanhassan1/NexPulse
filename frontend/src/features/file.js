import { api } from "../utils/axios";

export const createRootFolder = async ({ projectId, projectName }) => {
  const { data } = await api.post("/api/file/create-root-folder", {
    projectId,
    projectName,
  });
  return data;
};

export const createFolder = async ({ projectId, name, parentId }) => {
  const { data } = await api.post("/api/file/create-folder", {
    projectId,
    name,
    parentId,
  });
  return data;
};

export const createFile = async ({
  projectId,
  name,
  parentId,
  content = "",
  language = "plaintext",
}) => {
  const { data } = await api.post("/api/file/create-file", {
    projectId,
    name,
    parentId,
    content,
    language,
  });
  return data;
};

export const updateFile = async (id, updates) => {
  const { data } = await api.patch(`/api/file/update/${id}`, updates);
  return data;
};

export const deleteFile = async (id) => {
  const { data } = await api.delete(`/api/file/${id}`);
  return data;
};

export const restoreDeleted = async (batchId) => {
  const { data } = await api.patch(`/api/file/restore/${batchId}`);
  return data;
};

export const deleteProjectFiles = async (projectId) => {
  const { data } = await api.delete(`/api/file/project/${projectId}`);
  return data;
};

export const getFile = async (id) => {
  const { data } = await api.get(`/api/file/${id}`);
  return data;
};

export const getRawFile = async (id) => {
  const { data } = await api.get(`/api/file/${id}/raw`, { responseType: "blob" });
  return data;
};

export const getTree = async (projectId) => {
  const { data } = await api.get(`/api/file/tree/${projectId}`);
  return data;
};

export const moveNode = async ({ id, parentId }) => {
  const { data } = await api.patch("/api/file/move", { id, parentId });
  return data;
};

export const copyNode = async ({ id, parentId }) => {
  const { data } = await api.post("/api/file/copy", { id, parentId });
  return data;
};

export const importFiles = async ({ projectId, parentId, files }) => {
  const { data } = await api.post("/api/file/import", { projectId, parentId, files });
  return data;
};
