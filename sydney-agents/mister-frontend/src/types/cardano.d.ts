// Cardano Wallet TypeScript Declarations

declare global {
  interface Window {
    cardano?: {
      nami?: {
        enable(): Promise<CardanoWalletApi>;
        isEnabled(): Promise<boolean>;
        name: string;
        icon: string;
      };
      eternl?: {
        enable(): Promise<CardanoWalletApi>;
        isEnabled(): Promise<boolean>;
        name: string;
        icon: string;
      };
      flint?: {
        enable(): Promise<CardanoWalletApi>;
        isEnabled(): Promise<boolean>;
        name: string;
        icon: string;
      };
      typhon?: {
        enable(): Promise<CardanoWalletApi>;
        isEnabled(): Promise<boolean>;
        name: string;
        icon: string;
      };
      [key: string]: any;
    };
  }
}

interface CardanoWalletApi {
  getNetworkId(): Promise<number>;
  getUtxos(): Promise<string[]>;
  getBalance(): Promise<string>;
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  getRewardAddresses(): Promise<string[]>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  signData(addr: string, payload: string): Promise<{ signature: string; key: string }>;
  submitTx(tx: string): Promise<string>;
  getCollateral(): Promise<string[]>;
}

export {};
