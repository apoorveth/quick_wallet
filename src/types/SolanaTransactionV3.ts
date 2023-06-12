interface TransactionV3 {
    message: Message;
}
interface Message {
    addressTableLookups: AddressTableLookupsItem[];
    compiledInstructions: CompiledInstructionsItem[];
    header: Header;
    recentBlockhash: string;
    staticAccountKeys: string[];
}
interface AddressTableLookupsItem {
    accountKey: string;
    readonlyIndexes: number[];
    writableIndexes: number[];
}
interface CompiledInstructionsItem {
    accountKeyIndexes: number[];
    data: Data;
    programIdIndex: number;
}
interface Data {
    [name: string]: string;
}
interface Header {
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
    numRequiredSignatures: number;
}
