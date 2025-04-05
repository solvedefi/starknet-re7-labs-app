import { getStrategies } from '@/store/strategies.atoms';
import { StrategyWise } from '@/store/utils.atoms';
import { standariseAddress } from '@/utils';
import { NextResponse } from 'next/server';
import { AmountsInfo } from '@/strategies/IStrategy';

export const revalidate = 0;

export async function GET(_req: Request, context: any) {
  const { params } = context;
  const addr = params.address;

  // standardised address
  let pAddr = addr;
  try {
    pAddr = standariseAddress(addr);
  } catch (e) {
    throw new Error('Invalid address');
  }

  const strategies = getStrategies();
  const values: Promise<StrategyWise>[] = strategies.map(async (strategy) => {
    if (strategy.isLive()) {
      const balanceInfo: AmountsInfo = await strategy.getUserTVL(pAddr);
      if (balanceInfo.amounts.length == 1) {
        return {
          id: strategy.id,
          usdValue: balanceInfo.usdValue,
          holdings: [
            {
              tokenInfo: balanceInfo.amounts[0].tokenInfo,
              amount: balanceInfo.amounts[0].amount,
              usdValue: balanceInfo.amounts[0].usdValue,
            },
          ],
        };
      }
      const summary = await strategy.computeSummaryValue(
        balanceInfo.amounts.map((a) => ({
          tokenInfo: a.tokenInfo,
          amount: a.amount,
        })),
        strategy.settings.quoteToken,
      );
      return {
        id: strategy.id,
        usdValue: balanceInfo.usdValue,
        holdings: [
          {
            tokenInfo: strategy.settings.quoteToken,
            amount: summary,
            usdValue: balanceInfo.usdValue,
          },
        ],
      };
    }

    return {
      id: strategy.id,
      usdValue: 0,
      holdings: [],
    };
  });

  const result = await Promise.all(values);
  const sum = result.reduce((acc, item) => acc + item.usdValue, 0);
  return NextResponse.json({
    holdingsUSD: sum,
    strategyWise: result,
  });
}
