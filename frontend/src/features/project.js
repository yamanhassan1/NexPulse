import { api } from "../utils/axios";

export const createProject = async ({name, description}) => {
  const { data } = await api.post("/api/project", { name, description });
  return data;
};

export const getProjects = async () => {
  const { data } = await api.get("/api/project");
  return data;
};

export const getProjectById = async (id) => {
  const { data } = await api.get(`/api/project/${id}`);
  return data;
};

export const getStarredProjects = async () => {
  const { data } = await api.get("/api/project/starred");
  return data;
};

export const toggleStar = async (id) => {
  const { data } = await api.patch(`/api/project/star/${id}`);
  return data;
};

export const deleteProject = async (id) => {
  const { data } = await api.delete(`/api/project/${id}`);
  return data;
};