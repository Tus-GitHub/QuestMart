import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

// Only a response authenticated by the server can restore a session.
export const checkSession = createAsyncThunk(
    "user/checkSession",
    async (_, { signal, rejectWithValue }) => {
        try {
            const response = await fetch("/api/auth/me", { cache: "no-store", signal });
            if (response.status === 401) return null;
            const data = await response.json();
            if (!response.ok || !data.success || !data.user) {
                return rejectWithValue("We couldn't check your session. Please try again.");
            }
            return data.user;
        } catch (error) {
            if (signal.aborted) throw error;
            return rejectWithValue("We couldn't reach the server. Please try again.");
        }
    },
    { condition: (_, { getState }) => !getState().user.loading }
);

const initialState = {
    currentUser: null,
    error: null,
    loading: false,
    sessionChecked: false,
    sessionChecking: false,
    sessionError: null,
    sessionRequestId: null,
};

function invalidateSessionCheck(state) {
    // A request started before a login/logout must not overwrite its outcome.
    state.sessionRequestId = null;
    state.sessionChecking = false;
    state.sessionError = null;
}

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        clearAuthError: (state) => { state.error = null; },
        signInStart: (state) => {
            invalidateSessionCheck(state);
            state.loading = true;
            state.error = null;
        },
        signInSuccess: (state, action) => {
            invalidateSessionCheck(state);
            state.currentUser = action.payload;
            state.loading = false;
            state.error = null;
            state.sessionChecked = true;
        },
        signInFailure: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        signOutUserStart: (state) => {
            invalidateSessionCheck(state);
            state.loading = true;
            state.error = null;
        },
        signOutUserSuccess: (state) => {
            invalidateSessionCheck(state);
            state.currentUser = null;
            state.loading = false;
            state.error = null;
            state.sessionChecked = true;
        },
        signOutUserFailure: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(checkSession.pending, (state, action) => {
                state.sessionRequestId = action.meta.requestId;
                state.sessionChecking = true;
                state.sessionChecked = false;
                state.sessionError = null;
            })
            .addCase(checkSession.fulfilled, (state, action) => {
                if (state.sessionRequestId !== action.meta.requestId) return;
                state.currentUser = action.payload;
                state.sessionChecking = false;
                state.sessionChecked = true;
                state.sessionRequestId = null;
                state.sessionError = null;
            })
            .addCase(checkSession.rejected, (state, action) => {
                if (state.sessionRequestId !== action.meta.requestId) return;
                state.sessionChecking = false;
                state.sessionRequestId = null;
                state.sessionChecked = false;
                if (!action.meta.aborted) {
                    state.sessionError = action.payload || "Unable to check your session. Please try again.";
                }
            });
    },
});

export const {
    clearAuthError,
    signInStart,
    signInSuccess,
    signInFailure,
    signOutUserStart,
    signOutUserSuccess,
    signOutUserFailure,
} = userSlice.actions;
export default userSlice.reducer;
