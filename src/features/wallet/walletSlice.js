import { createSlice } from '@reduxjs/toolkit';
import { ethers } from 'ethers';

const initialState = {
  walletPrivateKey: undefined,
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    setWallet: (state, data) => {
      state.walletPrivateKey = data.payload;
    },
  },
});

export const { setWallet } = walletSlice.actions;

export const selectWallet = (state) => {
  if (!state.wallet.walletPrivateKey) {
    return false;
  }
  return new ethers.Wallet(state.wallet.walletPrivateKey);
};

// We can also write thunks by hand, which may contain both sync and async logic.
// Here's an example of conditionally dispatching actions based on current state.
export const initWallet = () => (dispatch, getState) => {
  console.log('I AM INSIDE THE INIT WALLET FUNCTION');
  const currentWallet = selectWallet(getState());
  if (currentWallet) {
    return;
  }
  let pk = ethers.Wallet.createRandom().privateKey;
  console.log('this is the private key  -', pk);
  dispatch(setWallet(pk));
};

export default walletSlice.reducer;
