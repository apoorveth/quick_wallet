import _ from 'lodash';
import { POPUP_CONNECT_PREFIX } from '../../lib/constants';
import { SimulationState } from '../../lib/request';
import {
    addSimulation,
    setStorage,
    STORAGE_SIMUALTIONS_KEY,
    updateSimulationState,
} from '../../lib/storage';
import log from 'loglevel';

log.debug('This is the background page.', new Date().toTimeString());
log.debug('Put the background scripts here.');

chrome.runtime.onMessage.addListener(async (request) => {
    log.debug('Received request: ', request);
    log.debug('Not a duplicated request');
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
                log.debug('Opened popup!');
            }
        );
    } else if (request.event == 'quick_wallet_open_dummy_page') {
        const promises = [
            addSimulation(request.simulation),
            chrome.runtime.getPlatformInfo(),
            chrome.windows.getCurrent(),
        ];
        const [_, platformInfo, window] = await Promise.all(promises);
        log.debug('this is the platform info');
        if (platformInfo.os != 'mac' || window.state !== 'fullscreen') {
            await updateSimulationState(
                request.simulation.id,
                SimulationState.Confirmed
            );
            return;
        }
        log.debug('opening the dummy page');
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
                    log.debug('Opened dummy!');
                    await updateSimulationState(
                        request.simulation.id,
                        SimulationState.Confirmed
                    );
                    log.debug('updated simulation');
                    await chrome.windows.remove(window.id);
                    log.debug('closing window');
                }, 500);
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
            if (JSON.parse(process.env.REACT_APP_PERSIST_SIMULATION)) {
                return;
            }
            await updateSimulationState(simulationId, SimulationState.Rejected);
        });
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        // Code to be executed on first install
        // eg. open a tab with a url
        chrome.tabs.create({
            url: 'https://getcharged.dev/onboarding',
        });
    } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
        // When extension is updated
    } else if (
        details.reason === chrome.runtime.OnInstalledReason.CHROME_UPDATE
    ) {
        // When browser is updated
    } else if (
        details.reason === chrome.runtime.OnInstalledReason.SHARED_MODULE_UPDATE
    ) {
        // When a shared module is updated
    }
});
