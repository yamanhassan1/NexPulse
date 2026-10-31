import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  projects: [],
  starredProjects: [],
  projectsLoaded: false,
  starredLoaded: false,
  loadingProjects: false,
  loadingStarred: false,
  projectsError: null,
  starredError: null,
  currentProject: null,
};

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    setProjects: (state, action) => {
      state.projects = Array.isArray(action.payload) ? action.payload : [];
      state.projectsLoaded = true;
      state.loadingProjects = false;
      state.projectsError = null;
    },
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload
      state.projectsLoaded = true;
      state.loadingProjects = false;
      state.projectsError = null;
    },
    setStarredProjects: (state, action) => {
      state.starredProjects = Array.isArray(action.payload)
        ? action.payload
        : [];
      state.starredLoaded = true;
      state.loadingStarred = false;
      state.starredError = null;
    },
    setLoadingProjects: (state, action) => {
      state.loadingProjects = action.payload;
      if (action.payload) state.projectsError = null;
    },
    setLoadingStarred: (state, action) => {
      state.loadingStarred = action.payload;
      if (action.payload) state.starredError = null;
    },
    setProjectsError: (state, action) => {
      state.projectsError = action.payload;
      state.loadingProjects = false;
    },
    setStarredError: (state, action) => {
      state.starredError = action.payload;
      state.loadingStarred = false;
    },
    addNewProject: (state, action) => {
      state.projects.unshift(action.payload);
    },
    setProjectStarred: (state, action) => {
      const { id, starred } = action.payload;
      const applyStar = (project) => {
        if (project && project._id == id) project.starred = starred;
      };

      state.projects.forEach(applyStar);
      state.starredProjects.forEach(applyStar);

      if (starred) {
        const project = state.projects.find((p) => p._id == id);
        const alreadyStarred = state.starredProjects.some((p) => p._id == id);
        if (project && !alreadyStarred) {
          state.starredProjects.unshift(project);
          state.starredLoaded = true;
        }
      } else {
        state.starredProjects = state.starredProjects.filter(
          (p) => p._id != id,
        );
      }
    },
    setDeleteProject: (state, action) => {
      const id = action.payload;
      state.projects = state.projects.filter((p) => p._id != id);
      state.starredProjects = state.starredProjects.filter((p) => p._id != id);
    },
    clearProjects: () => initialState,
  },
});

export const {
  setProjects,
  setStarredProjects,
  setLoadingProjects,
  setLoadingStarred,
  setProjectsError,
  setStarredError,
  addNewProject,
  setProjectStarred,
  setDeleteProject,
  clearProjects,
  setCurrentProject,
} = projectSlice.actions;
export default projectSlice.reducer;
