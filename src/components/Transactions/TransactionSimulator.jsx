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
import { getInputDataWithoutAbi } from '../../services/transactions';
import { getTransaction } from '../../services/scan';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectCurrentSimulation,
    selectNetwork,
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
import { faCopy, faPlay } from '@fortawesome/free-solid-svg-icons';
import MetamaskImage from '../../assets/img/metamask.png';
import mixpanel from 'mixpanel-browser';

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
    width: calc(100% - 30px);
    left: 0;
    position: absolute;
    top: 0;
    padding: 15px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
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
    /* margin-top: 3vh; */
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
    font-family: GilmerMedium;
    /* padding-top: 7px;
    padding-bottom: 5px; */
    height: 32px;
    padding-left: 20px;
    padding-right: 20px;
    margin-right: 20px;
    cursor: pointer;
    width: ${(props) => (props.interceptedTransaction ? '25%' : '40%')};
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
    /* padding-top: 7px;
    padding-bottom: 5px; */
    height: 32px;
    padding-left: 20px;
    padding-right: 20px;
    margin-right: 20px;
    cursor: pointer;
    width: 12%;
    justify-content: space-around;
    display: flex;
    align-items: center;

    @media (min-width: 900px) {
        font-size: 2vh;
    }
`;

const ForwardButtonImage = styled.img`
    width: 30px;
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

const EditorStyles = {
    fontFamily: '"Fira code", "Fira Mono", monospace',
    fontSize: 12,
    backgroundColor: 'black',
    width: '90%',
    caretColor: 'white',
    width: '100%',
};

const simulationKeys = {
    from: { convertToNumber: false },
    to: { convertToNumber: false },
    value: { convertToNumber: true },
    data: { convertToNumber: false },
    gas: { convertToNumber: true },
    gasPrice: { convertToNumber: true },
};

const simulationEventConfiguation = {
    TransferIn: {
        displayName: 'Transfer to wallet',
        rowColor: '#00ff0026',
    },
    TransferOut: {
        displayName: 'Transfer from wallet',
        rowColor: '#ff000040',
    },
    ApprovalForAll: {
        displayName: 'Token Approval',
        rowColor: '#ffd70040',
    },
};

const filterSimulatorKeys = (obj) => {
    let data = {};
    Object.entries(obj)
        .filter(([key, value]) => Object.keys(simulationKeys).includes(key))
        .map(([key, value]) => {
            data[key] = !simulationKeys[key].convertToNumber
                ? value
                : Number(value);
        });
    return JSON.stringify(data, null, 4);
};

const TransactionSimulator = ({
    closeSimulator,
    hash,
    interceptedTransaction,
    fullScreen,
}) => {
    const [simulatorData, setSimulatorData] = useState('{}');
    const [decodedInputData, setDecodedInputData] = useState('{}');
    const [contractFunctionName, setContractFunctionName] = useState(false);
    const [contractAbi, setContractAbi] = useState([]);
    const [simulationResults, setSimulationResults] = useState('{}');
    const [inputDecodeFailed, setInputDecodeFailed] = useState(false);
    const [manualImplementationAddress, setManualImplementationAddress] =
        useState(false);
    const [transaction, setTransaction] = useState({});
    const network = useSelector(selectNetwork);
    const [assetChanges, setAssetChanges] = useState();
    const [simulationStatus, setSimulationStatus] = useState(false);
    const gridRef = useRef();
    const dispatch = useDispatch();
    const [columnDefs, setColumnDefs] = useState([
        {
            field: 'Token',
            cellRenderer: (params) => {
                return (
                    <CellImageAndText
                        img={params.data.image}
                        text={params.data.name}
                    ></CellImageAndText>
                );
            },
            resizable: true,
        },
        {
            field: 'Type',
            valueFormatter: (params) => {
                if (simulationEventConfiguation[params.data.type]) {
                    return simulationEventConfiguation[params.data.type]
                        .displayName;
                }
                return 'Unknown';
            },
            resizable: true,
        },
        {
            field: 'Value',
            valueFormatter: (params) => {
                if (params.data.tokenType == 'ERC721') return 1;
                return Number(params.data.amount) / 10 ** params.data.decimals;
            },
            resizable: true,
        },
    ]);
    const tenderlyApiKey = useSelector(selectSettingWithKey('tenderlyApiKey'));
    const tenderlyUsername = useSelector(
        selectSettingWithKey('tenderlyUsername')
    );
    const tenderlyProjectName = useSelector(
        selectSettingWithKey('tenderlyProjectName')
    );
    const defaultColDef = useMemo(() => ({
        sortable: true,
    }));
    const [simulationLoading, setSimulationLoading] = useState(false);
    const [firstTimeSimulation, setFirstTimeSimulation] = useState(false);
    const currentSimulation = useSelector(selectCurrentSimulation);

    //setting transaction details
    useEffect(() => {
        (async () => {
            if (interceptedTransaction) {
                let mappedTransaction =
                    interceptedTransaction.walletMessage.params[0];
                setTransaction(mappedTransaction);
                mixpanel.track('NEW_INTERCEPTED_SIMULATION', {
                    transaction: mappedTransaction,
                });
                return;
            }
            let txResponse = await getTransaction(network, hash);
            if (typeof txResponse.result != 'object') {
                mixpanel.track('FAILED_TRANSACTION_GET', {
                    transaction: txResponse,
                });
                return;
            }

            mixpanel.track('NEW_TRANSACTION_SIMULATION', {
                transaction: txResponse.result,
            });
            setTransaction({
                ...txResponse.result,
                data: txResponse.result.input,
            });
        })();
    }, []);

    useEffect(() => {
        if (gridRef && gridRef.current && gridRef.current.api) {
            gridRef.current.api.sizeColumnsToFit();
        }
    }, [gridRef, assetChanges]);

    useEffect(() => {
        (async () => {
            setSimulatorData(filterSimulatorKeys(transaction));

            const { abi, decodedInput, functionData, failedDecode } =
                await getInputDataWithoutAbi({
                    to: manualImplementationAddress || transaction.to,
                    data: transaction.data,
                    chainId: NETWORK_CONFIG[network].chainId,
                    network,
                });
            if (!abi) return;
            if (failedDecode) {
                console.log('failed to decode input');
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
            setDecodedInputData(JSON.stringify(decodedInput, null, 4));
            setContractFunctionName(functionData.name);
        })();
    }, [manualImplementationAddress, transaction]);

    //get asset changes on load
    useEffect(() => {
        if (firstTimeSimulation) return;
        if (!JSON.parse(simulatorData).from) return;
        getAssetChanges();
        setFirstTimeSimulation(true);
    }, [simulatorData]);

    const decodedInputChange = (code) => {
        if (inputDecodeFailed) return;
        let data = JSON.parse(simulatorData);
        try {
            let contractInterface = new ethers.Interface(contractAbi);
            let inputEncoded = contractInterface.encodeFunctionData(
                contractFunctionName,
                Object.values(JSON.parse(code))
            );
            data.data = inputEncoded;
        } catch (err) {
            data.data = 'invalid_input';
        }
        setDecodedInputData(code);
        setSimulatorData(JSON.stringify(data, null, 4));
    };

    const simulate = async (type) => {
        let simulatorDataJson = JSON.parse(simulatorData);
        mixpanel.track('SIMULATE_TRANSACTION', {
            type: type,
            simulatorData: simulatorDataJson,
        });
        const response = await axios.post(
            `${process.env.REACT_APP_BACKEND_BASE_URL}/v1/simulator/simulate`,
            {
                chainId: NETWORK_CONFIG[network].chainId,
                from: simulatorDataJson.from,
                to: simulatorDataJson.to,
                gas: simulatorDataJson.gas,
                data: simulatorDataJson.data,
                simulatorType: type,
                ...(type == 'DETAILED'
                    ? { tenderlyApiKey, tenderlyUsername, tenderlyProjectName }
                    : {}),
                ...(simulatorDataJson.value
                    ? {
                          value: `0x${Number(simulatorDataJson.value).toString(
                              16
                          )}`,
                      }
                    : {}),
            }
        );
        return response.data;
    };

    const getDetailedSimulation = async () => {
        try {
            if (!tenderlyApiKey) {
                setSimulationResults(
                    JSON.stringify(
                        {
                            message:
                                'Enter your tenderly API key from the settings page to get a detailed simulation',
                        },
                        null,
                        4
                    )
                );
                return;
            }
            let response = await simulate('DETAILED');
            setSimulationResults(JSON.stringify(response, null, 4));
        } catch (err) {
            console.error('Failed to simulate transaction - ', err);
            setSimulationResults(JSON.stringify(err.response.data, null, 4));
        }
    };

    const getAssetChanges = async () => {
        showLoadingOverlayAssetChanges();
        try {
            let response = await simulate('ASSET_CHANGES');
            setSimulationStatus({
                success: response.success,
                errorMessage: response.errorMessage,
            });
            if (response.success) {
                setAssetChanges(response.simulation.events);
            } else {
                throw 'Simulation failed';
            }
        } catch (err) {
            setAssetChanges([]);
        }
        hideLoadingOverlayAssetChanges();
    };

    const simulateTransaction = async () => {
        mixpanel.track('SIMULATE_TRANSACTION_CLICK');
        setSimulationLoading(true);
        let promises = [getDetailedSimulation(), getAssetChanges()];
        await Promise.all(promises);
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
        mixpanel.track('SIMULATOR_CLOSED');
        if (!interceptedTransaction) {
            closeSimulator();
            return;
        }
        window.close();
    };

    const continueToWallet = async () => {
        console.log('inside continueToWallet');
        let simulationDataJson = JSON.parse(simulatorData);
        mixpanel.track('FORWARD_SIMULATION_TO_WALLET', {
            simulatorData: simulationDataJson,
        });
        let newParams = {};

        Object.entries(simulationDataJson).map(([key, value]) => {
            if (simulationKeys[key].convertToNumber) {
                newParams[key] = `0x${Number(value).toString(16)}`;
            } else {
                newParams[key] = value;
            }
        });

        let newWalletMessage = { ...currentSimulation.walletMessage };
        newWalletMessage.params = [newParams];

        console.log('this is new wallet - ', newWalletMessage);
        await updateWalletMessageAndState(
            currentSimulation.id,
            newWalletMessage,
            SimulationState.Confirmed
        );
        handleSimulatorClose();
    };

    return (
        <>
            <OpacityContainer></OpacityContainer>
            <SimulatorContainer fullScreen={fullScreen}>
                <HeadingRow>
                    <HeadingText>Transaction Simulator</HeadingText>
                    <HeadingRowRightContainer>
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
                                <ForwardButtonImage src={MetamaskImage} />
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
                            .map(([key, value]) => (
                                <TransactionDetail
                                    onClick={() => {
                                        navigator.clipboard.writeText(value);
                                    }}
                                >
                                    <TransactionDetailKey>
                                        {key}:{' '}
                                    </TransactionDetailKey>
                                    <TransactionDetailValue>
                                        {value.length > 20
                                            ? value.substring(0, 10) +
                                              '...' +
                                              value.substring(
                                                  value.length - 10,
                                                  value.length
                                              )
                                            : value}
                                    </TransactionDetailValue>
                                    <CopyIcon
                                        icon={faCopy}
                                        color="#898989"
                                        size="sm"
                                    />
                                </TransactionDetail>
                            ))}
                    </TransactionDetailsContainer>
                    <Subheading style={{ marginTop: '3vh' }}>
                        Basic Simulation
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
                                if (
                                    simulationEventConfiguation[
                                        params.data.type
                                    ]
                                ) {
                                    return {
                                        background:
                                            simulationEventConfiguation[
                                                params.data.type
                                            ].rowColor,
                                    };
                                }
                            }}
                        />
                    </SimulationTable>
                    <Subheading style={{ marginTop: '3vh' }}>
                        Transaction Details
                    </Subheading>
                    <Editor
                        value={simulatorData}
                        onValueChange={(code) => {
                            setSimulatorData(code);
                        }}
                        highlight={(code) => highlight(code, languages.js)}
                        padding={10}
                        style={{
                            ...EditorStyles,
                            marginTop: '2%',
                        }}
                    />
                    <Subheading style={{ marginTop: '3vh' }}>
                        Input Decoded
                    </Subheading>
                    {!inputDecodeFailed && (
                        <FunctionName>{contractFunctionName}()</FunctionName>
                    )}
                    <Editor
                        value={decodedInputData}
                        onValueChange={decodedInputChange}
                        highlight={(code) => highlight(code, languages.js)}
                        padding={10}
                        style={{
                            ...EditorStyles,
                            marginTop: inputDecodeFailed ? '2%' : '0%',
                        }}
                        inputDecodeFailed={inputDecodeFailed}
                    />
                    {inputDecodeFailed && (
                        <DecodeErrorContainer>
                            <DecodeErrorMessage>
                                Is the{' '}
                                <DecodeErrorMessageHyperlink
                                    href={`https://${NETWORK_CONFIG[
                                        network
                                    ].scanBaseUrl.replace(
                                        'api.',
                                        ''
                                    )}/address/${transaction.to}`}
                                    target="_blank"
                                >
                                    to
                                </DecodeErrorMessageHyperlink>{' '}
                                address a proxy contract? Decode the input by
                                specifying the actual address.
                            </DecodeErrorMessage>
                            <ImplementationContractInputContainer>
                                <ImplementationContractInput
                                    onChange={(e) =>
                                        setManualImplementationAddress(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter proxy address"
                                ></ImplementationContractInput>
                            </ImplementationContractInputContainer>
                        </DecodeErrorContainer>
                    )}
                    <Subheading style={{ marginTop: '3vh' }}>
                        Detailed Simulation
                    </Subheading>
                    <Editor
                        value={simulationResults}
                        onValueChange={() => {}}
                        highlight={(code) => highlight(code, languages.js)}
                        padding={10}
                        style={{
                            ...EditorStyles,
                            marginTop: '2%',
                        }}
                    />
                </DetailsScrollContainer>
            </SimulatorContainer>
        </>
    );
};

export default TransactionSimulator;
