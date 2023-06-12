export interface TransactionV1 {
    signatures: any;
    message: Message;
}

interface Message {
    header: Header;
    accountKeys: string[];
    recentBlockhash: string;
    instructions: InstructionsItem[];
    indexToProgramIds: IndexToProgramIds;
}
interface Header {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
}
interface InstructionsItem {
    programIdIndex: number;
    accounts: number[];
    data: string;
}

interface IndexToProgramIds {}
