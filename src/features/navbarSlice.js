import { faCog, faExchange } from '@fortawesome/free-solid-svg-icons';
import { createSlice } from '@reduxjs/toolkit';
import mixpanel from 'mixpanel-browser';

export const NAVBAR_PAGES = {
    transactions: {
        icon: faExchange,
        value: 'transactions',
    },
    settings: {
        icon: faCog,
        value: 'settings',
    },
};

const initialState = {
    page: NAVBAR_PAGES.settings.value,
};

export const navbarSlice = createSlice({
    name: 'navbar',
    initialState,
    // The `reducers` field lets us define reducers and generate associated actions
    reducers: {
        setPage: (state, data) => {
            mixpanel.track('NAVIGATE', {
                page: data.payload,
            });
            state.page = data.payload;
        },
    },
});

export const { setPage } = navbarSlice.actions;

export const selectPage = (state) => {
    return state.navbar.page;
};

export default navbarSlice.reducer;
