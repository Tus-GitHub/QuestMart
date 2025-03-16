import userReducer from './user/userSlice'
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";

import createWebStorage from "redux-persist/lib/storage/createWebStorage";

const createNoopStorage = () => ({
  getItem() {
    return Promise.resolve(null);
  },
  setItem() {
    return Promise.resolve();
  },
  removeItem() {
    return Promise.resolve();
  },
});

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();


const rootReducer = combineReducers({user:userReducer});

const persistConfig = {
    key:'root',
    storage,
    version:1,
};  

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer:persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck:false,
        }),
});

export const persistor = persistStore(store);

export const getRootState = store.getState;