import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Provider, useDispatch } from 'react-redux';
import { store } from '../../store/store';
import App from '../../components/App';
import mixpanel from 'mixpanel-browser';

mixpanel.init('5115eefb0d59ea87e002ddce0c9962b3', { debug: true });

const Popup = () => {
    return (
        <Provider store={store}>
            <App></App>
        </Provider>
    );
};

export default Popup;
