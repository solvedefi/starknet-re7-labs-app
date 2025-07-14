import React, { useMemo } from 'react';
import {
  Box,
  Container,
  Flex,
  Spinner,
  Tag,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { useAccount } from '@starknet-react/core';
import { StrategyInfo } from '@/store/strategies.atoms';
import { HarvestTimeAtom } from '@/store/harvest.atom';
import { useAtomValue } from 'jotai';
import { formatTimediff, getDisplayCurrencyAmount, timeAgo } from '@/utils';
import { isMobile } from 'react-device-detect';
import STRKFarmAtoms, {
  STRKFarmStrategyAPIResult,
} from '@/store/strkfarm.atoms';
import styles from '../app/border.module.css';

interface HarvestTimeProps {
  strategy: StrategyInfo<any>;
  balData: any;
}

const HarvestTime: React.FC<HarvestTimeProps> = ({ strategy, balData }) => {
  const { address } = useAccount();
  const holdingToken: any = strategy.holdingTokens[0];
  const contractAddress = holdingToken.address || holdingToken.token || '';

  const harvestTimeAtom = useMemo(
    () => HarvestTimeAtom(contractAddress),
    [address],
  );

  const harvestTime = useAtomValue(harvestTimeAtom);

  const data = harvestTime.data?.findManyHarvests[0];

  const lastHarvest = useMemo(() => {
    if (!data || !data.timestamp) return null;
    return new Date(Number(data.timestamp) * 1000);
  }, [data?.timestamp]);

  const harvestTimestamp = useMemo(() => {
    const DAYMS = 86400 * 1000;
    // Base date is last harvest time + 2 days or now (for no harvest strats)
    const baseDate = lastHarvest
      ? new Date(lastHarvest.getTime() + 2 * DAYMS)
      : new Date();

    // With base date, get next sunday 12am UTC
    // set date to coming sunday in UTC
    const nextHarvest = baseDate;
    nextHarvest.setUTCDate(
      nextHarvest.getUTCDate() + (7 - nextHarvest.getUTCDay()),
    );
    nextHarvest.setUTCHours(0);
    nextHarvest.setUTCMinutes(0);
    nextHarvest.setUTCSeconds(0);

    // if nextHarvest is within 24hrs of last harvest,
    // increase it by 7 days
    // This is needed as harvest can happen anytime near deadline
    if (
      lastHarvest &&
      nextHarvest.getTime() - lastHarvest.getTime() < 86400 * 1000
    ) {
      nextHarvest.setUTCDate(nextHarvest.getUTCDate() + 7);
    }

    return formatTimediff(nextHarvest);
  }, [data?.timestamp, lastHarvest]);

  const strategiesInfo = useAtomValue(STRKFarmAtoms.baseAPRs!);

  const strategyInfo = useMemo(() => {
    if (!strategiesInfo || !strategiesInfo.data) return null;

    const strategiesList: STRKFarmStrategyAPIResult[] =
      strategiesInfo.data.strategies;
    const strategyInfo = strategiesList.find(
      (strat) => strat.id == strategy.id,
    );
    return strategyInfo ? strategyInfo : null;
  }, [strategiesInfo]);

  const leverage = useMemo(() => {
    if (!strategyInfo) return 0;
    return strategyInfo.leverage || 0;
  }, [strategyInfo]);

  const defaultAPYTooltip =
    'Current APY including any fees. Net returns subject to change based on market conditions.';
  return (
    <Box>
      <Flex justifyContent="space-between">
        <Flex>
          <Tooltip
            width={'180px'}
            label={
              <Box fontSize={'13px'}>
                <Text>
                  {strategy.metadata.apyMethodology || defaultAPYTooltip}
                </Text>
                {strategyInfo && (
                  <Box
                    marginTop={'10px'}
                    justifyContent={'space-between'}
                    display={'flex'}
                  >
                    <Box>
                      <Text>Strategy APY:</Text>
                      <Text fontSize={'12px'} opacity={0.7}>
                        Including fees and Defi spring rewards
                      </Text>
                    </Box>
                    <Text fontWeight={'bold'}>
                      {(strategyInfo.apySplit.baseApy * 100).toFixed(2)}%
                    </Text>
                  </Box>
                )}
                {strategyInfo && strategyInfo.apySplit.rewardsApy > 0 && (
                  <Box
                    marginTop={'10px'}
                    justifyContent={'space-between'}
                    display={'flex'}
                  >
                    <Box>
                      <Text>Rewards APY:</Text>
                      <Text fontSize={'12px'} opacity={0.7}>
                        Incentives by STRKFarm
                      </Text>
                    </Box>
                    <Text fontWeight={'bold'}>
                      {(strategyInfo.apySplit.rewardsApy * 100).toFixed(2)}%
                    </Text>
                  </Box>
                )}
              </Box>
            }
          >
            <Container
              className={styles.border}
              marginRight={'5px'}
              padding={'16px 21px'}
              width={'180px'}
              alignItems={'center'}
              display={'flex'}
              justifyContent={'space-between'}
            >
              <Text>APY</Text>
              <Text>{((strategyInfo?.apy || 0) * 100).toFixed(2)}%</Text>
            </Container>
          </Tooltip>
          {strategyInfo && strategyInfo.apySplit.rewardsApy > 0 && (
            <Flex flexDirection={'column'} justifyContent={'flex-end'}>
              <Tooltip label="Boosted rewards from STRKFarm">
                <Tag
                  bg="bg"
                  color={'white'}
                  fontSize={'12px'}
                  padding={'2px 5px'}
                >
                  🔥 Boosted
                  {leverage == 0 && (
                    <Spinner size="xs" color="white" ml={'5px'} />
                  )}
                </Tag>
              </Tooltip>
            </Flex>
          )}
        </Flex>

        {!isMobile && !strategy.settings.hideHarvestInfo && (
          <Tooltip
            label={`This is when your investment increases as STRK rewards are automatically claimed and reinvested into the strategy's tokens.`}
          >
            <Box
              className={styles.border_alt}
              display={'flex'}
              justifyContent={'space-between'}
              alignItems={'center'}
              width={'360px'}
            >
              <Text>
                Next Harvest in:{' '}
                {harvestTimestamp.isZero && <Text>Anytime now</Text>}
              </Text>
              <Text>
                {harvestTimestamp.days ?? 0}d {harvestTimestamp.hours ?? 0}h{' '}
                {harvestTimestamp.minutes ?? 0}m
              </Text>
            </Box>
          </Tooltip>
        )}
      </Flex>

      {!strategy.settings.hideHarvestInfo && (
        <Box
          className={styles.border_alt}
          marginTop={'20px'}
          display="flex"
          width={'100%'}
          alignItems={'center'}
          justifyContent={'space-between'}
        >
          <Text>Harvested </Text>
          <Text>
            <b>
              {getDisplayCurrencyAmount(
                harvestTime?.data?.totalStrkHarvestedByContract.STRKAmount || 0,
                2,
              )}{' '}
              STRK
            </b>{' '}
            / <b>{harvestTime?.data?.totalHarvestsByContract} claims.</b>{' '}
            {lastHarvest && (
              <span>
                Last harvested <b>{timeAgo(lastHarvest)}</b> (Across all users).
              </span>
            )}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default HarvestTime;
