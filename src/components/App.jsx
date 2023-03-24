import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { initWallet, selectWallet } from '../features/wallet/walletSlice';
import Navbar from './Navbar/Navbar';
import config from '../config/config.json';
import Transactions from './Transactions/Transactions';
import { NavbarPages, selectPage } from '../features/wallet/navbarSlice';
import BottomBar from './BottomBar/BottomBar';

const AppContainer = styled.div`
  top: 0px;
  bottom: 0px;
  left: 0px;
  right: 0px;
  text-align: center;
  background-color: #282c34;
  width: 100%;
  background-image: linear-gradient(to top, #222222, #2d2d2d);
  padding-top: ${config.navbarHeight + 'px'};
  padding-bottom: ${config.bottomBarHeight + 'px'};
  position: absolute;
`;

const App = () => {
  const dispatch = useDispatch();
  const navbarPage = useSelector(selectPage);

  useEffect(() => {
    dispatch(initWallet());
  });

  useEffect(() => {
    const appContainer = document.getElementById('app-container');
    switch (navbarPage) {
      case NavbarPages.TRANSACTIONS:
        appContainer.style.height = '600px';
        appContainer.style.width = '800px';
        break;
    }
  }, [navbarPage]);

  return (
    <AppContainer>
      <Navbar></Navbar>
      <Transactions></Transactions>
      <BottomBar></BottomBar>
    </AppContainer>
  );
};

export default App;
