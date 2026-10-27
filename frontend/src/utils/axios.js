import axios from "axios";
import { store } from "../redux/store";
import { setUserData } from "../redux/userSlice";
import { clearProjects } from "../redux/projectSlice";

export const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthProbe =
      url.includes("/api/me") || url.includes("/api/auth/login");

    if (status === 401 && !isAuthProbe && store.getState().user.userData) {
      store.dispatch(setUserData(null));
      store.dispatch(clearProjects());
    }

    return Promise.reject(error);
  },
);
