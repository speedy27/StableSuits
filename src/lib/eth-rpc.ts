const RPC_URL = "https://ethereum.publicnode.com";
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const UNISWAP_USDC_USDT_POOL = "0x3416cF6C708Da44DB2624D63ea0AAef7113527C6";

const CHAINLINK_USDC_USD = "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_TOPIC = "0x0000000000000000000000000000000000000000000000000000000000000000";

let _rpcId = 1;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: _rpcId++ }),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(`RPC error [${method}]: ${json.error.message}`);
  return json.result as T;
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

function hexToNum(hex: string): number {
  return Number(BigInt(hex));
}

export interface MintBurnEvent {
  blockNumber: number;
  txHash: string;
  amount: number;
  type: "mint" | "burn";
}

export interface ChainlinkPrice {
  price: number;
  updatedAt: number;
  roundId: string;
}

export interface OnchainSnapshot {
  blockNumber: number;
  fetchedAt: number;
  supplyRaw: string;
  supply: number;
  dexPrice: number;
  chainlink: ChainlinkPrice;
  recentMints: MintBurnEvent[];
  recentBurns: MintBurnEvent[];
  net500BlockMint: number;
}

export async function getLatestBlock(): Promise<number> {
  const hex = await rpc<string>("eth_blockNumber", []);
  return hexToNum(hex);
}

export async function getUsdcSupply(): Promise<{ raw: string; units: number }> {
  const hex = await rpc<string>("eth_call", [
    { to: USDC_CONTRACT, data: "0x18160ddd" },
    "latest",
  ]);
  const raw = hexToBigInt(hex);
  return { raw: raw.toString(), units: Number(raw) / 1e6 };
}

export async function getUniswapDexPrice(): Promise<number> {
  const hex = await rpc<string>("eth_call", [
    { to: UNISWAP_USDC_USDT_POOL, data: "0x3850c7bd" },
    "latest",
  ]);
  const sqrtPriceX96 = BigInt("0x" + hex.slice(2, 66));
  const q96 = BigInt(2) ** BigInt(96);
  const priceScaled = Number((sqrtPriceX96 * sqrtPriceX96 * BigInt(1e12)) / (q96 * q96));
  return priceScaled / 1e12;
}

export async function getChainlinkPrice(): Promise<ChainlinkPrice> {
  const hex = await rpc<string>("eth_call", [
    { to: CHAINLINK_USDC_USD, data: "0xfeaf968c" },
    "latest",
  ]);
  const raw = hex.slice(2);
  const roundId   = BigInt("0x" + raw.slice(0, 64));
  const answer    = BigInt("0x" + raw.slice(64, 128));
  const updatedAt = Number(BigInt("0x" + raw.slice(192, 256)));
  return {
    price: Number(answer) / 1e8,
    updatedAt,
    roundId: roundId.toString(),
  };
}

interface RawLog {
  blockNumber: string;
  transactionHash: string;
  topics: string[];
  data: string;
}

async function getTransferLogs(
  fromBlock: string,
  fromTopic: string | null,
  toTopic: string | null,
): Promise<RawLog[]> {
  return rpc<RawLog[]>("eth_getLogs", [
    {
      address: USDC_CONTRACT,
      topics: [TRANSFER_TOPIC, fromTopic, toTopic],
      fromBlock,
      toBlock: "latest",
    },
  ]);
}

function logsToEvents(logs: RawLog[], type: "mint" | "burn"): MintBurnEvent[] {
  return logs.map((l) => ({
    blockNumber: hexToNum(l.blockNumber),
    txHash: l.transactionHash,
    amount: Number(hexToBigInt(l.data)) / 1e6,
    type,
  }));
}

export async function fetchOnchainSnapshot(): Promise<OnchainSnapshot> {
  const [latestBlock, supplyData, dexPrice, chainlink] = await Promise.all([
    getLatestBlock(),
    getUsdcSupply(),
    getUniswapDexPrice(),
    getChainlinkPrice(),
  ]);

  const fromBlock = "0x" + (latestBlock - 500).toString(16);

  const [mintLogs, burnLogs] = await Promise.all([
    getTransferLogs(fromBlock, ZERO_TOPIC, null),
    getTransferLogs(fromBlock, null, ZERO_TOPIC),
  ]);

  const recentMints = logsToEvents(mintLogs, "mint");
  const recentBurns = logsToEvents(burnLogs, "burn");

  return {
    blockNumber: latestBlock,
    fetchedAt: Date.now(),
    supplyRaw: supplyData.raw,
    supply: supplyData.units,
    dexPrice,
    chainlink,
    recentMints,
    recentBurns,
    net500BlockMint: recentMints.reduce((s, e) => s + e.amount, 0) - recentBurns.reduce((s, e) => s + e.amount, 0),
  };
}
