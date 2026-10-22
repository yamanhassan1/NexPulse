import { api } from "../utils/axios";

export const login = async (token) => {
  const { data } = await api.post("/api/auth/login", { token });
  return data;
};
