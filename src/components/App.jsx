import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import {
    initWallet,
    selectWallet,
    setWallet,
    setCurrentSimulation,
    setNetwork,
    selectCurrentSimulation,
} from '../features/walletSlice';
import TopBar from './TopBar/TopBar';
import config from '../config/config.json';
import Transactions from './Transactions/Transactions';
import Navbar from './Navbar/Navbar';
import Settings from './Settings/Settings';
import TransactionSimulator from './Transactions/TransactionSimulator';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS, always needed
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Optional theme CSS
import { initUser } from '../features/userSlice';
import NETWORK_CONFIG from '../config/networks';
import { STORAGE_SIMUALTIONS_KEY, updateSimulationState } from '../lib/storage';
import { SimulationState } from '../lib/request';
import { POPUP_CONNECT_PREFIX } from '../lib/constants';
import { NAVBAR_PAGES, selectPage } from '../features/navbarSlice';

const AppContainer = styled.div`
    top: 0px;
    bottom: 0px;
    left: 0px;
    right: 0px;
    text-align: center;
    background-color: #282c34;
    width: 100%;
    background-image: linear-gradient(to top, #222222, #2d2d2d);
    padding-top: ${config.topBarHeight + 'px'};
    padding-bottom: ${config.bottomBarHeight + 'px'};
    position: absolute;
`;

const App = () => {
    const dispatch = useDispatch();
    const currentSimulation = useSelector(selectCurrentSimulation);
    const navbarPage = useSelector(selectPage);

    useEffect(() => {
        dispatch(initWallet());
        dispatch(initUser());

        const appContainer = document.getElementById('app-container');
        appContainer.style.height = '600px';
        appContainer.style.width = '800px';
    });

    useEffect(() => {
        (async () => {
            let storage = await chrome.storage.sync.get([
                STORAGE_SIMUALTIONS_KEY,
            ]);

            const simulations = storage[STORAGE_SIMUALTIONS_KEY];
            if (
                !simulations ||
                simulations.length == 0 ||
                simulations[simulations.length - 1].state !==
                    SimulationState.Intercepted
            ) {
                dispatch(setCurrentSimulation(false));
                return;
            }
            console.log('got simulatons - ', storage[STORAGE_SIMUALTIONS_KEY]);
            const latestSimulation =
                storage[STORAGE_SIMUALTIONS_KEY][
                    storage[STORAGE_SIMUALTIONS_KEY].length - 1
                ];

            const simulationNetwork = Object.keys(NETWORK_CONFIG).filter(
                (key) =>
                    NETWORK_CONFIG[key].chainId ==
                    Number(latestSimulation.chainId)
            )[0];

            //used in background script to know when the popup closes
            chrome.runtime.connect({
                name: `${POPUP_CONNECT_PREFIX}_${latestSimulation.id}`,
            });

            dispatch(setNetwork(simulationNetwork));
            dispatch(setCurrentSimulation(latestSimulation));
            await updateSimulationState(
                latestSimulation.id,
                SimulationState.Viewed
            );
        })();
    }, []);

    let currentPage;
    switch (navbarPage) {
        case NAVBAR_PAGES.transactions.value:
            currentPage = <Transactions></Transactions>;
            break;
        case NAVBAR_PAGES.settings.value:
        default:
            currentPage = <Settings></Settings>;
            break;
    }
    return (
        <AppContainer>
            <TopBar />
            {!currentSimulation && currentPage}
            {currentSimulation && (
                <TransactionSimulator
                    interceptedTransaction={currentSimulation}
                    fullScreen={true}
                ></TransactionSimulator>
            )}
            <Navbar />
        </AppContainer>
    );
};

export default App;
