import { api } from "../utils/axios";

export const logout = async () => {
  const { data } = await api.post("/api/auth/logout");
  return data;
};
