import { createSlice } from '@reduxjs/toolkit';
import { getDetfaultSettings } from '../config/settings';
import {
    setStorage,
    STORAGE_SETTINGS_KEY,
    STORAGE_USER_ID_KEY,
} from '../lib/storage';
import { v4 as uuidv4 } from 'uuid';
import mixpanel from 'mixpanel-browser';

const initialState = {
    storageSettings: getDetfaultSettings(),
    userId: false,
};

export const userSlice = createSlice({
    name: 'user',
    initialState,
    // The `reducers` field lets us define reducers and generate associated actions
    reducers: {
        updateSettingWithKey: (state, data) => {
            state.storageSettings[data.payload.key] = data.payload.value;
        },
        setAllSettings: (state, data) => {
            state.storageSettings = data.payload;
        },
        setUserId: (state, data) => {
            state.userId = data.payload;
        },
    },
});

const { updateSettingWithKey, setAllSettings, setUserId } = userSlice.actions;

export const selectAllSettings = (state) => state.user.storageSettings;

export const selectSettingWithKey = (key) => (state) =>
    state.user.storageSettings[key];

export const initUser = () => async (dispatch, getState) => {
    let storage = await chrome.storage.local.get([STORAGE_USER_ID_KEY]);
    if (!storage[STORAGE_USER_ID_KEY]) {
        await setStorage(STORAGE_USER_ID_KEY, uuidv4());
        return;
    }
    mixpanel.identify(storage[STORAGE_USER_ID_KEY]);
    dispatch(setUserId(storage[STORAGE_USER_ID_KEY]));
    dispatch(initSettings());
};

// We can also write thunks by hand, which may contain both sync and async logic.
// Here's an example of conditionally dispatching actions based on current state.
export const updateSetting = (key, value) => async (dispatch, getState) => {
    mixpanel.track('SETTINGS_UPDATE', {
        key: key,
        value: value,
    });
    let storageSettings = { ...selectAllSettings(getState()) };
    storageSettings[key] = value;
    await setStorage(STORAGE_SETTINGS_KEY, storageSettings);
    dispatch(
        updateSettingWithKey({
            key,
            value,
        })
    );
};

const initSettings = () => async (dispatch, getState) => {
    let storage = await chrome.storage.local.get([STORAGE_SETTINGS_KEY]);
    if (!storage[STORAGE_SETTINGS_KEY]) {
        const defaultSettings = selectAllSettings(getState());
        mixpanel.track('SETTINGS_INIT', {
            settings: defaultSettings,
        });
        await setStorage(STORAGE_SETTINGS_KEY, defaultSettings);
        return;
    }
    dispatch(setAllSettings(storage.settings));
};

export default userSlice.reducer;
