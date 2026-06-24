import { TokenName } from '@/constants';

export namespace LendingSpace {
  export interface MyBaseAprDoc {
    token: {
      decimals: number;
      name: string;
      symbol: TokenName;
    };
    lending_apy: {
      net_apy: number;
      raw_apy: number;
      reward_apy: number;
    };
    price: {
      decimals: number;
      price: string; // "0x554a969a1e",
      quote_currency: string; // USD
    };
    borrowing_apy: {
      net_apy: number; //0.023549914360046387,
      raw_apy: number; // 0.023549914360046387,
      reward_apy: number; // null
    };
    borrow_factor: {
      decimals: number; // 27
      value: string; // "0x33b2e3c9fd0803ce8000000"
    };
    collateral_factor: {
      decimals: number; //27,
      value: string; // "0x295be96e640669720000000"
    };
    // ... has other data, not relevant
  }
}
