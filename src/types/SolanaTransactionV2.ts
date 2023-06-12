export interface TransactionV2 {
    feePayer: string;
    instructions: InstructionsItem[];
    nonceInfo: null;
    recentBlockhash: string;
    signers: string[];
}

interface InstructionsItem {
    data: number[];
    keys: KeysItem[];
    programId: string;
}
interface KeysItem {
    isSigner: boolean;
    isWritable: boolean;
    pubkey: string;
}
