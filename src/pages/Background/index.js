import _ from 'lodash';
import { POPUP_CONNECT_PREFIX } from '../../lib/constants';
import { SimulationState } from '../../lib/request';
import {
    addSimulation,
    setStorage,
    STORAGE_SIMUALTIONS_KEY,
    updateSimulationState,
} from '../../lib/storage';

console.log('This is the background page.', new Date().toTimeString());
console.log('Put the background scripts here.');

chrome.runtime.onMessage.addListener(async (request) => {
    console.log('Received request: ', request);
    console.log('Not a duplicated request');
    if (request.event == 'quick_wallet_add_simulation') {
        await addSimulation(request.simulation);
        chrome.windows.create(
            {
                url: 'popup.html',
                type: 'popup',
                focused: true,
                width: 400,
                height: 600,
                top: 0,
                left: 0,
            },
            () => {
                console.log('Opened popup!');
            }
        );
    } else if (request.event == 'quick_wallet_open_dummy_page') {
        const promises = [
            addSimulation(request.simulation),
            chrome.runtime.getPlatformInfo(),
            chrome.windows.getCurrent(),
        ];
        const [_, platformInfo, window] = await Promise.all(promises);
        console.log('this is the platform info');
        if (platformInfo.os != 'mac' || window.state !== 'fullscreen') {
            await updateSimulationState(
                request.simulation.id,
                SimulationState.Confirmed
            );
            return;
        }
        console.log('opening the dummy page');
        await addSimulation(request.simulation);
        chrome.windows.create(
            {
                url: 'dummy.html',
                type: 'popup',
                focused: true,
                width: 400,
                height: 600,
                top: 0,
                left: 0,
            },
            async (window) => {
                setTimeout(async () => {
                    console.log('Opened dummy!');
                    await updateSimulationState(
                        request.simulation.id,
                        SimulationState.Confirmed
                    );
                    console.log('updated simulation');
                    await chrome.windows.remove(window.id);
                    console.log('closing window');
                }, 300);
            }
        );
    }
});

chrome.runtime.onConnect.addListener(function (port) {
    if (port.name.startsWith(POPUP_CONNECT_PREFIX)) {
        port.onDisconnect.addListener(async () => {
            const simulationId = port.name.replace(
                `${POPUP_CONNECT_PREFIX}_`,
                ''
            );
            await updateSimulationState(simulationId, SimulationState.Rejected);
        });
    }
});
