import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '../features/walletSlice';
import navbarReducer from '../features/navbarSlice';
import userReducer from '../features/userSlice';

export const store = configureStore({
    reducer: {
        wallet: walletReducer,
        navbar: navbarReducer,
        user: userReducer,
    },
    devTools: true,
});
