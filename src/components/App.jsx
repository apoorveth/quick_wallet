import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { initWallet, selectWallet } from '../features/wallet/walletSlice';

const AppContainer = styled.div`
  position: absolute;
  top: 0px;
  bottom: 0px;
  left: 0px;
  right: 0px;
  text-align: center;
  padding: 10px;
  background-color: #282c34;
  width: 100%;
  background-image: linear-gradient(to top, #222222, #2d2d2d);
`;

const App = () => {
  const dispatch = useDispatch();

  const wallet = useSelector(selectWallet);
  useEffect(() => {
    console.log('i am inside the use effect of app');
    dispatch(initWallet());
  });
  return <AppContainer>asasd,asd{wallet.privateKey}</AppContainer>;
};

export default App;
