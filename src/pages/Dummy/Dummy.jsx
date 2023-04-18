import React, { useEffect } from 'react';
import mixpanel from 'mixpanel-browser';
import { STORAGE_USER_ID_KEY } from '../../lib/storage';

mixpanel.init('5115eefb0d59ea87e002ddce0c9962b3', { debug: true });

const Dummy = () => {
    useEffect(() => {
        (async () => {
            const storage = await chrome.storage.sync.get([
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
