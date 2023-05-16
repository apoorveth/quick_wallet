import * as starknetjs from 'starknet';
import { Provider, Contract } from 'starknet';
import NETWORK_CONFIG from '../../config/networks';
import * as starknetHardhat from '../../../utils/starknetHardhat';
import log from 'loglevel';

export const getInputDataWithoutAbi = async ({
    to,
    data,
    network,
    functionName,
}) => {
    const provider = new Provider({
        sequencer: { network: NETWORK_CONFIG[network].sequencerNetwork },
    });

    log.debug('getting abi - ', to);
    let abi = await getAbi({ provider, address: to });
    let promises = [
        isImplementation({ abi, address: to, provider }),
        isClassImplementation({ abi, address: to, provider }),
    ];

    let response = await resolveAbiPromises(promises);
    if (response) {
        abi = response;
    } else {
        promises = [
            isStorageImplementation({ abi, address: to, provider }),
            isStorageImplementationHash({ abi, address: to, provider }),
        ];
        let response = await resolveAbiPromises(promises);
        if (response) {
            abi = response;
        }
    }

    const decodedInput = await getInputData({
        data,
        abi,
        entrypoint: functionName,
        to,
        provider,
    });
    return { ...decodedInput, abi };
};

export const getOutputDataFromInput = ({ functionName, inputStr, abi }) => {
    try {
        const input = JSON.parse(inputStr);
        const newInput = { ...input };
        Object.entries(newInput).forEach(([key, value]) => {
            if (/^\d+$/.test(value)) {
                // if it's a number, convert to BigInt
                newInput[key] = BigInt(value);
            }
        });
        let abiFormatted = formatAbi(abi);

        return starknetHardhat.adaptInputUtil(
            functionName,
            newInput,
            abiFormatted[functionName].inputs,
            abiFormatted
        );
    } catch (err) {
        console.error('failed to change input - ', err);
        return ['<invalid_input>'];
    }
};

const resolveAbiPromises = async (promises) => {
    let [a, b] = await Promise.all(promises);
    let abi = false;
    if (a.isImplementation) {
        abi = a.implementationAbi;
    } else if (b.isImplementation) {
        abi = b.implementationAbi;
    }
    return abi;
};

const getInputData = async ({ data, abi, entrypoint, to, provider }) => {
    try {
        const entryFunction = abi.filter(
            (f) => f.name == entrypoint && f.type == 'function'
        );
        if (entryFunction.length == 0) {
            throw `No entrypoint found with name  - ${entrypoint}`;
        }

        let abiFormatted = formatAbi(abi);

        const adaptedOutput = starknetHardhat.adaptOutputUtil(
            data.join(' '),
            abiFormatted[entrypoint].inputs,
            abiFormatted
        );

        return {
            decodedInput: adaptedOutput,
            abi,
            functionData: {
                name: entrypoint,
            },
        };
    } catch (err) {
        console.error('failed to decode with err - ', err);
        return { failedDecode: true };
    }
};

const getAbi = async ({ provider, address }) => {
    log.debug('getting abi for  - ', address);
    const { abi } = await provider.getClassAt(address);

    log.debug('this is the abi i got - ', abi);
    return abi;
};

const isImplementation = async ({ abi, address, provider }) => {
    const implementationFunction = abi.filter(
        (f) =>
            f.name == 'implementation' &&
            f.stateMutability == 'view' &&
            f.type == 'function'
    );
    if (implementationFunction.length == 0) {
        return { isImplementation: false };
    }

    const contract = new Contract(abi, address, provider);
    const response = await contract.call(implementationFunction[0].name);

    const addressKeyOutput = implementationFunction[0].outputs[0].name;

    const implementationAbi = await getAbi({
        address: starknetjs.number.toHex(response[addressKeyOutput]),
        provider,
    });
    return {
        isImplementation: true,
        implementationAbi: implementationAbi,
    };
};

const isClassImplementation = async ({ abi, address, provider }) => {
    const implementationFunction = abi.filter(
        (f) =>
            [
                'get_implementation_hash',
                'getImplementationHash',
                'get_implementation',
            ].includes(f.name) &&
            f.stateMutability == 'view' &&
            f.type == 'function'
    );
    if (implementationFunction.length == 0) {
        return { isImplementation: false };
    }

    const contract = new Contract(abi, address, provider);
    const implementation = await contract.call(implementationFunction[0].name);

    const addressKeyOutput = implementationFunction[0].outputs[0].name;

    const result = await provider.getClassByHash(
        starknetjs.number.toHex(implementation[addressKeyOutput])
    );
    return {
        isImplementation: true,
        implementationHash: result.abi,
    };
};

const isStorageImplementation = async ({ address, provider }) => {
    const key = starknetjs.hash
        .starknetKeccak('Proxy_implementation_address')
        .toString();
    const storageAddress = await provider.getStorageAt(address, key);

    if (storageAddress == 0) {
        return {
            isImplementation: false,
        };
    }

    const implementationAbi = await getAbi({
        address: storageAddress,
        provider,
    });
    return {
        isImplementation: true,
        implementationAbi,
    };
};

const isStorageImplementationHash = async ({ address, provider }) => {
    const key = starknetjs.hash
        .starknetKeccak('Proxy_implementation_hash')
        .toString();
    const storageAddress = await provider.getStorageAt(address, key);

    if (storageAddress == 0) {
        return {
            isImplementation: false,
        };
    }

    const result = await provider.getClassByHash(storageAddress);
    return {
        isImplementation: true,
        implementationAbi: result.abi,
    };
};

const formatAbi = (abi) => {
    let abiFormatted = {};

    abi.forEach((obj) => {
        abiFormatted[obj.name] = obj;
    });
    return abiFormatted;
};
