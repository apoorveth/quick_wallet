import React, {
    useState,
    useRef,
    useEffect,
    useMemo,
    useCallback,
} from 'react';
import styled, { css } from 'styled-components';
import { render } from 'react-dom';
import { AgGridReact } from 'ag-grid-react'; // the AG Grid React Component
import config from '../../config/config.json';
import TransactionSimulator from './TransactionSimulator';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { selectNetwork } from '../../features/walletSlice';
import { getERC20Transactions, getTransactions } from '../../services/scan';
import './Transactions.css';
import CellImageAndText from '../AgGrid/CellImageAndText';

const TransactionContainer = styled.div`
    padding-left: 1rem;
    height: -webkit-fill-available;
    padding-top: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
    overflow: hidden;
`;

const NavbarContainer = styled.div`
    display: flex;
    flex-direction: row;
`;

const NavbarHeading = styled.div`
    text-align: left;
    font-size: 1.2rem;
    margin-right: 1%;

    color: white;
    padding: 0.5% 1.5%;

    ${(props) => {
        if (props.selected) {
            return css`
                background-color: rgb(37 37 37);
                border-radius: 50px;
                border: 1px solid white;
            `;
        }
    }}
    cursor: pointer;
`;

const TransactionsTable = styled.div`
    height: 90%;
    margin-top: 1.5rem;
    /* width: ${config.extensionWidth - 30 + 'px'}; */
`;

const Transactions = () => {
    const gridRef = useRef(); // Optional - for accessing Grid's API
    const [rowData, setRowData] = useState(); // Set rowData to Array of Objects, one Object per Row
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [simulatorTransaction, setSimulatorTransaction] = useState({});
    const [navbarSelected, setNavbarSelected] = useState(1);
    const [walletAddress, setWalletAddress] = useState(
        '0x1Fb8B18101194AdB78E0737b7E15087d2296dC1a'
    );
    const [tokenImages, setTokenImages] = useState({});
    const [navbarItems, setNavbarItems] = useState([
        {
            title: 'Transactions',
        },
        {
            title: 'ERC-20 Transactions',
        },
    ]);
    const network = useSelector(selectNetwork);

    const timeStampFormatter = (value) => {
        return `${new Date(value * 1000).toLocaleString()}`;
    };

    const addressFormatter = (params) => {
        if (!params.value) {
            return;
        }
        if (params.value.toLowerCase() == walletAddress.toLowerCase()) {
            return <div style={{ color: '#7aff92' }}>{params.value}</div>;
        }
        return <div>{params.value}</div>;
    };

    // Each Column Definition results in one Column.
    const [columnDefs, setColumnDefs] = useState([
        { field: 'hash', filter: true, resizable: true },
        { field: 'methodId', filter: true, resizable: true, hide: true },
        { field: 'blockNumber', filter: true, resizable: true, hide: true },
        {
            field: 'timeStamp',
            filter: true,
            resizable: true,
            valueFormatter: (params) => timeStampFormatter(params.value),
            resizable: true,
        },
        {
            field: 'from',
            filter: true,
            resizable: true,
            cellRenderer: addressFormatter,
        },
        {
            field: 'to',
            filter: true,
            resizable: true,
            cellRenderer: addressFormatter,
        },
        {
            field: 'value',
            filter: true,
            resizable: true,
            valueFormatter: (params) => params.value / 10 ** 18,
        },
        { field: 'gasUsed', filter: true, resizable: true },
        { field: 'nonce', filter: true, resizable: true, hide: true },
        { field: 'blockHash', filter: true, resizable: true, hide: true },
        {
            field: 'transactionIndex',
            filter: true,
            resizable: true,
            hide: true,
        },
        { field: 'gas', filter: true, resizable: true, hide: true },
        { field: 'gasPrice', filter: true, resizable: true, hide: true },
        { field: 'isError', filter: true, resizable: true, hide: true },
        {
            field: 'txreceipt_status',
            filter: true,
            resizable: true,
            hide: true,
        },
        { field: 'input', filter: true, resizable: true },
        { field: 'contractAddress', filter: true, resizable: true, hide: true },
        {
            field: 'cumulativeGasUsed',
            filter: true,
            resizable: true,
            hide: true,
        },
        { field: 'confirmations', filter: true, resizable: true, hide: true },
        { field: 'functionName', filter: true, resizable: true },
    ]);

    const [columnDefsERC20, setColumnDefsERC20] = useState([
        {
            field: 'hash',
            filter: true,
            resizable: true,
            enableRowGroup: true,
        },
        {
            field: 'timeStamp',
            filter: true,
            resizable: true,
            valueFormatter: (params) => {
                if (params.value) return timeStampFormatter(params.value);
            },
        },
        {
            field: 'from',
            filter: true,
            resizable: true,
            cellRenderer: addressFormatter,
        },
        {
            field: 'to',
            filter: true,
            resizable: true,
            cellRenderer: addressFormatter,
        },
        {
            field: 'value',
            filter: true,
            resizable: true,
            valueFormatter: (params) => {
                if (params.value)
                    return params.value / 10 ** params.data.tokenDecimal;
            },
        },
        {
            field: 'tokenSymbol',
            filter: true,
            resizable: true,
            cellRenderer: (params) => {
                if (params.value) {
                    return (
                        <CellImageAndText
                            img={params.data.tokenImageUrl}
                            text={params.value}
                        ></CellImageAndText>
                    );
                }
            },
        },
        { field: 'tokenName', filter: true, resizable: true, hide: true },
        { field: 'blockNumber', filter: true, resizable: true, hide: true },
        { field: 'nonce', filter: true, resizable: true, hide: true },
        { field: 'blockHash', filter: true, resizable: true, hide: true },
        {
            field: 'transactionIndex',
            filter: true,
            resizable: true,
            hide: true,
        },
        { field: 'contractAddress', filter: true, resizable: true },
        { field: 'tokenDecimal', filter: true, resizable: true },
        { field: 'gas', filter: true, resizable: true },
        { field: 'gasPrice', filter: true, resizable: true, hide: true },
        { field: 'isError', filter: true, resizable: true, hide: true },
        {
            field: 'txreceipt_status',
            filter: true,
            resizable: true,
            hide: true,
        },
        { field: 'input', filter: true, resizable: true, hide: true },
        {
            field: 'cumulativeGasUsed',
            filter: true,
            resizable: true,
            hide: true,
        },
        { field: 'gasUsed', filter: true, resizable: true, hide: true },
        { field: 'confirmations', filter: true, resizable: true, hide: true },
        { field: 'methodId', filter: true, resizable: true },
    ]);

    // DefaultColDef sets props common to all Columns
    const defaultColDef = useMemo(() => ({
        sortable: true,
    }));

    // Example of consuming Grid Event
    const cellClickedListener = useCallback((event) => {
        console.log('cellClicked', event);
        setIsSimulatorOpen(true);
        setSimulatorTransaction(event.data);
    }, []);

    // Example load data from sever
    useEffect(() => {
        if (navbarSelected == 0) {
            getTransactions(network, walletAddress).then((rowData) =>
                setRowData(rowData.result)
            );
        } else {
            getERC20Transactions(network, walletAddress).then((rowData) =>
                setRowData(
                    rowData.result.map((row) => ({
                        ...row,
                        tokenImageUrl: tokenImages[row.tokenSymbol],
                    }))
                )
            );
        }
    }, [navbarSelected, network, tokenImages]);

    useEffect(() => {
        (async () => {
            let response = await axios.get('https://tokens.uniswap.org/');
            let result = {};
            console.log('this is response from uniswap', response);
            response.data.tokens.forEach((token) => {
                result[token.symbol] = token.logoURI;
            });
            console.log('this os result after the loop - ', result);
            setTokenImages(result);
        })();
    }, []);

    // Example using Grid's API
    const buttonListener = useCallback((e) => {
        // gridRef.current.columnApi.setColumnVisible('blockNumber', false);
        // gridRef.current.api.deselectAll();
    }, []);

    console.log('logging token images - ', tokenImages);
    return (
        <TransactionContainer>
            <NavbarContainer>
                {navbarItems.map((item, index) => (
                    <NavbarHeading
                        onClick={() => {
                            setNavbarSelected(index);
                        }}
                        selected={index == navbarSelected}
                    >
                        {item.title}
                    </NavbarHeading>
                ))}
                <FontAwesomeIcon
                    style={{ color: 'white', cursor: 'pointer' }}
                    icon={faUpRightFromSquare}
                    onClick={() =>
                        window.open(
                            `chrome-extension://${chrome.runtime.id}/Popup.html`,
                            '_blank'
                        )
                    }
                />
            </NavbarContainer>
            <TransactionsTable className="ag-theme-alpine-dark">
                <AgGridReact
                    ref={gridRef} // Ref for accessing Grid's API
                    rowData={rowData} // Row Data for Rows
                    columnDefs={
                        navbarSelected == 0 ? columnDefs : columnDefsERC20
                    } // Column Defs for Columns
                    defaultColDef={defaultColDef} // Default Column Properties
                    animateRows={true} // Optional - set to 'true' to have rows animate when sorted
                    rowSelection="multiple" // Options - allows click selection of rows
                    onCellClicked={cellClickedListener} // Optional - registering for Grid Event
                    // sideBar={true}
                    // rowGroupPanelShow={navbarSelected == 0 ? 'never' : 'always'}
                />
            </TransactionsTable>
            {isSimulatorOpen && (
                <TransactionSimulator
                    hash={simulatorTransaction.hash}
                    closeSimulator={() => setIsSimulatorOpen(false)}
                ></TransactionSimulator>
            )}
        </TransactionContainer>
    );
};

export default Transactions;
