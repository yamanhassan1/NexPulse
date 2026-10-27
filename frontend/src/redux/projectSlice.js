import { createSlice } from "@reduxjs/toolkit";

const projectSlice = createSlice({
  name: "project",
  initialState: {
    projects: [],
    starredProjects: [],
  },
  reducers: {
    setProjects: (state, action) => {
      state.projects = action.payload;
    },
    setStarredProjects: (state, action) => {
      state.starredProjects = action.payload;
    },
    addNewProject: (state, action) => {
      state.projects.unshift(action.payload);
    },
    starProject: (state, action) => {
      const id = action.payload;
      const project = state.projects.find((p) => p._id == id);
      if (project) {
        project.starred = !project.starred;
        if (project.starred) {
          const alreadyStarred = state.starredProjects.some((p) => p._id == id);
          if (!alreadyStarred) {
            state.starredProjects.unshift(project);
          }
        } else {
          state.starredProjects = state.starredProjects.filter((p) => p._id != id);
        }
      } else {
        const starred = state.starredProjects.find((p) => p._id == id);
        if (starred) {
          starred.starred = !starred.starred;
          if (!starred.starred) {
            state.starredProjects = state.starredProjects.filter((p) => p._id != id);
          }
        }
      }
    },
    setDeleteProject: (state, action) => {
      const id = action.payload;
      state.projects = state.projects.filter((p) => p._id != id);
      state.starredProjects = state.starredProjects.filter((p) => p._id != id);
    },
    clearProjects: (state) => {
      state.projects = [];
      state.starredProjects = [];
    },
  },
});

export const {
  setProjects,
  setStarredProjects,
  addNewProject,
  starProject,
  setDeleteProject,
  clearProjects,
} = projectSlice.actions;
export default projectSlice.reducer;
