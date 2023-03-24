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
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS, always needed
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Optional theme CSS
import TransactionSimulator from './TransactionSimulator';

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
  const [navbarItems, setNavbarItems] = useState([
    {
      title: 'Transactions',
    },
    {
      title: 'ERC-20 Transactions',
    },
  ]);

  // Each Column Definition results in one Column.
  const [columnDefs, setColumnDefs] = useState([
    { field: 'hash', filter: true },
    { field: 'methodId', filter: true },
    { field: 'blockNumber', filter: true },
    { field: 'timeStamp', filter: true },
    { field: 'from', filter: true },
    { field: 'to', filter: true },
    { field: 'value', filter: true },
    { field: 'gasUsed', filter: true },
    { field: 'nonce', filter: true },
    { field: 'blockHash', filter: true },
    { field: 'transactionIndex', filter: true },
    { field: 'gas', filter: true },
    { field: 'gasPrice', filter: true },
    { field: 'isError', filter: true },
    { field: 'txreceipt_status', filter: true },
    { field: 'input', filter: true },
    { field: 'contractAddress', filter: true },
    { field: 'cumulativeGasUsed', filter: true },
    { field: 'confirmations', filter: true },
    { field: 'functionName', filter: true },
  ]);

  const [columnDefsERC20, setColumnDefsERC20] = useState([
    { field: 'hash', filter: true },
    { field: 'timeStamp', filter: true },
    { field: 'from', filter: true },
    { field: 'to', filter: true },
    { field: 'value', filter: true },
    { field: 'tokenSymbol', filter: true },
    { field: 'tokenName', filter: true },
    { field: 'blockNumber', filter: true },
    { field: 'nonce', filter: true },
    { field: 'blockHash', filter: true },
    { field: 'transactionIndex', filter: true },
    { field: 'contractAddress', filter: true },
    { field: 'tokenDecimal', filter: true },
    { field: 'gas', filter: true },
    { field: 'gasPrice', filter: true },
    { field: 'isError', filter: true },
    { field: 'txreceipt_status', filter: true },
    { field: 'input', filter: true },
    { field: 'contractAddress', filter: true },
    { field: 'cumulativeGasUsed', filter: true },
    { field: 'gasUsed', filter: true },
    { field: 'confirmations', filter: true },
    { field: 'methodId', filter: true },
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
    fetch(
      `https://api.polygonscan.com/api?module=account&action=${
        navbarSelected == 0 ? 'txlist' : 'tokentx'
      }&address=0x1Fb8B18101194AdB78E0737b7E15087d2296dC1a&startblock=0&endblock=999999999999&page=1&offset=10000&sort=desc&apikey=DDZ33H8RZYENMTDX5KCM67FW1HBJD5CRUC`
    )
      .then((result) => result.json())
      .then((rowData) => setRowData(rowData.result));
  }, [navbarSelected]);

  // Example using Grid's API
  const buttonListener = useCallback((e) => {
    // gridRef.current.columnApi.setColumnVisible('blockNumber', false);
    // gridRef.current.api.deselectAll();
  }, []);
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
      </NavbarContainer>
      <TransactionsTable className="ag-theme-alpine-dark">
        <AgGridReact
          ref={gridRef} // Ref for accessing Grid's API
          rowData={rowData} // Row Data for Rows
          columnDefs={navbarSelected == 0 ? columnDefs : columnDefsERC20} // Column Defs for Columns
          defaultColDef={defaultColDef} // Default Column Properties
          animateRows={true} // Optional - set to 'true' to have rows animate when sorted
          rowSelection="multiple" // Options - allows click selection of rows
          onCellClicked={cellClickedListener} // Optional - registering for Grid Event
          sideBar={true}
        />
      </TransactionsTable>
      {isSimulatorOpen && (
        <TransactionSimulator
          transaction={simulatorTransaction}
          closeSimulator={() => setIsSimulatorOpen(false)}
        ></TransactionSimulator>
      )}
    </TransactionContainer>
  );
};

export default Transactions;
