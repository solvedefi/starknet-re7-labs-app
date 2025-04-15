import { TokenName } from '@/constants';
import { DeltaNeutralMM } from './delta_neutral_mm';
import {
  AmountsInfo,
  IStrategySettings,
  StrategyLiveStatus,
  TokenInfo,
} from './IStrategy';
import { nostraLending } from '@/store/nostralending.store';
import { zkLend } from '@/store/zklend.store';
import {
  convertToV2TokenInfo,
  getPrice,
  getTokenInfoFromName,
  ZeroAmountsInfo,
} from '@/utils';
import { getERC20Balance } from '@/store/balance.atoms';
import { Web3Number } from '@strkfarm/sdk';

export class DeltaNeutralMM2 extends DeltaNeutralMM {
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
      nostraLending,
      zkLend,
    );
  }

  getTVL = async (): Promise<AmountsInfo> => {
    if (!this.isLive()) return ZeroAmountsInfo([this.token]);

    try {
      const mainTokenName = this.token.name;
      const colToken = getTokenInfoFromName(`i${mainTokenName}-c`);

      const bal = await getERC20Balance(colToken, this.strategyAddress);
      console.log('getTVL222', bal.amount.toString());
      // This reduces the zToken TVL to near actual deposits made by users wihout looping
      const discountFactor = this.stepAmountFactors[4];
      const amount = bal.amount.operate('div', 1 + discountFactor);
      console.log('getTVL1', amount.toString());
      const price = await getPrice(this.token, 'dnmm2');
      const usdValue = Number(amount.toEtherStr()) * price;
      return {
        usdValue,
        amounts: [
          {
            amount: Web3Number.fromWei(amount.toString(), amount.decimals),
            usdValue,
            tokenInfo: convertToV2TokenInfo(this.token),
          },
        ],
      };
    } catch (error) {
      console.error('Error fetching TVL:', error);
      return ZeroAmountsInfo([this.token]);
    }
  };
}
