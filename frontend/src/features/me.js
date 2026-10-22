import { api } from "../utils/axios";

export const me = async () => {
  const { data } = await api.get("/api/me");
  return data;
};
