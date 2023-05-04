import * as starknet from 'starknet';
import log from 'loglevel';

const NAMED_TUPLE_DELIMITER = ': ';
const ARGUMENTS_DELIMITER = ', ';
const COMMON_TYPES = [
    'felt',
    'core::felt252',
    'core::integer::u8',
    'core::integer::u16',
    'core::integer::u38',
    'core::integer::u64',
    'core::integer::u128',
    'core::integer::u256',
    'core::starknet::contract_address::ContractAddress',
];
export const LEN_SUFFIX = '_len';
const HEXADECIMAL_REGEX = /^0x[0-9a-fA-F]+?$/;
const PRIME =
    BigInt(2) ** BigInt(251) +
    BigInt(17) * BigInt(2) ** BigInt(192) +
    BigInt(1);

export function adaptInputUtil(functionName, input, inputSpecs, abi) {
    const adapted = [];
    // User won't pass array length as an argument, so subtract the number of array elements to the expected amount of arguments
    const countArrays = inputSpecs.filter((i) => i.type.endsWith('*')).length;
    let expectedInputCount = inputSpecs.length - countArrays;

    //adding this line as we have changed the code to manually handle _len inputs
    expectedInputCount = inputSpecs.length;

    // Initialize an array with the user input
    const inputLen = Object.keys(input || {}).length;
    if (expectedInputCount != inputLen) {
        const msg = `${functionName}: Expected ${expectedInputCount} argument${
            expectedInputCount === 1 ? '' : 's'
        }, got ${inputLen}.`;
        throw new Error(msg);
    }
    let lastSpec = { type: null, name: null };
    for (let i = 0; i < inputSpecs.length; ++i) {
        const inputSpec = inputSpecs[i];
        const currentValue = input[inputSpec.name];

        log.debug('adapting this value first - ', inputSpec.name);
        if (COMMON_TYPES.includes(inputSpec.type)) {
            const errorMsg =
                `${functionName}: Expected "${inputSpec.name}" to be a felt (Numeric); ` +
                `got: ${typeof currentValue}`;
            if (isNumeric(currentValue)) {
                adapted.push(toNumericString(currentValue));
            } else if (inputSpec.name.endsWith(LEN_SUFFIX)) {
                //added this line to add length manually
                log.debug(
                    'adapting this value - ',
                    inputSpec.name,
                    currentValue
                );
                adapted.push(toNumericString(currentValue));

                const nextSpec = inputSpecs[i + 1];
                const arrayName = inputSpec.name.slice(0, -LEN_SUFFIX.length);
                if (
                    nextSpec &&
                    nextSpec.name === arrayName &&
                    nextSpec.type.endsWith('*') &&
                    arrayName in input
                ) {
                    // will add array length in next iteration
                } else {
                    throw new Error(errorMsg);
                }
            } else {
                throw new Error(errorMsg);
            }
        } else if (inputSpec.type.endsWith('*')) {
            if (!Array.isArray(currentValue)) {
                const msg = `${functionName}: Expected ${inputSpec.name} to be a ${inputSpec.type}`;
                throw new Error(msg);
            }
            const lenName = `${inputSpec.name}${LEN_SUFFIX}`;
            if (lastSpec.name !== lenName || lastSpec.type !== 'felt') {
                const msg = `${functionName}: Array size argument ${lenName} (felt) must appear right before ${inputSpec.name} (${inputSpec.type}).`;
                throw new Error(msg);
            }
            // Remove the * from the spec type
            const inputSpecArrayElement = {
                name: inputSpec.name,
                type: inputSpec.type.slice(0, -1),
            };

            // commented below line because len has already been added in the above if
            // adapted.push(currentValue.length.toString());

            for (const element of currentValue) {
                adaptComplexInput(element, inputSpecArrayElement, abi, adapted);
            }
        } else {
            const nestedInput = input[inputSpec.name];
            adaptComplexInput(nestedInput, inputSpec, abi, adapted);
        }
        lastSpec = inputSpec;
    }
    return adapted;
}

export function adaptOutputUtil(rawResult, outputSpecs, abi) {
    var _a;
    const splitStr = rawResult.split(' ');
    const result = [];
    for (const num of splitStr) {
        const parsed =
            num[0] === '-'
                ? BigInt(num.substring(1)) * BigInt(-1)
                : BigInt(num);
        result.push(parsed);
    }
    let resultIndex = 0;
    let lastSpec = { type: null, name: null };
    const adapted = {};
    for (const outputSpec of outputSpecs) {
        const currentValue = result[resultIndex];
        if (COMMON_TYPES.includes(outputSpec.type)) {
            outputSpec.name =
                (_a = outputSpec.name) !== null && _a !== void 0
                    ? _a
                    : 'response';
            adapted[outputSpec.name] = currentValue;
            resultIndex++;
        } else if (outputSpec.type.endsWith('*')) {
            // Assuming lastSpec refers to the array size argument; not checking its name - done during compilation
            if (lastSpec.type !== 'felt') {
                const msg = `Array size argument (felt) must appear right before ${outputSpec.name} (${outputSpec.type}).`;
                throw new Error(msg);
            }
            // Remove * from the spec type
            const outputSpecArrayElementType = outputSpec.type.slice(0, -1);
            const arrLength = parseInt(adapted[lastSpec.name]);
            const structArray = [];
            // Iterate over the struct array, starting at index, starting at `resultIndex`
            for (let i = 0; i < arrLength; i++) {
                // Generate a struct with each element of the array and push it to `structArray`
                const ret = generateComplexOutput(
                    result,
                    resultIndex,
                    outputSpecArrayElementType,
                    abi
                );
                structArray.push(ret.generatedComplex);
                // Next index is the proper raw index returned from generating the struct, which accounts for nested structs
                resultIndex = ret.newRawIndex;
            }
            // New resultIndex is the raw index generated from the last struct
            adapted[outputSpec.name] = structArray;
        } else {
            const ret = generateComplexOutput(
                result,
                resultIndex,
                outputSpec.type,
                abi
            );
            adapted[outputSpec.name] = ret.generatedComplex;
            resultIndex = ret.newRawIndex;
        }
        lastSpec = outputSpec;
    }

    //added the serialize and parseObject to get the a cleaner response
    return serialize(parseObject(adapted));
}

function adaptComplexInput(input, inputSpec, abi, adaptedArray) {
    const type = inputSpec.type;
    if (input === undefined || input === null) {
        throw new Error(`${inputSpec.name} is ${input}`);
    }
    if (COMMON_TYPES.includes(type)) {
        if (isNumeric(input)) {
            adaptedArray.push(toNumericString(input));
            return;
        }
        const msg = `Expected ${inputSpec.name} to be a felt`;
        throw new Error(msg);
    }
    if (isTuple(type)) {
        const memberTypes = extractMemberTypes(type.slice(1, -1));
        if (isNamedTuple(type)) {
            // Initialize an array with the user input
            const inputLen = Object.keys(input || {}).length;
            if (inputLen !== memberTypes.length) {
                const msg = `"${inputSpec.name}": Expected ${
                    memberTypes.length
                } member${
                    memberTypes.length === 1 ? '' : 's'
                }, got ${inputLen}.`;
                throw new Error(msg);
            }
            for (let i = 0; i < inputLen; i++) {
                const memberSpec = parseNamedTuple(memberTypes[i]);
                const nestedInput = input[memberSpec.name];
                adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
            }
        } else {
            if (!Array.isArray(input)) {
                const msg = `Expected ${inputSpec.name} to be a tuple`;
                throw new Error(msg);
            }
            if (input.length != memberTypes.length) {
                const msg = `"${inputSpec.name}": Expected ${
                    memberTypes.length
                } member${memberTypes.length === 1 ? '' : 's'}, got ${
                    input.length
                }.`;
                throw new Error(msg);
            }
            for (let i = 0; i < input.length; ++i) {
                const memberSpec = {
                    name: `${inputSpec.name}[${i}]`,
                    type: memberTypes[i],
                };
                const nestedInput = input[i];
                adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
            }
        }
        return;
    }
    if (isNamedTuple(type)) {
        const memberSpec = parseNamedTuple(type);
        const nestedInput = input[memberSpec.name];
        adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
        return;
    }
    // otherwise a struct
    adaptStructInput(input, inputSpec, abi, adaptedArray);
}

function adaptStructInput(input, inputSpec, abi, adaptedArray) {
    if (inputSpec.type === 'Uint256') {
        input = starknet.uint256.bnToUint256(new starknet.number.toBN(input));
    }
    const type = inputSpec.type;
    if (!(type in abi)) {
        throw new Error(`Type ${type} not present in ABI.`);
    }
    const struct = abi[type];
    const countArrays = struct.members.filter((i) =>
        i.type.endsWith('*')
    ).length;
    const expectedInputCount = struct.members.length - countArrays;
    // Initialize an array with the user input
    const inputLen = Object.keys(input || {}).length;
    if (expectedInputCount != inputLen) {
        const msg = `"${
            inputSpec.name
        }": Expected ${expectedInputCount} member${
            expectedInputCount === 1 ? '' : 's'
        }, got ${inputLen}.`;
        throw new Error(msg);
    }
    for (let i = 0; i < struct.members.length; ++i) {
        const memberSpec = struct.members[i];
        const nestedInput = input[memberSpec.name];
        adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
    }
}

function generateComplexOutput(raw, rawIndex, type, abi) {
    if (COMMON_TYPES.includes(type)) {
        return {
            generatedComplex: raw[rawIndex],
            newRawIndex: rawIndex + 1,
        };
    }
    let generatedComplex = null;
    if (isTuple(type)) {
        const members = extractMemberTypes(type.slice(1, -1));
        if (isNamedTuple(type)) {
            generatedComplex = {};
            for (const member of members) {
                const memberSpec = parseNamedTuple(member);
                const ret = generateComplexOutput(
                    raw,
                    rawIndex,
                    memberSpec.type,
                    abi
                );
                generatedComplex[memberSpec.name] = ret.generatedComplex;
                rawIndex = ret.newRawIndex;
            }
        } else {
            generatedComplex = [];
            for (const member of members) {
                const ret = generateComplexOutput(raw, rawIndex, member, abi);
                generatedComplex.push(ret.generatedComplex);
                rawIndex = ret.newRawIndex;
            }
        }
    } else {
        // struct
        if (!(type in abi)) {
            throw new Error(`Type ${type} not present in ABI.`);
        }
        generatedComplex = {};
        const struct = abi[type];
        for (const member of struct.members) {
            const ret = generateComplexOutput(raw, rawIndex, member.type, abi);
            generatedComplex[member.name] = ret.generatedComplex;
            rawIndex = ret.newRawIndex;
        }
    }
    return {
        generatedComplex,
        newRawIndex: rawIndex,
    };
}

function extractMemberTypes(s) {
    // Replace all top-level tuples with '#'
    const specialSymbol = '#';
    let i = 0;
    let tmp = '';
    const replacedSubStrings = [];
    while (i < s.length) {
        if (s[i] === '(') {
            let counter = 1;
            const openningBracket = i;
            // Move to next element after '('
            i++;
            // As invariant we assume that cairo compiler checks
            // that num of '(' === num of ')' so we will terminate
            // before i > s.length
            while (counter) {
                if (s[i] === ')') {
                    counter--;
                }
                if (s[i] === '(') {
                    counter++;
                }
                i++;
            }
            replacedSubStrings.push(s.substring(openningBracket, i));
            // replace tuple with special symbol
            tmp += specialSymbol;
            // Move index back on last ')'
            i--;
        } else {
            tmp += s[i];
        }
        i++;
    }
    let specialSymbolCounter = 0;
    // Now can split as all tuples replaced with '#'
    return tmp.split(ARGUMENTS_DELIMITER).map((type) => {
        // if type contains '#' then replace it with replaced substring
        if (type.includes(specialSymbol)) {
            return type.replace(
                specialSymbol,
                replacedSubStrings[specialSymbolCounter++]
            );
        } else {
            return type;
        }
    });
}

function isNumeric(value) {
    if (value === undefined || value === null) {
        return false;
    }
    const strValue = value.toString();
    const decimalRegex = /^-?\d+$/;
    return decimalRegex.test(strValue) || HEXADECIMAL_REGEX.test(strValue);
}

function toNumericString(value) {
    const num = BigInt(value.toString());
    const nonNegativeNum = ((num % PRIME) + PRIME) % PRIME;
    return nonNegativeNum.toString();
}
function isNamedTuple(type) {
    return type.includes(NAMED_TUPLE_DELIMITER);
}
function isTuple(type) {
    return type[0] === '(' && type[type.length - 1] === ')';
}
// Can't use String.split since ':' also can be inside type
// Ex: x : (y : felt, z: SomeStruct)
function parseNamedTuple(namedTuple) {
    const index = namedTuple.indexOf(NAMED_TUPLE_DELIMITER);
    const name = namedTuple.substring(0, index);
    const type = namedTuple.substring(
        name.length + NAMED_TUPLE_DELIMITER.length
    );
    return { name, type };
}

// added custom functions to parse the response

function serialize(object) {
    return JSON.parse(
        JSON.stringify(
            object,
            (key, value) =>
                typeof value === 'bigint' ? value.toString() : value // return everything else unchanged
        )
    );
}

function parseObject(obj) {
    if (Array.isArray(obj)) {
        return parseArray(obj);
    }
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            result[key] = parseArray(value);
            return;
        }
        result[key] = parseValue(value);
    });
    return result;
}

function parseArray(arr) {
    const result = [];
    arr.forEach((value) => {
        if (Array.isArray(value)) {
            result.push(parseArray(value));
            return;
        }
        result.push(parseValue(value));
    });
    return result;
}

function parseValue(value) {
    try {
        if (typeof value === 'object') {
            if (isUint256(value)) {
                return starknet.uint256.uint256ToBN(value).toString();
            }
            return parseObject(value);
        }
        if ([76, 75].includes(value.toString().length)) {
            // throws an error if not an address
            return starknet.validateAndParseAddress(value);
        }
        return value;
    } catch (err) {
        return value;
    }
}

function isUint256(obj) {
    if (
        typeof obj === 'object' &&
        Object.keys(obj).length === 2 &&
        'low' in obj &&
        'high' in obj
    ) {
        return true;
    }
    return false;
}
