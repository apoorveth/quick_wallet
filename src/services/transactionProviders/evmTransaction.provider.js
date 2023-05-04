import { ethers } from 'ethers';
import { getSourceCode } from '../scan';
import log from 'loglevel';

export const getInputDataWithoutAbi = async ({ to, data, network }) => {
    let sourceCode = (await getSourceCode(network, to))[0];
    let abiString;
    log.debug('this is source code  - ', sourceCode);
    if (sourceCode.Proxy == '1') {
        log.debug("Its's an implementation contract");
        let implementationSourceCode = (
            await getSourceCode(network, sourceCode.Implementation)
        )[0];
        abiString = implementationSourceCode.ABI;
    } else {
        abiString = sourceCode.ABI;
    }
    if (!abiString) {
        return { abi: false };
    }
    try {
        let abi = JSON.parse(abiString);
        return { ...getInputData({ data, abi }), abi };
    } catch (err) {
        return { abi: false };
    }
};

const getInputData = ({ data, abi }) => {
    try {
        let contractInterface = new ethers.Interface(abi);
        let decodedArgumentsProxy = contractInterface.decodeFunctionData(
            data.substring(0, 10),
            data
        );

        let decodedInput = proxyToObject(decodedArgumentsProxy);
        decodedInput = JSON.parse(
            JSON.stringify(
                decodedInput,
                (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value // return everything else unchanged
            )
        );
        let functionData = contractInterface.getFunction(data.substring(0, 10));

        log.debug('this is the decoded input - ', decodedInput);
        // functionData.inputs.forEach((param, index) => {
        //     decodedInput[param.name] = decodedArguments[index];
        // });
        log.debug('This is the final abi - ', abi);
        return { abi, decodedInput, functionData };
    } catch (err) {
        console.error('failed to decode with err - ', err);
        return { failedDecode: true };
    }
};

const proxyToObject = (proxy) => {
    log.debug('this is proxy - ', proxy);
    let data;
    try {
        data = proxy.toObject();
        if (Object.entries(data).length == 1 && data['_'] != undefined) {
            throw "it's an array";
        }
    } catch (err) {
        // array inputs cannot be converted to objects
        return proxy.toArray();
    }
    Object.entries(data).map(([key, value]) => {
        if (typeof value == 'object' && typeof value.toObject == 'function') {
            data[key] = proxyToObject(value);
        }
    });
    return data;
};
