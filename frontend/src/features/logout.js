import { api } from "../utils/axios";

export const logout = async () => {
  const { data } = await api.get("/api/auth/logout");
  return data;
};
