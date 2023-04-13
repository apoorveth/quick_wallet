/// Simulate request/reply manager for the content script and injected script.
import { v4 as uuidv4 } from 'uuid';

export const isSupportedChainId = (chainId) => {
    return (
        chainId === '0x1' ||
        chainId === '1' ||
        chainId === '137' ||
        chainId === '0x89'
    );
};

export const toPartialRequestArgs = (method, params) => {
    if (method === 'eth_sendTransaction') {
        return {
            signer: params[0].from,
            transaction: params[0],
        };
    } else if (
        method === 'eth_signTypedData_v3' ||
        method === 'eth_signTypedData_v4'
    ) {
        const jsonParams = JSON.parse(params[1]);

        return {
            signer: params[0],
            domain: jsonParams['domain'],
            message: jsonParams['message'],
            primaryType: jsonParams['primaryType'],
        };
    } else if (method === 'eth_sign') {
        // The first, second address are either the message or the signer. They can be flipped depending on what method is called.
        const [first, second] = params;

        let address;
        let hash;
        if (String(first).replace(/0x/, '').length === 40) {
            address = first;
            hash = second;
        } else {
            hash = first;
            address = second;
        }

        return {
            signer: address,
            hash,
        };
    } else if (method === 'personal_sign') {
        // The first, second address are either the message or the signer. They can be flipped depending on what method is called.
        const [first, second] = params;

        let address;
        let msg;
        if (String(first).replace(/0x/, '').length === 40) {
            address = first;
            msg = second;
        } else {
            msg = first;
            address = second;
        }

        return {
            signer: address,
            signMessage: msg,
        };
    } else {
        throw new Error('Show never reach here');
    }
};

/**
 * Map request to replies.
 *
 * This is stored in memory, after the page shuts down this is gone.
 */
export class RequestManager {
    /**
     * Maps from a uuid to a resolver function which takes a response.
     */
    mappings = new Map();

    constructor() {
        this.mappings = new Map();

        document.addEventListener(DISPATCH_RESPONSE, (event) => {
            console.log('HANDLING THE EVENT - ', event);
            this._handleResponse(JSON.parse(event.detail));
        });
    }

    /**
     * Add a request and store it in the request manager.
     */
    request(args) {
        return new Promise((resolve) => {
            const id = args.id;
            this.mappings.set(id, resolve);
            this._dispatchRequest(args);
        });
    }

    /**
     * Dispatch a request.
     */
    _dispatchRequest = (request) => {
        console.log(
            'Quick wallet Dispatching the following request - ',
            request
        );
        document.dispatchEvent(
            new CustomEvent(DISPATCH_REQUEST, {
                detail: request,
            })
        );
    };

    _handleResponse = (response) => {
        console.log('FINALLY GOING TO RESOLVE NOW - ', response);
        const resolver = this.mappings.get(response.id);
        if (!resolver) {
            // Could be a stale request or for another webpage.
            return;
        }

        // Unwrap the response, drop the id.
        resolver(response);

        // Remove it from the mapping.
        this.mappings.delete(response.id);
    };
}

/**
 * Dispatch from injected script to content script.
 */
const DISPATCH_REQUEST = 'QUICK_WALLET_DISPATCH_REQUEST';

/**
 * Listen to request
 */
export const listenToRequest = (callback) => {
    document.addEventListener(DISPATCH_REQUEST, async (event) => {
        callback(event.detail);
    });
};

/**
 * Simulation State.
 */
export const SimulationState = {
    Intercepted: 'intercepted',
    Viewed: 'viewed',
    Confirmed: 'confirmed',
    Rejected: 'rejected',
};

/**
 * Response.
 */
export const Response = {
    Reject: 'reject',
    Continue: 'continue',
    Error: 'error',
};

/**
 * Dispatch from content script to injected script
 */
const DISPATCH_RESPONSE = 'QUICK_WALLET_DISPATCH_RESPONSE';

export const dispatchResponse = (response) => {
    console.log('DISPATCHING THE RESPONSE - ', response);
    document.dispatchEvent(
        new CustomEvent(DISPATCH_RESPONSE, {
            detail: JSON.stringify(response),
        })
    );
};
