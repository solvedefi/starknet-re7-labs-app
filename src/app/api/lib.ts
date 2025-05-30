import { STRKFarmStrategyAPIResult } from '@/store/strkfarm.atoms';
import { Redis } from '@upstash/redis';
import { Contract, RpcProvider, uint256 } from 'starknet';

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

  if (!process.env.VK_REDIS_KV_REST_API_URL) {
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

export async function setDataToRedis(key: string, data: any) {
  if (!process.env.VK_REDIS_KV_REST_API_URL) {
    return;
  }

  await kvRedis.set(key, data);
  console.log(`Cache set for ${key}`);
}

export const getRewardsInfo = async (
  strategies: Pick<STRKFarmStrategyAPIResult, 'id' | 'tvlUsd' | 'contract'>[],
) => {
  const funder =
    '0x02D6cf6182259ee62A001EfC67e62C1fbc0dF109D2AA4163EB70D6d1074F0173';
  const allowedStrats = [
    {
      id: 'vesu_fusion_eth',
      // ! consider exchange rate of vToken
      maxRewardsPerDay: 0.047, // in token units
      maxAPY: 200, // in percent
      underlyingTokenName: 'ETH',
      decimals: 18,
      rewardToken:
        '0x021fe2ca1b7e731e4a5ef7df2881356070c5d72db4b2d19f9195f6b641f75df0',
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
    rewardDecimals: number;
    maxRewardsPerDay: number;
    rewardToken: string;
    funder: string;
    receiver: string;
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
      // consider token price of vToken
      const clsVToken = await provider.getClassAt(stratAllowed.rewardToken);
      const tokenContractVToken = new Contract(
        clsVToken.abi,
        stratAllowed.rewardToken,
        provider,
      );
      const shareValue = await tokenContractVToken.call('convert_to_assets', [
        uint256.bnToUint256((1e18).toString()),
      ]);
      console.log(`shareValue::${stratId}::${shareValue}`);
      const tokenPrice =
        (priceData.price *
          Number(
            (BigInt(shareValue.toString()) * BigInt(10000)) /
              BigInt((1e18).toString()),
          )) /
        10000;
      console.log(
        `RewardCalc::${stratId}::tokenPrice::${tokenPrice}, underlyingTokenPrice::${priceData.price}`,
      );

      const tvlUsd = strat.tvlUsd;
      console.log(`RewardCalc::${stratId}::tvlUsd::${tvlUsd}`);

      // Calculate the hourly reward based on TVL and token price
      const rewardBasedOnTVL =
        (tvlUsd * stratAllowed.maxAPY) / (100 * 365 * 24 * tokenPrice);
      console.log(
        `RewardCalc::${stratId}::ewardBasedOnTVL::${rewardBasedOnTVL}`,
      );
      console.log(`RewardCalc::${stratId}::tvl::${tvlUsd}`);

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
        rewardDecimals: stratAllowed.decimals,
        tvlUsd,
        rewardAPY: ((finalReward * 24 * 365) / (tvlUsd / tokenPrice)) * 100,
        maxRewardsPerDay: stratAllowed.maxRewardsPerDay,
        rewardToken: stratAllowed.rewardToken,
        funder,
        receiver: strat.contract[0].address,
      });
    }
  }

  return rewardsInfo;
};
