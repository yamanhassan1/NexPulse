import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    authChecked: false,
    // Set only when the session probe failed for a reason that is NOT
    // "you are signed out" (5xx, network). Keeps a Redis blip from looking
    // like a logout.
    authError: null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
      if (action.payload) state.authError = null;
    },
    setAuthChecked: (state, action) => {
      state.authChecked = action.payload;
    },
    setAuthError: (state, action) => {
      state.authError = action.payload;
    },
  },
});

export const { setUserData, setAuthChecked, setAuthError } = userSlice.actions;
export default userSlice.reducer;
