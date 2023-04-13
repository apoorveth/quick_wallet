import { createSlice } from '@reduxjs/toolkit';
import SETTINGS_CONFIG, { getDetfaultSettings } from '../config/settings';
import { setStorage, STORAGE_SETTINGS_KEY } from '../lib/storage';

const initialState = {
    storageSettings: getDetfaultSettings(),
};

export const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    // The `reducers` field lets us define reducers and generate associated actions
    reducers: {
        updateSettingWithKey: (state, data) => {
            state.storageSettings[data.payload.key] = data.payload.value;
        },
        setAllSettings: (state, data) => {
            state.storageSettings = data.payload;
        },
    },
});

const { updateSettingWithKey, setAllSettings } = settingsSlice.actions;

export const selectAllSettings = (state) => state.settings.storageSettings;

export const selectSettingWithKey = (key) => (state) =>
    state.settings.storageSettings[key];

export const initSettings = () => async (dispatch, getState) => {
    let storage = await chrome.storage.sync.get([STORAGE_SETTINGS_KEY]);
    if (!storage[STORAGE_SETTINGS_KEY]) {
        await setStorage(STORAGE_SETTINGS_KEY, selectAllSettings(getState()));
        return;
    }
    dispatch(setAllSettings(storage.settings));
};

// We can also write thunks by hand, which may contain both sync and async logic.
// Here's an example of conditionally dispatching actions based on current state.
export const updateSetting = (key, value) => async (dispatch, getState) => {
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

export default settingsSlice.reducer;
