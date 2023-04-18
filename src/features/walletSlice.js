import { createSlice } from '@reduxjs/toolkit';
import { ethers } from 'ethers';
import mixpanel from 'mixpanel-browser';

const initialState = {
    walletPrivateKey: undefined,
    currentSimulation: false, //false or the current transaction object
    network: 'ethereum',
};

export const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    // The `reducers` field lets us define reducers and generate associated actions
    reducers: {
        setWallet: (state, data) => {
            state.walletPrivateKey = data.payload;
        },
        setCurrentSimulation: (state, data) => {
            if (data.payload != false) {
                mixpanel.track('NEW_SIMULATION', {
                    simulation: data.payload,
                    appUrl: data.payload.appUrl,
                });
            }
            state.currentSimulation = data.payload;
        },
        setNetwork: (state, data) => {
            state.network = data.payload;
        },
    },
});

export const { setWallet, setCurrentSimulation, setNetwork } =
    walletSlice.actions;

export const selectWallet = (state) => {
    if (!state.wallet.walletPrivateKey) {
        return false;
    }
    return new ethers.Wallet(state.wallet.walletPrivateKey);
};

export const selectCurrentSimulation = (state) =>
    state.wallet.currentSimulation;

export const selectNetwork = (state) => state.wallet.network;
// We can also write thunks by hand, which may contain both sync and async logic.
// Here's an example of conditionally dispatching actions based on current state.
export const initWallet = () => (dispatch, getState) => {
    const currentWallet = selectWallet(getState());
    if (currentWallet) {
        return;
    }
    let pk = ethers.Wallet.createRandom().privateKey;
    dispatch(setWallet(pk));
};

export default walletSlice.reducer;
