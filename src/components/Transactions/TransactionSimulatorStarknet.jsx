import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import './prism-vsc-dark-plus.css'; //Example style, you can use another
import Editor from 'react-simple-code-editor';
import cross from '../../assets/img/cross.png';
import axios from 'axios';
import { ethers } from 'ethers';
import {
    filterSimulatorKeys,
    getInputDataWithoutAbi,
    getOutputDataFromInput,
} from '../../services/transactions';
import * as transactions from '../../services/transactions';
import { getTransaction } from '../../services/scan';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectCurrentSimulation,
    selectCurrentSimulationTransactionIndex,
    selectNetwork,
    setCurrentSimulationTransactionIndex,
    setCurrentSimulationWalletMessage,
    setNetwork,
} from '../../features/walletSlice';
import NETWORK_CONFIG from '../../config/networks';
import { v4 as uuidv4 } from 'uuid';
import { AgGridReact } from 'ag-grid-react';
import CellImageAndText from '../AgGrid/CellImageAndText';
import { selectSettingWithKey } from '../../features/userSlice';
import { updateWalletMessageAndState } from '../../lib/storage';
import { SimulationState } from '../../lib/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCaretLeft,
    faCaretRight,
    faCopy,
    faPlay,
} from '@fortawesome/free-solid-svg-icons';
import ArgentXLogo from '../../assets/img/argentx-logo.png';
import PhantomLogo from '../../assets/img/phantom_wallet.png';
import mixpanel from 'mixpanel-browser';
import _ from 'lodash';
import * as starknet from 'starknet';
import log from 'loglevel';

const OpacityContainer = styled.div`
    position: fixed;
    width: 100%;
    right: 0;
    top: 0;
    height: 100%;
    background-color: black;
    opacity: 0.4;
    overflow: hidden;
`;

const SimulatorContainer = styled.div`
    background-color: #1c1c1c;
    right: 0;
    height: 100%;
    position: absolute;
    top: 0;
    border-left: 2px solid rgb(58, 58, 58);
    padding-top: 2%;
    overflow-y: scroll;
    padding-top: calc(3.5vh + 4%);
    /* padding-bottom: 5vh; */
    overflow: hidden;

    ${(props) => {
        if (!props.fullScreen) {
            return css`
                width: 70%;
                @media (min-width: 900px) {
                    width: 50%;
                    padding-top: calc(3.5vh + 4%);
                }
            `;
        } else {
            return css`
                width: 100%;
            `;
        }
    }}
`;

const DetailsScrollContainer = styled.div`
    overflow-y: scroll;
    padding-bottom: 20vh;
    padding-top: 2vh;
    height: -webkit-fill-available;
    padding-left: 15px;
    padding-right: 10%;
`;

const HeadingRow = styled.div`
    font-size: 3.5vh;
    text-align: left;
    color: white;
    background-color: #2d2d2d;
    border-bottom: 2px solid rgb(58, 58, 58);
    width: -webkit-fill-available;
    left: 0;
    position: absolute;
    top: 0;
    padding: 15px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    z-index: 1;
`;

const HeadingRowRightContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 40%;
    justify-content: flex-end;
`;

const HeadingText = styled.div``;

const Subheading = styled.div`
    color: white;
    font-size: 3vh;
    text-align: left;
    display: flex;
    align-items: center;
`;

const CloseIcon = styled.img`
    width: 20px;
    height: 20px;
    z-index: 1;
    cursor: pointer;
`;

const SimulateButton = styled.div`
    z-index: 2;
    background-color: white;
    color: black;
    border-radius: 50px;
    font-size: 2.4vh;
    height: 32px;
    padding-left: 20px;
    padding-right: 20px;
    margin-right: 20px;
    cursor: pointer;
    justify-content: center;
    display: flex;
    align-items: center;

    @media (min-width: 900px) {
        font-size: 2vh;
    }
`;

const ForwardToWalletButton = styled.div`
    z-index: 2;
    background-color: white;
    color: black;
    border-radius: 50px;
    font-size: 2.4vh;
    font-family: GilmerMedium;
    height: 32px;
    padding-left: 20px;
    padding-right: 20px;
    margin-right: 20px;
    cursor: pointer;
    justify-content: space-around;
    display: flex;
    align-items: center;

    @media (min-width: 900px) {
        font-size: 2vh;
    }
`;

const ForwardButtonImage = styled.img`
    width: 22px;
    margin-right: 5px;
`;

const TransactionDetailsContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    margin-top: 2vh;
`;

const TransactionDetail = styled.div`
    display: flex;
    flex-direction: row;
    margin-right: 1vw;
    margin-bottom: 0.8vh;
    font-size: 2.1vh;
    width: 40%;
    cursor: pointer;
    @media (min-width: 900px) {
        font-size: 1.8vh;
    }
`;

const TransactionDetailKey = styled.div`
    /* background-color: black; */
    color: #a09fa6;
    /* padding: 0.5vw; */
    text-align: center;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
`;

const TransactionDetailValue = styled.div`
    /* background-color: #363636; */
    color: #ededef;
    display: flex;
    align-items: center;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    /* padding: 0.5vw; */
    margin-left: 0.5vw;
`;

const CopyIcon = styled(FontAwesomeIcon)`
    margin-left: 5px;
    display: none;

    ${TransactionDetail}:hover & {
        display: block;
    }

    ${TransactionDetail}:active & {
        transform: scale(1.2);
    }

    ${TransactionDetail}:active::after & {
        transform: scale(1);
    }
`;

const FunctionName = styled.div`
    font-size: 2.3vh;
    color: #b3b3b3;
    text-align: left;
    margin-top: 2%;
    margin-bottom: 2%;

    @media (min-width: 900px) {
        font-size: 1.8vh;
    }
`;

const DecodeErrorContainer = styled.div`
    background-color: #383800;
    padding-left: 20px;
    padding-top: 5px;
    padding-bottom: 20px;
    border: 1px solid #818100;
    margin-top: 2%;
    width: calc(100%-40px); //subtracting the horizontal padding values
    border-radius: 9px;
    padding-right: 20px;
`;

const DecodeErrorMessage = styled.div`
    text-align: left;
    color: #c7c7c7;
    font-size: 1.6vh;
    margin-top: 1%;

    @media (max-width: 900px) {
        font-size: 2.2vh;
        width: 90%;
    }
`;

const DecodeErrorMessageHyperlink = styled.a`
    color: grey;
`;

const ImplementationContractInputContainer = styled.div``;

const ImplementationContractInput = styled.input`
    color: #c7c7c7;
    background-color: transparent;
    padding: 1%;
    display: block;
    border: 0;
    margin-top: 10px;
    width: 80%;
    border-bottom: 1px solid #c7c7c7;
`;

const SimulationTable = styled.div`
    height: 30%;
    margin-top: 1%;
`;

const Loader = styled.div`
    border: 3px solid #c0c0c0;
    border-radius: 50%;
    border-top: 3px solid black;
    width: 20px;
    height: 20px;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;

    /* Safari */
    @-webkit-keyframes spin {
        0% {
            -webkit-transform: rotate(0deg);
        }
        100% {
            -webkit-transform: rotate(360deg);
        }
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`;

const DecodeLoader = styled.div`
    border-width: 3px;
    border-style: solid;
    border-color: transparent rgb(236 236 236) rgb(236 236 236);
    border-image: initial;
    border-radius: 50%;
    width: 13px;
    height: 13px;
    animation: 1s linear 0s infinite normal none running spin;
    margin-left: 10px;

    /* Safari */
    @-webkit-keyframes spin {
        0% {
            -webkit-transform: rotate(0deg);
        }
        100% {
            -webkit-transform: rotate(360deg);
        }
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`;

const EditorContainer = styled.div`
    max-height: 80%;
    overflow: auto;
    border: 1px solid #7b7b7b;
`;

const TransactionPageContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin-right: 4%;
    align-items: center;
    justify-content: center;
`;

const TransactionPage = styled.div`
    font-size: 1.4rem;
    margin-left: 3px;
    margin-right: 3px;
`;

const TransactionPageChangeCaret = styled(FontAwesomeIcon)`
    cursor: pointer;
`;

const EditorStyles = {
    fontFamily: '"Fira code", "Fira Mono", monospace',
    fontSize: 12,
    backgroundColor: 'black',
    width: '90%',
    caretColor: 'white',
    width: '100%',
};

const TransactionSimulatorStarknet = ({ closeSimulator, hash, fullScreen }) => {
    const interceptedTransaction = useSelector(selectCurrentSimulation);
    const transactionIndex = useSelector(
        selectCurrentSimulationTransactionIndex
    );

    const [decodedInputData, setDecodedInputData] = useState('{}');
    const [contractFunctionName, setContractFunctionName] = useState(false);
    const [contractAbi, setContractAbi] = useState([]);
    const [simulationResults, setSimulationResults] = useState('{}');
    const [inputDecodeFailed, setInputDecodeFailed] = useState(false);
    const [transaction, setTransaction] = useState(
        interceptedTransaction.walletMessage[0][transactionIndex]
    );
    log.debug('this is the txn - ', interceptedTransaction);
    const network = useSelector(selectNetwork);
    const [simulatorData, setSimulatorData] = useState(
        filterSimulatorKeys({ transaction, network })
    );
    const [assetChanges, setAssetChanges] = useState();
    const [simulationStatus, setSimulationStatus] = useState(false);
    const [isDecodingInput, setIsDecodingInput] = useState(false);

    const gridRef = useRef();
    const dispatch = useDispatch();
    const [columnDefs, setColumnDefs] = useState([
        {
            field: 'Type',
            cellRenderer: (params) => params.data.name,
            resizable: true,
        },
        {
            field: 'Token',
            cellRenderer: (params) => {
                return (
                    <CellImageAndText
                        img={params.data.tokenImage}
                        text={params.data.tokenName}
                    ></CellImageAndText>
                );
            },
            resizable: true,
        },
        {
            field: 'Value',
            cellRenderer: (params) => params.data.value,
            resizable: true,
        },
    ]);
    const defaultColDef = useMemo(() => ({
        sortable: true,
    }));
    const [simulationLoading, setSimulationLoading] = useState(false);
    const [firstTimeSimulation, setFirstTimeSimulation] = useState(false);

    useEffect(() => {
        mixpanel.track('STARKNET_NEW_INTERCEPTED_SIMULATION', {
            transaction: transaction,
        });
        updateSimulatorData(filterSimulatorKeys({ transaction, network }));
    }, []);

    useEffect(() => {
        if (gridRef && gridRef.current && gridRef.current.api) {
            gridRef.current.api.sizeColumnsToFit();
        }
    }, [gridRef, assetChanges]);

    useEffect(() => {
        const newTransaction =
            interceptedTransaction.walletMessage[0][transactionIndex];
        setTransaction(newTransaction);
        setSimulatorData(
            filterSimulatorKeys({ transaction: newTransaction, network })
        );
        setDecodedInputData('{}');
        setContractFunctionName(false);
    }, [transactionIndex]);

    useEffect(() => {
        (async () => {
            if (_.isEmpty(transaction)) return;

            setIsDecodingInput(true);

            const { abi, decodedInput, functionData, failedDecode } =
                await getInputDataWithoutAbi({
                    network,
                    transaction: transaction,
                    transactionIndex,
                });
            setIsDecodingInput(false);
            if (!abi) return;
            if (failedDecode) {
                log.debug('failed to decode input');
                setInputDecodeFailed(true);
                setDecodedInputData(
                    JSON.stringify(
                        { success: false, reason: 'failed to decode input' },
                        null,
                        4
                    )
                );
                return;
            }
            setInputDecodeFailed(false);
            setContractAbi(abi);

            log.debug('this is the decoded input - ', decodedInput);
            setDecodedInputData(JSON.stringify(decodedInput, null, 4));
            setContractFunctionName(functionData.name);
        })();
    }, [transaction]);

    //get asset changes on load
    useEffect(() => {
        log.debug(
            'going to get first tiem - ',
            simulatorData,
            firstTimeSimulation
        );
        if (firstTimeSimulation) return;
        if (_.isEmpty(JSON.parse(simulatorData))) return;
        simulate();
        setFirstTimeSimulation(true);
    }, [simulatorData]);

    const updateSimulatorData = (data) => {
        setSimulatorData(data);
        dispatch(
            setCurrentSimulationWalletMessage({
                index: transactionIndex,
                newMessage: typeof data == 'string' ? JSON.parse(data) : data,
            })
        );
    };

    const decodedInputChange = (code) => {
        if (inputDecodeFailed) return;
        let data = JSON.parse(simulatorData);
        data.calldata = getOutputDataFromInput({
            functionName: contractFunctionName,
            inputStr: code,
            abi: contractAbi,
            network,
        });
        setDecodedInputData(code);
        updateSimulatorData(JSON.stringify(data, null, 4));
    };

    const simulate = async (type) => {
        let simulatorDataJson = JSON.parse(simulatorData);
        mixpanel.track('STARKNET_SIMULATE_TRANSACTION', {
            type: type,
            simulatorData: simulatorDataJson,
        });

        let response;
        try {
            response = await transactions.simulateTransaction({
                network,
                interceptedTransaction,
            });
        } catch (err) {
            log.error(err);
            response = {
                data: {
                    success: false,
                    errorCode:
                        'Failed to simulate transaction. There seem to be an issue with our code, we will fix it ASAP!',
                    simulation: {
                        formattedEvents: [],
                        raw: {
                            success: false,
                            message:
                                'Failed to simulate transaction. There seem to be an issue with our code, we will fix it ASAP!',
                        },
                    },
                },
            };
        }

        setSimulationStatus({
            success: response.data.success,
            errorMessage: response.data.errorCode,
        });
        setAssetChanges(response.data.simulation.formattedEvents);
        setSimulationResults(
            JSON.stringify(response.data.simulation.raw, null, 4)
        );
        return response.data;
    };

    const simulateTransaction = async () => {
        mixpanel.track('STARKNET_SIMULATE_TRANSACTION_CLICK');
        setSimulationLoading(true);
        showLoadingOverlayAssetChanges();
        let promises = [simulate()];
        await Promise.all(promises);
        hideLoadingOverlayAssetChanges();
        setSimulationLoading(false);
    };

    const showLoadingOverlayAssetChanges = () => {
        if (gridRef && gridRef.current && gridRef.current.api) {
            gridRef.current.api.showLoadingOverlay();
        }
    };

    const hideLoadingOverlayAssetChanges = () => {
        if (gridRef && gridRef.current && gridRef.current.api) {
            gridRef.current.api.hideOverlay();
        }
    };

    const handleSimulatorClose = async () => {
        mixpanel.track('STARKNET_SIMULATOR_CLOSED');
        if (!interceptedTransaction) {
            closeSimulator();
            return;
        }
        window.close();
    };

    const continueToWallet = async () => {
        log.debug('inside continueToWallet');
        let simulationDataJson = JSON.parse(simulatorData);
        mixpanel.track('STARKNET_FORWARD_SIMULATION_TO_WALLET', {
            simulatorData: simulationDataJson,
        });

        await updateWalletMessageAndState(
            interceptedTransaction.id,
            interceptedTransaction.walletMessage,
            SimulationState.Confirmed
        );
        handleSimulatorClose();
    };

    const incrementTransactionIndex = () => {
        if (
            transactionIndex ==
            interceptedTransaction?.walletMessage[0].length - 1
        ) {
            return;
        }
        dispatch(setCurrentSimulationTransactionIndex(transactionIndex + 1));
    };

    const decrementTransactionIndex = () => {
        if (transactionIndex == 0) {
            return;
        }
        dispatch(setCurrentSimulationTransactionIndex(transactionIndex - 1));
    };

    return (
        <>
            <OpacityContainer></OpacityContainer>
            <SimulatorContainer fullScreen={fullScreen}>
                <HeadingRow>
                    <HeadingText>Transaction Simulator</HeadingText>
                    <HeadingRowRightContainer>
                        {interceptedTransaction?.walletMessage[0].length >
                            1 && (
                            <TransactionPageContainer>
                                <TransactionPageChangeCaret
                                    icon={faCaretLeft}
                                    size="xs"
                                    onClick={decrementTransactionIndex}
                                ></TransactionPageChangeCaret>
                                <TransactionPage>
                                    {transactionIndex + 1}/
                                    {
                                        interceptedTransaction?.walletMessage[0]
                                            .length
                                    }
                                </TransactionPage>
                                <TransactionPageChangeCaret
                                    icon={faCaretRight}
                                    size="xs"
                                    onClick={incrementTransactionIndex}
                                ></TransactionPageChangeCaret>
                            </TransactionPageContainer>
                        )}
                        <SimulateButton
                            isLoading={simulationLoading}
                            onClick={simulateTransaction}
                            interceptedTransaction={Boolean(
                                interceptedTransaction
                            )}
                        >
                            {simulationLoading ? <Loader /> : 'SIMULATE'}
                        </SimulateButton>
                        {interceptedTransaction && (
                            <ForwardToWalletButton onClick={continueToWallet}>
                                <ForwardButtonImage
                                    src={
                                        network.includes('solana')
                                            ? PhantomLogo
                                            : ArgentXLogo
                                    }
                                />
                                <FontAwesomeIcon icon={faPlay} />
                            </ForwardToWalletButton>
                        )}

                        <CloseIcon
                            onClick={handleSimulatorClose}
                            src={cross}
                        ></CloseIcon>
                    </HeadingRowRightContainer>
                </HeadingRow>
                <DetailsScrollContainer>
                    <Subheading>All Details</Subheading>
                    <TransactionDetailsContainer>
                        {Object.entries(transaction)
                            .filter(([_, value]) => value)
                            .map(([key, value]) => {
                                let valueStr = JSON.stringify(value);
                                return (
                                    <TransactionDetail
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                valueStr
                                            );
                                        }}
                                    >
                                        <TransactionDetailKey>
                                            {key}:{' '}
                                        </TransactionDetailKey>
                                        <TransactionDetailValue>
                                            {valueStr.length > 20
                                                ? valueStr.substring(0, 10) +
                                                  '...' +
                                                  valueStr.substring(
                                                      valueStr.length - 10,
                                                      valueStr.length
                                                  )
                                                : valueStr}
                                        </TransactionDetailValue>
                                        <CopyIcon
                                            icon={faCopy}
                                            color="#898989"
                                            size="sm"
                                        />
                                    </TransactionDetail>
                                );
                            })}
                    </TransactionDetailsContainer>
                    <Subheading style={{ marginTop: '3vh' }}>
                        Basic Simulation (asset changes)
                    </Subheading>
                    {simulationStatus && (
                        <TransactionDetailsContainer
                            style={{ flexDirection: 'column' }}
                        >
                            <TransactionDetail>
                                <TransactionDetailKey>
                                    Success:
                                </TransactionDetailKey>
                                <TransactionDetailValue>
                                    {simulationStatus.success ? '✅' : '❌'}
                                </TransactionDetailValue>
                            </TransactionDetail>
                            {!simulationStatus.success && (
                                <TransactionDetail style={{ width: '100%' }}>
                                    {' '}
                                    <TransactionDetailKey>
                                        Error message:
                                    </TransactionDetailKey>
                                    <TransactionDetailValue>
                                        {simulationStatus.errorMessage}
                                    </TransactionDetailValue>
                                </TransactionDetail>
                            )}
                        </TransactionDetailsContainer>
                    )}
                    <SimulationTable className="ag-theme-alpine-dark">
                        <AgGridReact
                            ref={gridRef} // Ref for accessing Grid's API
                            rowData={assetChanges} // Row Data for Rows
                            columnDefs={columnDefs} // Column Defs for Columns
                            defaultColDef={defaultColDef} // Default Column Properties
                            animateRows={true} // Optional - set to 'true' to have rows animate when sorted
                            rowSelection="multiple" // Options - allows click selection of rows
                            getRowStyle={(params) => {
                                return {
                                    background: params.data.color,
                                };
                            }}
                            enableCellTextSelection={true}
                        />
                    </SimulationTable>

                    <Subheading style={{ marginTop: '3vh' }}>
                        Input Decoded
                        {isDecodingInput && <DecodeLoader />}
                    </Subheading>
                    {!inputDecodeFailed && (
                        <FunctionName>{contractFunctionName}()</FunctionName>
                    )}
                    <EditorContainer
                        style={{ marginTop: inputDecodeFailed ? '2%' : '0%' }}
                    >
                        <Editor
                            value={decodedInputData}
                            key={
                                _.isPlainObject(decodedInputData) &&
                                _.isEmpty(JSON.parse(decodedInputData))
                                    ? 'emptyDecodedInput'
                                    : 'filledDecodedInput'
                            }
                            onValueChange={decodedInputChange}
                            highlight={(code) => highlight(code, languages.js)}
                            padding={10}
                            style={{
                                ...EditorStyles,
                            }}
                            inputDecodeFailed={inputDecodeFailed}
                        />
                    </EditorContainer>

                    <Subheading style={{ marginTop: '3vh' }}>
                        Transaction Details
                    </Subheading>
                    <EditorContainer style={{ marginTop: '2%' }}>
                        <Editor
                            value={simulatorData}
                            onValueChange={(code) => {
                                updateSimulatorData(code);
                            }}
                            highlight={(code) => highlight(code, languages.js)}
                            padding={10}
                            style={{
                                ...EditorStyles,
                            }}
                        />
                    </EditorContainer>

                    <Subheading style={{ marginTop: '3vh' }}>
                        Detailed Simulation
                    </Subheading>
                    <EditorContainer style={{ marginTop: '2%' }}>
                        <Editor
                            value={simulationResults}
                            onValueChange={() => {}}
                            highlight={(code) => highlight(code, languages.js)}
                            padding={10}
                            style={{
                                ...EditorStyles,
                            }}
                        />
                    </EditorContainer>
                </DetailsScrollContainer>
            </SimulatorContainer>
        </>
    );
};

export default TransactionSimulatorStarknet;
