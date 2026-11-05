import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./user/userSlice.js";

// One store per mounted application, with no browser-persisted identity.
export const makeStore = () => configureStore({
    reducer: { user: userReducer },
});
