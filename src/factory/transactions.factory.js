import NETWORK_CONFIG from '../config/networks';

export const getTransactionProvider = (network) => {
    switch (NETWORK_CONFIG[network].type) {
        case 'evm':
            return require('../services/transactionProviders/evmTransaction.provider');
        case 'cvm':
            return require('../services/transactionProviders/cmvTransaction.provider');
        case 'solana':
            return require('../services/transactionProviders/solanaTransaction.provider');
    }
};
