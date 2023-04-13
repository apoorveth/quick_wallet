import { printLine } from './modules/print';
import { v4 as uuidv4 } from 'uuid';
import {
    dispatchResponse,
    listenToRequest,
    Response,
    SimulationState,
} from '../../lib/request';
import {
    removeSimulation,
    STORAGE_SETTINGS_KEY,
    STORAGE_SIMUALTIONS_KEY,
} from '../../lib/storage';
import { getDetfaultSettings } from '../../config/settings';

console.log('Content script works!');
console.log('Must reload extension for modifications to take effect.');

printLine("Using the 'printLine' function from the Print Module");

var s = document.createElement('script');
// This should intentionally fail on chrome as we inject the script in the background file.
s.src = chrome.runtime.getURL('injectedScript.bundle.js');
(document.head || document.documentElement).appendChild(s);
s.onload = () => {
    s.remove();
};

let ids = [];

const maybeRemoveId = (id) => {
    if (ids.includes(id)) {
        ids = ids.filter((thisId) => thisId !== id);
        removeSimulation(id);
    }
};

listenToRequest(async (request) => {
    ids.push(request.id);
    console.log('Quick wallet received a request');
    const settings =
        (await chrome.storage.sync.get([STORAGE_SETTINGS_KEY])).settings ||
        getDetfaultSettings();

    if (settings.debugger) {
        console.log('Quick wallet detected a new message for debugger');
        chrome.runtime.sendMessage({
            event: 'quick_wallet_add_simulation',
            simulation: request,
        });
        return;
    }
    if (settings.minimizedMetamask) {
        console.log(
            'Quick wallet detected a new message for minimized metamask'
        );
        chrome.runtime.sendMessage({
            event: 'quick_wallet_open_dummy_page',
            simulation: request,
        });
        return;
    }
    dispatchResponse({
        ...request,
        type: Response.Continue,
    });
});

chrome.storage.onChanged.addListener((changes, area) => {
    console.log('Inside the storage change listener - ', changes, area);
    if (area !== 'sync' || !changes[STORAGE_SIMUALTIONS_KEY]?.newValue) {
        return;
    }
    const newSimulations = changes[STORAGE_SIMUALTIONS_KEY].newValue;
    // Note: this will dispatch to **all** content pages.
    // To address this later we can generate a random id for each page. Append it to the request.
    // Either way, this should be pretty cheap. It's just DOM communication.
    // TODO: measure & generate random id's so we don't dispatch so many events.
    newSimulations.forEach((simulation) => {
        // Either dispatch the corresponding event, or push the item to new simulations.
        if (simulation.state === SimulationState.Confirmed) {
            console.log('FOUND A CONFIRMED SIMULATION - ', simulation);
            dispatchResponse({
                ...simulation,
                type: Response.Continue,
            });
            maybeRemoveId(simulation.id);
        } else if (simulation.state === SimulationState.Rejected) {
            console.log('FOUND A REJECTED SIMULATION - ', simulation);
            dispatchResponse({
                ...simulation,
                type: Response.Reject,
            });

            maybeRemoveId(simulation.id);
        }
    });
});
