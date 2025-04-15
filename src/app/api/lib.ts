import { Redis } from '@upstash/redis';
import { Contract, RpcProvider } from 'starknet';

const kvRedis = new Redis({
  url: process.env.VK_REDIS_KV_REST_API_URL,
  token: process.env.VK_REDIS_KV_REST_API_TOKEN,
});

export async function getDataFromRedis(
  key: string,
  url: string,
  revalidate: number,
) {
  if (url.includes('no_cache=true')) {
    // force no cache
    return null;
  }
  const cacheData: any = await kvRedis.get(key);
  if (
    cacheData &&
    new Date().getTime() - new Date(cacheData.lastUpdated).getTime() <
      revalidate * 1000
  ) {
    console.log(`Cache hit for ${key}`);
    return cacheData;
  }

  return null;
}

export default kvRedis;

export const getRewardsInfo = async (
  strategies: {
    tvlUsd: number;
    depositToken: string[];
    id: string;
  }[],
) => {
  const funder =
    '0x03495DD1e4838aa06666aac236036D86E81A6553e222FC02e70C2Cbc0062e8d0';
  const allowedStrats = [
    {
      id: 'vesu_fusion_eth',
      // ! consider exchange rate of vToken
      maxRewardsPerDay: 0.073, // in token units
      maxAPY: 100, // in percent
      underlyingTokenName: 'ETH',
      decimals: 18,
      rewardToken: '',
    },
  ];

  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_URL!,
  });

  const rewardsInfo: {
    id: string;
    reward: number;
    tvlUsd: number;
    rewardAPY: number;
    maxRewardsPerDay: number;
  }[] = [];
  for (const strat of strategies) {
    const stratId = strat.id;
    const stratAllowed = allowedStrats.find(
      (allowedStrat) => allowedStrat.id === stratId,
    );
    if (stratAllowed) {
      // Fetch the price of the underlying token
      const priceResponse = await fetch(
        `${process.env.HOSTNAME}/api/price/${stratAllowed.underlyingTokenName}`,
      );
      const priceData = await priceResponse.json();
      const tokenPrice = priceData.price;
      // ! consider token price of vToken

      const tvlUsd = strat.tvlUsd;
      console.log(`RewardCalc::${stratId}::tvlUsd::${tvlUsd}`);

      // Calculate the hourly reward based on TVL and token price
      const rewardBasedOnTVL =
        (tvlUsd * stratAllowed.maxAPY) / (100 * 365 * 24 * tokenPrice);
      console.log(
        `RewardCalc::${stratId}::ewardBasedOnTVL::${rewardBasedOnTVL}`,
      );
      console.log(`RewardCalc::${stratId}::tvl::${tvlUsd}`);
      console.log(`RewardCalc::${stratId}::tokenPrice::${tokenPrice}`);

      // Ensure the reward does not exceed max rewards per day
      let finalReward = Math.min(
        rewardBasedOnTVL,
        stratAllowed.maxRewardsPerDay / 24,
      );
      console.log(`RewardCalc::${stratId}::finalReward::${finalReward}`);

      // if less bal available, use the available balance
      const rewardToken = stratAllowed.rewardToken;
      const cls = await provider.getClassAt(rewardToken);
      const tokenContract = new Contract(cls.abi, rewardToken, provider);
      const available = await tokenContract.balanceOf(funder);
      const availableBal =
        Number(
          BigInt(available.toString()) /
            BigInt(10 ** (stratAllowed.decimals - 4)),
        ) / 10000;
      console.log(
        `RewardCalc::${stratId}::availableBal::${availableBal.toString()}`,
      );

      finalReward = Math.min(finalReward, availableBal);
      console.log(`RewardCalc::${stratId}::finalReward::${finalReward}`);

      // Calculate the reward APY
      rewardsInfo.push({
        id: stratId,
        reward: finalReward,
        tvlUsd,
        rewardAPY: ((finalReward * 24 * 365) / (tvlUsd / tokenPrice)) * 100,
        maxRewardsPerDay: stratAllowed.maxRewardsPerDay,
      });
    }
  }

  return rewardsInfo;
};
