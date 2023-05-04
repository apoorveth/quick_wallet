import {
    RequestManager,
    toPartialRequestArgs,
    Response,
    SimulationState,
} from '../../lib/request';
import { ethErrors } from 'eth-rpc-errors';
import { v4 as uuidv4 } from 'uuid';
import log from 'loglevel';

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

const addQuickWalletProxyStarknet = (provider) => {
    if (!provider || provider.isQuickWallet) {
        return;
    }

    const executeHandler = {
        apply: async (target, thisArg, args) => {
            log.debug(
                'Quick wallet inside execute handler',
                target,
                thisArg,
                args
            );

            log.debug('starting the debugger!!');
            const response = await REQUEST_MANAGER.request({
                chainId: thisArg.chainId,
                walletMessage: args,
                state: SimulationState.Intercepted,
                appUrl: window.location.href,
                id: uuidv4(),
                accountAddress: provider.account.address,
            });

            if (response.type == Response.Continue) {
                let params = args;
                if (response.walletMessage) {
                    params = response.walletMessage;
                }
                return Reflect.apply(target, thisArg, params);
            }

            throw new Error('User aborted');
        },
    };

    const requestHandler = {
        apply: async (target, thisArg, args) => {
            log.debug(
                'Quick wallet inside request handler',
                target,
                thisArg,
                args
            );

            return Reflect.apply(target, thisArg, args);
        },
    };

    try {
        Object.defineProperty(provider.account, 'execute', {
            value: new Proxy(provider.account.execute, executeHandler),
        });
        Object.defineProperty(provider, 'request', {
            value: new Proxy(provider.request, requestHandler),
        });

        provider.isQuickWallet = true;
        log.debug('Quick Wallet is running!');
    } catch (error) {
        // If we can't add ourselves to this provider, don't mess with other providers.
        console.error('Failed to add proxy - ', error);
    }
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

const handleStarknetProxy = (attempt) => {
    if (window?.starknet_argentX?.account) {
        addQuickWalletProxyStarknet(window.starknet_argentX, 'starknet');
    } else {
        if (attempt === 1000) {
            return;
        }
        setTimeout(() => handleStarknetProxy(attempt + 1), 100);
    }
};

handleStarknetProxy(1);
