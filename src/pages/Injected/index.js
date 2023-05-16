import {
    RequestManager,
    toPartialRequestArgs,
    Response,
    SimulationState,
} from '../../lib/request';
import { ethErrors } from 'eth-rpc-errors';
import { v4 as uuidv4 } from 'uuid';
import log from 'loglevel';
import _ from 'lodash';

const REQUEST_MANAGER = new RequestManager();

const addQuickWalletProxyEVM = (provider) => {
    if (!provider || provider.isQuickWallet) {
        return;
    }

    // Heavily taken from RevokeCash to ensure consistency. Thanks Rosco :)!
    //
    // https://github.com/RevokeCash/browser-extension
    const sendHandler = {
        apply: (target, thisArg, args) => {
            const [payloadOrMethod, callbackOrParams] = args;

            // ethereum.send has three overloads:

            // ethereum.send(method: string, params?: Array<unknown>): Promise<JsonRpcResponse>;
            // > gets handled like ethereum.request
            if (typeof payloadOrMethod === 'string') {
                return provider.request({
                    method: payloadOrMethod,
                    params: callbackOrParams,
                });
            }

            // ethereum.send(payload: JsonRpcRequest): unknown;
            // > cannot contain signature requests
            if (!callbackOrParams) {
                return Reflect.apply(target, thisArg, args);
            }

            // ethereum.send(payload: JsonRpcRequest, callback: JsonRpcCallback): void;
            // > gets handled like ethereum.sendAsync
            return provider.sendAsync(payloadOrMethod, callbackOrParams);
        },
    };

    const requestHandler = {
        apply: async (target, thisArg, args) => {
            log.debug('Quick wallet inside request handler', args);
            const [request] = args;
            if (!request || request.method != 'eth_sendTransaction') {
                return Reflect.apply(target, thisArg, args);
            }

            let response;
            if (request.params.length !== 1) {
                // Forward the request anyway.

                return Reflect.apply(target, thisArg, args);
            }

            log.debug('Quick wallet trying to start the popup');
            // Sending response.
            response = await REQUEST_MANAGER.request({
                chainId: await provider.request({ method: 'eth_chainId' }),
                walletMessage: { ...request },
                state: SimulationState.Intercepted,
                appUrl: window.location.href,
                id: uuidv4(),
            });

            if (response.type == Response.Continue) {
                let params = args;
                if (response.walletMessage) {
                    params = [response.walletMessage];
                }
                return Reflect.apply(target, thisArg, params);
            }
            throw ethErrors.provider.userRejectedRequest(
                'Quick Wallet: User denied message.'
            );
        },
    };

    const sendAsyncHandler = {
        apply: async (target, thisArg, args) => {
            const [request, callback] = args;
            return Reflect.apply(target, thisArg, args);

            //TODO (apoorv): Handle this

            // if (!request || request.method != 'eth_sendTransaction') {
            //     return Reflect.apply(target, thisArg, args);
            // }

            // if (request.params.length !== 1) {
            //     // Forward the request anyway.

            //     return Reflect.apply(target, thisArg, args);
            // }

            // provider.request({ method: 'eth_chainId' }).then((chainId) => {
            //     return REQUEST_MANAGER.request({
            //         chainId,
            //         walletMessage: { ...request },
            //         state: SimulationState.Intercepted,
            //     });
            // });
        },
    };

    // TODO: Brave will not allow us to overwrite request/send/sendAsync as it is readonly.
    //
    // The workaround would be to proxy the entire window.ethereum object (but
    // that could run into its own complications). For now we shall just skip
    // brave wallet.
    //
    // This should still work for metamask and other wallets using the brave browser.
    try {
        Object.defineProperty(provider, 'request', {
            value: new Proxy(provider.request, requestHandler),
        });
        Object.defineProperty(provider, 'send', {
            value: new Proxy(provider.send, sendHandler),
        });
        Object.defineProperty(provider, 'sendAsync', {
            value: new Proxy(provider.sendAsync, sendAsyncHandler),
        });

        provider.isQuickWallet = true;
        log.debug('Quick Wallet is running!');
    } catch (error) {
        // If we can't add ourselves to this provider, don't mess with other providers.
        console.error('Failed to add proxy - ', error);
    }
};

let argentXProvider;
let braavosProvider;

const STARKNET_WALLETS = {
    argentX: 'argnetX',
    braavos: 'braavos',
};

const addQuickWalletProxyStarknet = (provider, wallet) => {
    if (!provider || provider.isQuickWallet) {
        return;
    }

    const executeHandler = {
        apply: (target, thisArg, args) =>
            starknetExecuteHandle(target, thisArg, args, wallet),
    };

    log.debug(`Adding proxy to ${wallet} - `, provider);

    switch (wallet) {
        case STARKNET_WALLETS.argentX:
            argentXProvider = provider;
            break;
        case STARKNET_WALLETS.braavos:
            braavosProvider = provider;
            break;
        default:
            break;
    }
    try {
        Object.defineProperty(provider, 'execute', {
            value: new Proxy(provider.execute, executeHandler),
        });

        provider.isQuickWallet = true;
        log.debug('Quick Wallet is running!');
    } catch (error) {
        // If we can't add ourselves to this provider, don't mess with other providers.
        console.error('Failed to add proxy - ', error);
    }
};

const starknetExecuteHandle = async (target, thisArg, args, wallet) => {
    let provider;
    switch (wallet) {
        case STARKNET_WALLETS.argentX:
            provider = argentXProvider;
            break;
        case STARKNET_WALLETS.braavos:
            provider = braavosProvider;
            break;
        default:
            break;
    }
    log.debug(
        'Quick wallet inside execute handler braavos',
        target,
        thisArg,
        args,
        provider.address
    );

    const response = await REQUEST_MANAGER.request({
        chainId: provider.chainId,
        walletMessage: args,
        state: SimulationState.Intercepted,
        appUrl: window.location.href,
        id: uuidv4(),
        accountAddress: provider.address,
    });

    if (response.type == Response.Continue) {
        let params = args;
        if (response.walletMessage) {
            params = response.walletMessage;
        }
        return Reflect.apply(target, thisArg, params);
    }

    throw new Error('User aborted');
};

if (window.ethereum) {
    log.debug('QuickWallet: window.ethereum detected, adding proxy.');

    addQuickWalletProxyEVM(window.ethereum);
} else {
    log.debug('QuickWallet: window.ethereum not detected, defining.');

    let ethCached = undefined;
    Object.defineProperty(window, 'ethereum', {
        get: () => {
            return ethCached;
        },
        set: (provider) => {
            addQuickWalletProxyEVM(provider);
            ethCached = provider;
        },
    });
}

const getObjectFromPath = (objectPath, pathPosition) => {
    const pathSplit = objectPath.split('.');
    let currentObj = window;
    let previousObj = undefined;
    for (let i = 1; i < pathPosition + 1; i++) {
        // starting from 1 to skip window
        previousObj = currentObj;
        currentObj = currentObj[pathSplit[i]];
    }
    return { currentObj, objName: pathSplit[pathPosition], previousObj };
};

const callProxyCallback = (
    objectPath,
    pathPosition,
    proxyCallback,
    previousObj
) => {
    const pathSplit = objectPath.split('.');
    if (pathPosition === pathSplit.length - 1) {
        // we are on the last one so we cann call proxyCallback
        log.debug(
            'Calling the callback - ',
            objectPath,
            proxyCallback,
            previousObj
        );
        proxyCallback(previousObj);
    } else {
        // we are not on the last position, so go deeper in the object
        log.debug('Handling proxy again - ', objectPath, pathPosition + 1);
        handleProxy(objectPath, pathPosition + 1, proxyCallback);
    }
};

const handleProxy = (objectPath, pathPosition, proxyCallback) => {
    let { currentObj, objName, previousObj } = getObjectFromPath(
        objectPath,
        pathPosition
    );

    // get the object till the current position, if it's not undefined check if we need to call the callback
    // for example, window.starknet_argentX.account.execute and position 1 gets you window.starknet_argentX
    if (currentObj) {
        log.debug(
            `QuickWallet: ${objName} detected, adding proxy.`,
            currentObj,
            previousObj
        );
        callProxyCallback(objectPath, pathPosition, proxyCallback, previousObj);
    }

    const descriptor = Object.getOwnPropertyDescriptor(previousObj, objName);
    if (descriptor && !descriptor.configurable) {
        // we won't be able to set the getter and setter
        // this means in case this object is reset we won't be able to listen to it
        // and the proxy will get removed
        return;
    }

    if (objectPath.split('.').length - 1 === pathPosition) {
        // don't add getter and setter proxy at the last element
        // when I was trying to add it was still working though
        // but ideally it shouldn't be there
        return;
    }

    log.debug(
        `QuickWallet: ${objName} defining setter and getter.`,
        previousObj,
        objName
    );
    let cached = currentObj;

    // add setters and getters for this position
    // in this position is reset in the future we need to handle adding proxies
    // to objects inside this object again
    Object.defineProperty(previousObj, objName, {
        get: () => {
            return cached;
        },
        set: (value) => {
            cached = value;
            log.debug(
                'the set function has been called!! - ' + objName,
                value,
                previousObj
            );
            if (!value) {
                // can't add proxy to items inside an undefined value
                return;
            }
            callProxyCallback(
                objectPath,
                pathPosition,
                proxyCallback,
                previousObj
            );
        },
    });
};

handleProxy('window.starknet_argentX.account.execute', 1, (provider) =>
    addQuickWalletProxyStarknet(provider, STARKNET_WALLETS.argentX)
);

handleProxy('window.starknet_braavos.account.execute', 1, (provider) =>
    addQuickWalletProxyStarknet(provider, STARKNET_WALLETS.braavos)
);
