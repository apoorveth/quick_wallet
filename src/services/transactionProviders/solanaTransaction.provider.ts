import {
    isAddressLookupTableInstruction,
    parseAddressLookupTableInstructionTitle,
} from '../../../utils/solana/instructions/addressLookup';
import * as serumInstruction from '../../../utils/solana/instructions/serum';
import { isTokenSwapInstruction } from '../../../utils/solana/instructions/tokenSwap';
import { isTokenLendingInstruction } from '../../../utils/solana/instructions/tokenLending';
import {
    isWormholeInstruction,
    parsWormholeInstructionTitle,
} from '../../../utils/solana/instructions/wormhole';
import * as pythInstruction from '../../../utils/solana/instructions/pyth';
import { ComputeBudgetProgram, Keypair } from '@solana/web3.js';
import * as solana from '@solana/web3.js';
import {
    Program,
    web3,
    AnchorProvider,
    BorshCoder,
    Idl,
    BN,
} from '@project-serum/anchor';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';
import { stringifyBigInt } from '../../../utils/objects';
import { parseTokenSwapInstructionTitle } from '../../../utils/solana/instructions/tokenSwap';
import { parseTokenLendingInstructionTitle } from '../../../utils/solana/instructions/tokenLending';
import {
    addressLabel,
    displayAddress,
    intoParsedTransaction,
} from '../../../utils/solana/parser';
import log from 'loglevel';
import _ from 'lodash';
import { Cluster } from '../../../utils/solana/cluster';
import { TransactionV1 } from '../../types/SolanaTransactionV1';
import { TransactionV2 } from '../../types/SolanaTransactionV2';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import mixpanel from 'mixpanel-browser';

// @ts-ignore
import NETWORK_CONFIG from '../../config/networks';
import axios from 'axios';
import { IdlInstruction } from '@project-serum/anchor/dist/cjs/idl';

const DECODE_FAIL_MESSAGE =
    'Still working on decoding UpgradeNonceAccount. We should push an update soon!';

export const filterSimulatorKeys = (obj: any) => {
    const clone = JSON.parse(stringifyBigInt(obj));
    if (clone) {
        if (clone.transaction && clone.transaction.signatures) {
            delete clone.transaction.signatures;
        } else if (clone.signatures) {
            delete clone.signatures;
        }
    }

    return JSON.stringify(clone, null, 4);
};

export const getInputDataWithoutAbi = async ({
    transaction,
    transactionIndex,
    network,
}: {
    transaction: TransactionV1 | TransactionV2; // it's not actually an instance of VersionedTransaction because it doesn't have the methods, but it has the variables
    transactionIndex: number;
    network: string;
}) => {
    const instructions = getInstructions(transaction);
    const decodedInstructionsPromises = instructions.map(async (ix) => {
        try {
            return await decodeInstruction(ix);
        } catch (err) {
            log.error('failed to decode - ', ix, err);
            return {
                name: 'Failed to decode this',
            };
        }
    });
    const decodedInstructions = await Promise.all(decodedInstructionsPromises);
    let abis: any = [];
    const decodedInstructionsFormatted = decodedInstructions.map((inst) => {
        if (!('idl' in inst)) {
            abis.push({});
            return { ...inst };
        }
        abis.push(inst.idl);
        delete inst.idl;
        return inst;
    });
    return {
        decodedInput: decodedInstructionsFormatted,
        functionData: {
            name: 'Solana Transaction',
        },
        abi: abis,
    };
};

export const simulate = async ({
    network,
    interceptedTransaction,
}: {
    network: any;
    interceptedTransaction: any;
}) => {
    try {
        log.debug(
            'inside simulate transaction for solana',
            interceptedTransaction
        );
        const body = {
            chainId: NETWORK_CONFIG[network].chainId,
            from: interceptedTransaction.accountAddress,
            calldata: interceptedTransaction.walletMessage[0], // sending only the first txn for now
            simulatorType: 'SOLANA',
        };
        mixpanel.track('SOLANA_FAILED_SIMULATION', body);

        body.calldata = [
            serializeInstructions(interceptedTransaction.walletMessage[0][0]),
        ];
        return await axios.post(
            `${process.env.REACT_APP_BACKEND_BASE_URL}/v1/simulator/simulate`,
            body
        );
    } catch (err) {
        console.error('failed to simulate');
        return {
            success: false,
        };
    }
};

const serializeInstructions = (
    transaction: TransactionV1 | TransactionV2 | TransactionV3
): string => {
    log.debug('inside message serialization2');
    if (!('message' in transaction)) {
        log.debug('inside message serialization', transaction);
        const transactionV2 = transaction as TransactionV2;
        const instructions = transactionV2.instructions.map((ix) => {
            return new solana.TransactionInstruction({
                data: Buffer.from(new Uint8Array(ix.data)),
                programId: new solana.PublicKey(ix.programId),
                keys: ix.keys.map((key) => {
                    return {
                        ...key,
                        pubkey: new solana.PublicKey(key.pubkey),
                    };
                }),
            });
        });
        log.debug('this is txn - ', transactionV2);
        let tx = new solana.Transaction({
            feePayer: new solana.PublicKey(transactionV2.feePayer),
            blockhash: transactionV2.recentBlockhash,
            lastValidBlockHeight: Number.MAX_VALUE,
        });
        tx = tx.add(...instructions);
        return bs58.encode(tx.serialize({ verifySignatures: false }));
    }

    const transactionV1 = transaction as TransactionV1;
    const versionedTxn = new web3.VersionedTransaction(
        new web3.Message({
            ...transaction.message,
        })
    );
    return bs58.encode(versionedTxn.serialize());
};

const getInstructions = (
    transaction: TransactionV1 | TransactionV2 | TransactionV3
): solana.TransactionInstruction[] => {
    if (!('message' in transaction)) {
        const transactionV2 = transaction as TransactionV2;
        return transactionV2.instructions.map((ix) => {
            return new solana.TransactionInstruction({
                data: Buffer.from(new Uint8Array(ix.data)),
                programId: new solana.PublicKey(ix.programId),
                keys: ix.keys.map((key) => {
                    return {
                        ...key,
                        pubkey: new solana.PublicKey(key.pubkey),
                    };
                }),
            });
        });
    }

    const transactionV1 = transaction as TransactionV1;

    log.debug('this is txn v1 - ', transactionV1);
    const versionedTxn = new web3.VersionedTransaction(
        new web3.Message({
            ...transactionV1.message,
        })
    );

    log.debug('this is versioned txn  -', versionedTxn);
    const serializedTxn = versionedTxn.serialize();
    log.debug(
        'THIS IS BASE 58 - ',
        bs58.encode(
            Buffer.from(
                serializedTxn.buffer,
                serializedTxn.byteOffset,
                serializedTxn.byteLength
            )
        )
    );

    return versionedTxn.message.compiledInstructions.map((ix) => {
        const accountMetas = ix.accountKeyIndexes.map((idx) => ({
            pubkey: versionedTxn.message.getAccountKeys().staticAccountKeys[
                idx
            ],
            isSigner: versionedTxn.message.isAccountSigner(idx),
            isWritable: versionedTxn.message.isAccountWritable(idx),
        }));
        const programId =
            versionedTxn.message.getAccountKeys().staticAccountKeys[
                ix.programIdIndex
            ];
        return new solana.TransactionInstruction({
            keys: accountMetas,
            programId: programId,
            data: ix.data as Buffer,
        });
    });
};

export const getOutputDataFromInput = async ({
    functionName,
    inputStr,
    abi,
    simulatorData,
}: {
    functionName: string;
    inputStr: string;
    abi: Idl[];
    simulatorData: any;
}) => {
    log.debug('inside get output data', simulatorData);
    try {
        const inputArr = JSON.parse(inputStr);
        let instructions: any;
        let v2Type = false;
        if (!('message' in simulatorData)) {
            instructions = simulatorData.instructions;
            v2Type = true;
        } else {
            instructions = simulatorData.message.instructions;
        }
        log.debug('this is the abi - ', abi);
        const newInstructionPromises: any = abi.map(async (idl, index) => {
            const input = inputArr[index];
            if (_.isEmpty(idl)) {
                return instructions[index];
            }

            const provider = getAnchorProvider();
            const program = new Program(idl, input.programId, provider);
            let accountsFormatted: { [name: string]: solana.PublicKey } = {};
            log.debug('empty accs formatted - ', accountsFormatted);
            const idlInstruction = idl.instructions.filter(
                (ix) => ix.name === input.functionCall
            )[0];
            let result = getAccountsFormatted(
                idlInstruction.accounts,
                input.decodedInput.accounts,
                0,
                {}
            );
            accountsFormatted = result.accountsFormatted;
            log.debug('this are formatted accs - ', accountsFormatted);
            let instruction = await program.methods[input.functionCall](
                ...formatArgs(input.decodedInput.args)
            )
                .accounts({ ...accountsFormatted })
                .instruction();
            let ix = _.cloneDeep(instructions[index]);
            log.debug('this is the ix - ', ix);
            ix.data = v2Type
                ? instruction.data.toJSON().data
                : bs58.encode(instruction.data);
            log.debug('this is the ix after change - ', ix);
            return ix;
        });

        const newInstructions = await Promise.all(newInstructionPromises);

        log.debug('these are new instrucitons - ', newInstructions);
        const newSimulatorData = {
            ...simulatorData,
        };
        if (v2Type) {
            newSimulatorData.instructions = newInstructions;
        } else {
            newSimulatorData.message.instructions = newInstructions;
        }
        log.debug('this is the new simulator data - ', newSimulatorData);

        return newSimulatorData;
    } catch (err) {
        log.error('this is err', err);
        return simulatorData;
    }
};

const getAccountsFormatted = (
    instructionAccounts,
    accounts,
    accountIndex,
    accountsFormatted
) => {
    instructionAccounts.forEach((account) => {
        if (account.accounts) {
            let resluts = getAccountsFormatted(
                account.accounts,
                accounts,
                accountIndex,
                {}
            );
            accountsFormatted[account.name] = resluts.accountsFormatted;
            accountIndex = resluts.newIndex;
        } else {
            accountsFormatted[account.name] = new solana.PublicKey(
                accounts[accountIndex].pubkey
            );
            accountIndex++;
        }
    });
    return {
        newIndex: accountIndex,
        accountsFormatted: { ...accountsFormatted },
    };
};

const decodeInstruction = async (
    transactionIx: solana.TransactionInstruction
) => {
    log.debug('Going to decode this instruction - ', transactionIx);

    const accounts = transactionIx.keys;
    if (isAddressLookupTableInstruction(transactionIx)) {
        return {
            program: `Address Lookup Table: ${
                parseAddressLookupTableInstructionTitle(transactionIx) ||
                'Unknown'
            }`,
            accounts,
        };
    } else if (serumInstruction.isSerumInstruction(transactionIx)) {
        const decoded = decodeSerumInstruction(transactionIx);
        return {
            program: decoded.name,
            decodedInput: decoded.decodedInput,
        };
    } else if (isTokenSwapInstruction(transactionIx)) {
        return {
            program: `Token Swap: ${
                parseTokenSwapInstructionTitle(transactionIx) || 'Unknown'
            }`,
            accounts,
        };
    } else if (isTokenLendingInstruction(transactionIx)) {
        return {
            program: `Token Lending: ${
                parseTokenLendingInstructionTitle(transactionIx) || 'Unknown'
            }`,
            accounts,
        };
    } else if (isWormholeInstruction(transactionIx)) {
        return {
            program: `Wormhole: ${
                parsWormholeInstructionTitle(transactionIx) || 'Unknown'
            }`,
            accounts,
        };
    } else if (pythInstruction.isPythInstruction(transactionIx)) {
        const decoded = decodePythInstruction(transactionIx);
        return {
            program: decoded.name,
            decodedInput: decoded.decodedInput,
        };
    } else if (ComputeBudgetProgram.programId.equals(transactionIx.programId)) {
        let instructionName = 'Unknown';
        try {
            instructionName =
                solana.ComputeBudgetInstruction.decodeInstructionType(
                    transactionIx
                );
        } catch (err) {}
        return {
            program: `Compute Budget Program: ${instructionName || 'Unknown'}`,
            accounts,
        };
    } else if (
        transactionIx.programId.toBase58() ===
        solana.SystemProgram.programId.toBase58()
    ) {
        const decoded = decodeSystemInstruction(transactionIx);
        return {
            program: decoded.name,
            decodedInput: decoded.decodedInput,
        };
    }

    log.debug('this is the program id - ', transactionIx.programId.toString());
    const provider = getAnchorProvider();
    const name = displayAddress(
        transactionIx.programId.toBase58(),
        Cluster.MainnetBeta,
        new Map()
    );

    const idl: Idl | null = await Program.fetchIdl(
        transactionIx.programId,
        provider
    );
    if (!idl) {
        return {
            name,
            accounts,
        };
    }
    const coder = new BorshCoder(idl);
    const ix = coder.instruction.decode(transactionIx.data as Buffer, 'base58');
    if (!ix) {
        return {
            name,
            accounts,
        };
    }

    const formatted = coder.instruction.format(ix, transactionIx.keys);
    log.debug('this is ix - ', formatted);

    return {
        decodedInput: formatted,
        functionCall: ix.name,
        name: name,
        programId: transactionIx.programId,
        idl,
    };
};

const getAnchorProvider = (): AnchorProvider => {
    const connection = new web3.Connection(
        'https://compatible-proud-sun.solana-mainnet.discover.quiknode.pro/b30a6559ff2fa3d05251038e43efad78c24b8145/',
        'finalized'
    );

    const wallet = new NodeWallet(Keypair.generate());
    return new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
    );
};

const decodeSystemInstruction = (
    transactionIx: solana.TransactionInstruction
): { decodedInput: any; name: string } => {
    const name = solana.SystemInstruction.decodeInstructionType(transactionIx);
    let decoded;
    switch (name) {
        case 'AllocateWithSeed':
            decoded =
                solana.SystemInstruction.decodeAllocateWithSeed(transactionIx);
            break;
        case 'Allocate':
            decoded = solana.SystemInstruction.decodeAllocate(transactionIx);
            break;
        case 'Assign':
            decoded = solana.SystemInstruction.decodeAssign(transactionIx);
            break;
        case 'AssignWithSeed':
            decoded =
                solana.SystemInstruction.decodeAssignWithSeed(transactionIx);
            break;
        case 'AuthorizeNonceAccount':
            decoded =
                solana.SystemInstruction.decodeNonceAuthorize(transactionIx);
            break;
        case 'Create':
            decoded =
                solana.SystemInstruction.decodeCreateAccount(transactionIx);
            break;
        case 'CreateWithSeed':
            decoded =
                solana.SystemInstruction.decodeCreateWithSeed(transactionIx);
            break;
        case 'InitializeNonceAccount':
            decoded =
                solana.SystemInstruction.decodeNonceInitialize(transactionIx);
            break;
        case 'Transfer':
            decoded = solana.SystemInstruction.decodeTransfer(transactionIx);
            break;
        case 'TransferWithSeed':
            decoded =
                solana.SystemInstruction.decodeTransferWithSeed(transactionIx);
            break;
        case 'UpgradeNonceAccount':
            decoded = DECODE_FAIL_MESSAGE;
            break;
        case 'AdvanceNonceAccount':
            decoded =
                solana.SystemInstruction.decodeNonceAdvance(transactionIx);
            break;
        case 'WithdrawNonceAccount':
            decoded =
                solana.SystemInstruction.decodeNonceWithdraw(transactionIx);
            break;
        default:
            decoded = 'Failed to decode System program instruction';
    }
    return {
        name: name,
        decodedInput: JSON.parse(stringifyBigInt(decoded)),
    };
};

const decodeSerumInstruction = (
    transactionIx: solana.TransactionInstruction
): { decodedInput: any; name: string } => {
    const name = serumInstruction.parseSerumInstructionTitle(transactionIx);
    let decoded;
    switch (name) {
        case serumInstruction.SERUM_CODE_LOOKUP[0]:
            decoded = serumInstruction.decodeInitializeMarket(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[1]:
            decoded = serumInstruction.decodeNewOrder(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[10]:
            decoded = serumInstruction.decodeNewOrderV3(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[11]:
            decoded = serumInstruction.decodeCancelOrderV2(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[12]:
            decoded =
                serumInstruction.decodeCancelOrderByClientIdV2(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[13]:
            decoded = DECODE_FAIL_MESSAGE;
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[14]:
            decoded = serumInstruction.decodeCloseOpenOrders(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[15]:
            decoded = serumInstruction.decodeInitOpenOrders(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[16]:
            decoded = serumInstruction.decodePrune(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[17]:
            decoded =
                serumInstruction.decodeConsumeEventsPermissioned(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[2]:
            decoded = serumInstruction.decodeMatchOrders(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[3]:
            decoded = serumInstruction.decodeConsumeEvents(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[4]:
            decoded = serumInstruction.decodeCancelOrder(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[5]:
            decoded = serumInstruction.decodeSettleFunds(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[6]:
            decoded =
                serumInstruction.decodeCancelOrderByClientId(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[7]:
            decoded = serumInstruction.decodeDisableMarket(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[8]:
            decoded = serumInstruction.decodeSweepFees(transactionIx);
            break;
        case serumInstruction.SERUM_CODE_LOOKUP[9]:
            decoded = DECODE_FAIL_MESSAGE;
            break;
        default:
            decoded = 'Failed to decode Serum instruction';
    }
    return {
        name: name,
        decodedInput: JSON.parse(stringifyBigInt(decoded)),
    };
};

const decodePythInstruction = (
    transactionIx: solana.TransactionInstruction
): { decodedInput: any; name: string } => {
    const name =
        pythInstruction.PythInstruction.decodeInstructionType(transactionIx);
    let decoded;
    switch (name) {
        case 'AddMapping':
            decoded =
                pythInstruction.PythInstruction.decodeAddMapping(transactionIx);
            break;
        case 'AddPrice':
            decoded =
                pythInstruction.PythInstruction.decodeAddPrice(transactionIx);
            break;
        case 'AddProduct':
            decoded =
                pythInstruction.PythInstruction.decodeAddPrice(transactionIx);
            break;
        case 'AddPublisher':
            decoded =
                pythInstruction.PythInstruction.decodeAddPublisher(
                    transactionIx
                );
            break;
        case 'AggregatePrice':
            decoded =
                pythInstruction.PythInstruction.decodeAggregatePrice(
                    transactionIx
                );
            break;
        case 'DeletePublisher':
            decoded =
                pythInstruction.PythInstruction.decodeDeletePublisher(
                    transactionIx
                );
            break;
        case 'InitMapping':
            decoded =
                pythInstruction.PythInstruction.decodeInitMapping(
                    transactionIx
                );
            break;
        case 'InitPrice':
            decoded =
                pythInstruction.PythInstruction.decodeInitPrice(transactionIx);
            break;
        case 'InitTest':
            decoded = DECODE_FAIL_MESSAGE;
            break;
        case 'SetMinPublishers':
            decoded =
                pythInstruction.PythInstruction.decodeSetMinPublishers(
                    transactionIx
                );
            break;
        case 'UpdatePrice':
            decoded =
                pythInstruction.PythInstruction.decodeUpdatePrice(
                    transactionIx
                );
            break;
        case 'UpdatePriceNoFailOnError':
            decoded =
                pythInstruction.PythInstruction.decodeUpdatePriceNoFailOnError(
                    transactionIx
                );
            break;
        case 'UpdateProduct':
            decoded =
                pythInstruction.PythInstruction.decodeUpdateProduct(
                    transactionIx
                );
            break;
        case 'UpdateTest':
            decoded = DECODE_FAIL_MESSAGE;
            break;
        default:
            decoded = 'Failed to decode Pyth instruction';
    }
    return {
        name: name,
        decodedInput: JSON.parse(stringifyBigInt(decoded)),
    };
};

type InstructionArg = { name: string; type: string; data: string };

const formatArgs = (args: InstructionArg[]) => {
    return args.map((arg) => {
        return formatArg(arg);
    });
};

const formatArg = (arg: InstructionArg) => {
    switch (arg.type) {
        case 'bool':
            return JSON.parse(arg.data);
        case 'u64':
        case 'u128':
        case 'i64':
        case 'i128':
            return new BN(arg.data);
        case 'u8':
        case 'u16':
        case 'u32':
        case 'i8':
        case 'i16':
        case 'i32':
        case 'f32':
        case 'f64':
            return Number(arg.data);
        case 'string':
            return arg.data;
    }
};
