import React, { useEffect } from 'react';
import mixpanel from 'mixpanel-browser';
import { STORAGE_USER_ID_KEY } from '../../lib/storage';

if (process.env.REACT_APP_ENVIRONMENT == 'production') {
    mixpanel.init('5115eefb0d59ea87e002ddce0c9962b3', { debug: true });
} else {
    mixpanel.init('ebf30c0c1e43037b4b09c8aa3e3fc5c2', { debug: true });
}

const Dummy = () => {
    useEffect(() => {
        (async () => {
            const storage = await chrome.storage.local.get([
                STORAGE_USER_ID_KEY,
            ]);
            console.log('got the storage - ', storage);
            if (storage[STORAGE_USER_ID_KEY]) {
                mixpanel.identify(storage[STORAGE_USER_ID_KEY]);
            }
            mixpanel.track('DUMMY_PAGE_OPEN');
        })();
    });
    return <div></div>;
};

export default Dummy;
