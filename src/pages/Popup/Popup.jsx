import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Provider, useDispatch } from 'react-redux';
import { store } from '../../store/store';
import App from '../../components/App';
import mixpanel from 'mixpanel-browser';

if (process.env.REACT_APP_ENVIRONMENT == 'production') {
    mixpanel.init('5115eefb0d59ea87e002ddce0c9962b3', { debug: true });
} else {
    mixpanel.init('ebf30c0c1e43037b4b09c8aa3e3fc5c2', { debug: true });
}

const Popup = () => {
    return (
        <Provider store={store}>
            <App></App>
        </Provider>
    );
};

export default Popup;
