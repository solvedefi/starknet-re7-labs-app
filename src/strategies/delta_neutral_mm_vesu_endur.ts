import { provider, TokenName } from '@/constants';
import { DeltaNeutralMM } from './delta_neutral_mm';
import {
  IStrategySettings,
  StrategyAction,
  StrategyLiveStatus,
  TokenInfo,
} from './IStrategy';
import MyNumber from '@/utils/MyNumber';
import { getEndpoint, getTokenInfoFromName } from '@/utils';
import { vesu } from '@/store/vesu.store';
import { endur } from '@/store/endur.store';
import { PoolInfo } from '@/store/pools';
import { Contract } from 'starknet';
import { fetchQuotes, QuoteRequest } from '@avnu/avnu-sdk';

export class DeltaNeutralMMVesuEndur extends DeltaNeutralMM {
  constructor(
    token: TokenInfo,
    name: string,
    description: string,
    secondaryTokenName: TokenName,
    strategyAddress: string,
    stepAmountFactors: number[],
    liveStatus: StrategyLiveStatus,
    settings: IStrategySettings,
  ) {
    super(
      token,
      name,
      description,
      secondaryTokenName,
      strategyAddress,
      stepAmountFactors,
      liveStatus,
      settings,
      endur,
      vesu,
    );
  }

  filterMainToken(
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) {
    const dapp = prevActions.length == 0 ? this.protocol1 : this.protocol2;
    return pools.filter(
      (p) => p.pool.name == this.token.name && p.protocol.name == dapp.name,
    );
  }

  filterSecondaryToken(
    pools: PoolInfo[],
    amount: string,
    prevActions: StrategyAction[],
  ) {
    const dapp = this.protocol2;
    console.log(
      'filterSecondaryToken',
      pools.filter((p) => p.protocol.name == dapp.name),
      this.secondaryToken,
    );
    return pools.filter(
      (p) => p.pool.name == this.secondaryToken && p.protocol.name == dapp.name,
    );
  }

  optimizer(
    eligiblePools: PoolInfo[],
    amount: string,
    actions: StrategyAction[],
  ): StrategyAction[] {
    console.log('optimizer', actions.length, this.stepAmountFactors);
    const _amount = (
      Number(amount) * this.stepAmountFactors[actions.length]
    ).toFixed(2);
    const pool = { ...eligiblePools[0] };
    const isDeposit = actions.length == 0 || actions.length == 1;
    const effectiveAPR = pool.aprSplits.reduce((a, b) => {
      if (b.apr == 'Err') return a;
      if (!isDeposit) return a + Number(b.apr);
      if (b.title.includes('STRK rewards')) {
        return a + Number(b.apr) * (1 - this.fee_factor);
      }
      return a + Number(b.apr);
    }, 0);
    console.log('optimizer2', isDeposit, pool, effectiveAPR);
    pool.apr = isDeposit ? effectiveAPR : pool.borrow.apr;
    return [
      ...actions,
      {
        pool,
        amount: _amount,
        isDeposit,
      },
    ];
  }

  getSteps() {
    return [
      {
        name: `Stake ${this.token.name} to ${this.protocol1.name}`,
        optimizer: this.optimizer,
        filter: [this.filterMainToken],
      },
      {
        name: `Supply's your ${this.secondaryToken} to ${this.protocol2.name}`,
        optimizer: this.optimizer,
        filter: [this.filterSecondaryToken],
      },
      {
        name: `Borrow ${this.token.name} from ${this.protocol1.name}`,
        optimizer: this.optimizer,
        filter: [this.filterMainToken],
      },
      {
        name: `Loop back to step 1, repeat 3 more times`,
        optimizer: this.getLookRepeatYieldAmount,
        filter: [this.filterMainToken],
      },
      {
        name: `Re-invest your STRK Rewards every 7 days (Compound)`,
        optimizer: this.compounder,
        filter: [this.filterTokenByProtocol('STRK', this.protocol1)],
      },
    ];
  }

  getTVL = async () => {
    if (!this.isLive())
      return {
        amount: MyNumber.fromEther('0', this.token.decimals),
        usdValue: 0,
        tokenInfo: this.token,
      };

    try {
      const resp = await fetch(
        `${getEndpoint()}/vesu/positions?walletAddress=${this.strategyAddress}`,
      );
      const data = await resp.json();
      if (!data.data || data.data.length == 0) {
        throw new Error('No positions found');
      }
      const collateralXSTRK = new MyNumber(
        data.data[0].collateral.value,
        data.data[0].collateral.decimals,
      );
      const collateralUSDValue = new MyNumber(
        data.data[0].collateral.usdPrice.value,
        data.data[0].collateral.usdPrice.decimals,
      );
      const debtSTRK = new MyNumber(
        data.data[0].debt.value,
        data.data[0].debt.decimals,
      );
      const debtUSDValue = new MyNumber(
        data.data[0].debt.usdPrice.value,
        data.data[0].debt.usdPrice.decimals,
      );
      const xSTRKPrice = await this.getXSTRKPrice();
      const collateralInSTRK =
        Number(collateralXSTRK.toEtherToFixedDecimals(6)) * xSTRKPrice;
      return {
        amount: MyNumber.fromEther(
          (
            collateralInSTRK - Number(debtSTRK.toEtherToFixedDecimals(6))
          ).toFixed(6),
          data.data[0].collateral.decimals,
        ),
        usdValue:
          Number(collateralUSDValue.toEtherStr()) -
          Number(debtUSDValue.toEtherStr()),
        tokenInfo: this.token,
      };
    } catch (error) {
      console.error('Error fetching TVL:', error);
      return {
        amount: MyNumber.fromEther('0', this.token.decimals),
        usdValue: 0,
        tokenInfo: this.token,
      };
    }
  };

  async getXSTRKPrice(retry = 0): Promise<number> {
    const params: QuoteRequest = {
      sellTokenAddress: getTokenInfoFromName(this.secondaryToken).token || '',
      buyTokenAddress: this.token.token,
      sellAmount: BigInt(Number(MyNumber.fromEther('1', 18).toString())),
      takerAddress: this.token.token,
    };
    console.log('getXSTRKPrice', params);
    const quotes = await fetchQuotes(params);
    console.log('fetchQuotes', quotes);
    if (quotes.length == 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await this.getXSTRKPrice(retry + 1);
    }

    const firstQuore = quotes[0];
    const price = Number(
      new MyNumber(firstQuore.buyAmount.toString(), 18).toEtherToFixedDecimals(
        6,
      ),
    );
    console.log('getXSTRKPrice', price);
    return price;
  }

  getSettings = async () => {
    const cls = await provider.getClassAt(this.strategyAddress);
    const contract = new Contract(cls.abi, this.strategyAddress, provider);
    const settings = await contract.call('get_settings', []);
    console.log('getSettings', settings);
  };
}
