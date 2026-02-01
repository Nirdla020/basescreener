export type Donation = {
  name: string;     // display name (or "Anonymous")
  wallet: string;   // donor wallet
  amount: string;   // e.g. "10 USDC", "0.05 ETH"
  chain: string;    // e.g. "Base", "Ethereum"
};

export const DONATIONS: Donation[] = [
  // Example entries (delete these if you want)
  // { name: "Anonymous", wallet: "0x1111111111111111111111111111111111111111", amount: "5 USDC", chain: "Base" },
  // { name: "TraderMike", wallet: "0x2222222222222222222222222222222222222222", amount: "0.01 ETH", chain: "Ethereum" },
];
