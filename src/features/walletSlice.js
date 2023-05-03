import { createSlice } from '@reduxjs/toolkit';
import { ethers } from 'ethers';
import mixpanel from 'mixpanel-browser';

const initialState = {
    walletPrivateKey: undefined,
    currentSimulation: false, //false or the current transaction object
    currentSimulationTransactionIndex: 0,
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
        setCurrentSimulationWalletMessage: (state, data) => {
            state.currentSimulation.walletMessage[0][data.payload.index] =
                data.payload.newMessage;
        },
        setNetwork: (state, data) => {
            state.network = data.payload;
        },
        setCurrentSimulationTransactionIndex: (state, data) => {
            state.currentSimulationTransactionIndex = data.payload;
        },
    },
});

export const {
    setWallet,
    setCurrentSimulation,
    setNetwork,
    setCurrentSimulationTransactionIndex,
    setCurrentSimulationWalletMessage,
} = walletSlice.actions;

export const selectWallet = (state) => {
    if (!state.wallet.walletPrivateKey) {
        return false;
    }
    return new ethers.Wallet(state.wallet.walletPrivateKey);
};

export const selectCurrentSimulation = (state) =>
    state.wallet.currentSimulation;

export const selectCurrentSimulationTransactionIndex = (state) =>
    state.wallet.currentSimulationTransactionIndex;

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
