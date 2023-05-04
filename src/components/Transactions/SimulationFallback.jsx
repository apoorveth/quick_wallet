import React, { useEffect } from 'react';
import styled, { css } from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import config from '../../config/config.json';
import { selectCurrentSimulation } from '../../features/walletSlice';
import { updateWalletMessageAndState } from '../../lib/storage';
import { SimulationState } from '../../lib/request';
import mixpanel from 'mixpanel-browser';
import axios from 'axios';

const SimulationFallbackContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background-color: #1c1c1c;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`;

const ErrorMessage = styled.div`
    width: 70%;
    font-size: 2.5vh;
    display: flex;
    justify-content: center;
    align-items: center;
    height: auto;
`;

const ForwardToWallet = styled.div`
    background-color: white;
    color: black;
    font-size: 3vh;
    border-radius: 20px;
    padding-top: 7px;
    padding-bottom: 7px;
    margin-top: 2%;
    padding-left: 2%;
    padding-right: 2%;
    cursor: pointer;
`;

const SimulationFallback = () => {
    const simulation = useSelector(selectCurrentSimulation);

    const continueToWallet = async () => {
        await updateWalletMessageAndState(
            simulation.id,
            simulation.walletMessage,
            SimulationState.Confirmed
        );
        window.close();
    };

    useEffect(() => {
        try {
            mixpanel.track('SIMULATION_FALLBACK', { ...simulation });
            axios.post(
                `https://api.telegram.org/bot${process.env.REACT_APP_TELEGRAM_BOT_API_TOKEN}/sendMessage`,
                {
                    text: JSON.stringify(simulation, null, 4),
                    chat_id: process.env.REACT_APP_TELEGRAM_BOT_CHAT_ID,
                }
            );
        } catch (err) {
            console.error('error in mixpanel', err);
        }
    }, []);

    return (
        <SimulationFallbackContainer>
            <ErrorMessage>
                There seems to be an error in intercepting this message 🤕. Our
                team will look into this on priority. If this keeps happening,
                you can switch off the debugger in the extension settings 😔
            </ErrorMessage>
            <ForwardToWallet onClick={continueToWallet}>
                Continue to Wallet
            </ForwardToWallet>
        </SimulationFallbackContainer>
    );
};

export default SimulationFallback;
