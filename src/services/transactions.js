import { getTransactionProvider } from '../factory/transactions.factory';
import log from 'loglevel';

export const getInputDataWithoutAbi = async ({
    to,
    data,
    network,
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
