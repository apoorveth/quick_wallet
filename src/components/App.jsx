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
    selectNetwork,
    setCurrentSimulationTransactionIndex,
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
import TransactionSimulatorStarknet from './Transactions/TransactionSimulatorStarknet';
import log from 'loglevel';
import { ErrorBoundary } from 'react-error-boundary';
import SimulationFallback from './Transactions/SimulationFallback';

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
    const network = useSelector(selectNetwork);

    useEffect(() => {
        dispatch(initWallet());
        dispatch(initUser());

        const appContainer = document.getElementById('app-container');
        appContainer.style.height = '600px';
        appContainer.style.width = '800px';
    });

    useEffect(() => {
        (async () => {
            let storage = await chrome.storage.local.get([
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
            log.debug('got simulatons - ', storage[STORAGE_SIMUALTIONS_KEY]);
            const latestSimulation =
                storage[STORAGE_SIMUALTIONS_KEY][
                    storage[STORAGE_SIMUALTIONS_KEY].length - 1
                ];
            const simulationNetwork = Object.keys(NETWORK_CONFIG).filter(
                (key) =>
                    NETWORK_CONFIG[key].chainId ==
                    Number(latestSimulation.chainId)
            )[0];
            latestSimulation.walletMessage =
                Array.isArray(latestSimulation.walletMessage[0]) ||
                NETWORK_CONFIG[simulationNetwork].type === 'evm'
                    ? latestSimulation.walletMessage
                    : [latestSimulation.walletMessage];

            //used in background script to know when the popup closes
            chrome.runtime.connect({
                name: `${POPUP_CONNECT_PREFIX}_${latestSimulation.id}`,
            });

            dispatch(setNetwork(simulationNetwork));
            dispatch(setCurrentSimulation(latestSimulation));
            dispatch(setCurrentSimulationTransactionIndex(0));

            if (JSON.parse(process.env.REACT_APP_PERSIST_SIMULATION)) {
                return;
            }
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

    let simulatorJSX;

    switch (NETWORK_CONFIG[network].type) {
        case 'cvm':
            simulatorJSX = (
                <TransactionSimulatorStarknet
                    interceptedTransaction={currentSimulation}
                    fullScreen={true}
                ></TransactionSimulatorStarknet>
            );
            break;
        case 'emv':
        default:
            simulatorJSX = (
                <TransactionSimulator
                    interceptedTransaction={currentSimulation}
                    fullScreen={true}
                ></TransactionSimulator>
            );
    }
    return (
        <AppContainer>
            <TopBar />
            {!currentSimulation && currentPage}
            <ErrorBoundary fallback={<SimulationFallback></SimulationFallback>}>
                {currentSimulation && simulatorJSX}
            </ErrorBoundary>
            <Navbar />
        </AppContainer>
    );
};

export default App;
