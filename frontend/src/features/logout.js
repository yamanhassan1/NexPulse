import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { api } from "../utils/axios";

export const logout = async () => {
  const { data } = await api.post("/api/auth/logout");
  try {
    await signOut(auth);
  } catch {
    // The server session is already gone. Clearing Firebase is best-effort.
  }
  return data;
};
