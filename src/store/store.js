import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '../features/walletSlice';
import navbarReducer from '../features/navbarSlice';
import settingsReducer from '../features/settingsSlice';

export const store = configureStore({
    reducer: {
        wallet: walletReducer,
        navbar: navbarReducer,
        settings: settingsReducer,
    },
    devTools: true,
});
