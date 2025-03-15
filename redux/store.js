import userReducer from './user/userSlice'
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import persistReducer from "redux-persist/es/persistReducer";
import persistStore from "redux-persist/es/persistStore";
import storage from "redux-persist/lib/storage";


const rootReducer = combineReducers({user:userReducer});

const persistConfig = {
    key:'root',
    storage,
    version:1,
};

const persistReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer:persistReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck:false,
        }),
});

export const persistor = persistStore(store);

export const getRootState = store.getState;