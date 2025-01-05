import { provider, TokenName } from '@/constants';
import { DeltaNeutralMM } from './delta_neutral_mm';
import {
  IStrategySettings,
  StrategyAction,
  StrategyLiveStatus,
  TokenInfo,
} from './IStrategy';
import MyNumber from '@/utils/MyNumber';
import { getPrice, getTokenInfoFromName } from '@/utils';
import { getERC20Balance } from '@/store/balance.atoms';
import { vesu } from '@/store/vesu.store';
import { endur } from '@/store/endur.store';
import { PoolInfo } from '@/store/pools';
import { Contract } from 'starknet';

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
      const mainTokenName = this.token.name;
      const colToken = getTokenInfoFromName(`i${mainTokenName}-c`);

      const bal = await getERC20Balance(colToken, this.strategyAddress);
      console.log('getTVL222', bal.amount.toString());
      // This reduces the zToken TVL to near actual deposits made by users wihout looping
      const discountFactor = this.stepAmountFactors[4];
      const amount = bal.amount.operate('div', 1 + discountFactor);
      console.log('getTVL1', amount.toString());
      const price = await getPrice(this.token);
      return {
        amount,
        usdValue: Number(amount.toEtherStr()) * price,
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

  getSettings = async () => {
    const cls = await provider.getClassAt(this.strategyAddress);
    const contract = new Contract(cls.abi, this.strategyAddress, provider);
    const settings = await contract.call('get_settings', []);
    console.log('getSettings', settings);
  };
}
