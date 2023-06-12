import { getTransactionProvider } from '../factory/transactions.factory';
import log from 'loglevel';

export const getInputDataWithoutAbi = async ({
    transaction, // cmv and solana
    transactionIndex, // solana
    network,
    to,
    data,
    functionName,
}) => {
    log.debug(
        'Getting input data without abi - ',
        to,
        data,
        network,
        functionName
    );
    const provider = getTransactionProvider(network);
    return await provider.getInputDataWithoutAbi({
        to,
        data,
        network,
        functionName,
        transaction,
        transactionIndex,
    });
};

export const getOutputDataFromInput = ({
    functionName,
    inputStr,
    abi,
    network,
}) => {
    const provider = getTransactionProvider(network);
    return provider.getOutputDataFromInput({
        functionName,
        inputStr,
        abi,
    });
};

// only used by cvm and solana for now
export const filterSimulatorKeys = ({ transaction, network }) => {
    const provider = getTransactionProvider(network);

    log.debug('calling filter simulate keys - ', transaction);
    return provider.filterSimulatorKeys(transaction);
};

export const simulateTransaction = ({ network, interceptedTransaction }) => {
    const provider = getTransactionProvider(network);
    return provider.simulate({ network, interceptedTransaction });
};
