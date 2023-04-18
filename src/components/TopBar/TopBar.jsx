import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectNetwork,
    selectWallet,
    setNetwork,
} from '../../features/walletSlice';
import config from '../../config/config.json';
import walletLogo from '../../assets/img/wallet_logo.png';
import Select from 'react-select';
import NETWORK_CONFIG from '../../config/networks';
import mixpanel from 'mixpanel-browser';

const TopBarContainer = styled.div`
    background-color: #222222;
    border-bottom: 1px solid #3a3a3a;
    height: ${config.topBarHeight + 'px'};
    position: absolute;
    top: 0;
    width: 96%;
    color: white;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-left: 2%;
    padding-right: 2%;
`;

const WalletContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
`;

const WalletImage = styled.img`
    width: 25px;
`;

const WalletAddress = styled.div`
    font-size: 1rem;
    margin-left: 5%;
`;

const Network = styled.div`
    background-color: #272727;
    border-radius: 1px solid #3a3a3a;
    text-align: center;
    width: 20%;
    padding-bottom: 8px;
    padding-top: 8px;
    border-radius: 50px;
    border: 1px solid #3a3a3a;
`;

const networkOptions = Object.entries(NETWORK_CONFIG).map(([key, network]) => ({
    value: key,
    label: network.name,
}));

console.log('these are network options - ', networkOptions);

const TopBar = () => {
    const dispatch = useDispatch();
    const wallet = useSelector(selectWallet);
    const pk = wallet.privateKey;
    const network = useSelector(selectNetwork);
    const selectedNetworkOption = networkOptions.filter(
        (n) => n.value == network
    )[0];
    console.log('this is selected network option - ', selectedNetworkOption);
    return (
        <TopBarContainer>
            <WalletContainer>
                <WalletImage src={walletLogo}></WalletImage>
                {/* <WalletAddress>
                    {pk
                        ? pk.substring(0, 6) +
                          '...' +
                          pk.substring(pk.length - 4, pk.length)
                        : ''}
                </WalletAddress> */}
            </WalletContainer>
            <Select
                styles={{
                    control: (styles) => ({
                        ...styles,
                        backgroundColor: '#272727',
                        border: '1px solid #3a3a3a',
                        borderRadius: '50px',
                    }),
                    container: (styles) => ({
                        ...styles,
                        width: '20%',
                    }),
                    menu: (styles) => ({
                        ...styles,
                        backgroundColor: '#272727',
                    }),
                    option: (styles, state) => ({
                        ...styles,
                        backgroundColor: state.isFocused ? '#414141' : '',
                        cursor: 'pointer',
                    }),
                    singleValue: (styles) => ({
                        ...styles,
                        color: 'white',
                    }),
                }}
                options={networkOptions}
                value={selectedNetworkOption}
                onChange={(e) => {
                    mixpanel.track('CHANGE_NETWORK', {
                        network: e.value,
                    });
                    dispatch(setNetwork(e.value));
                }}
            />
        </TopBarContainer>
    );
};

export default TopBar;
