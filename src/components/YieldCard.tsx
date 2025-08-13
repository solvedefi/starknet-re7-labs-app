import shield from '@/assets/shield.svg';
import { addressAtom } from '@/store/claims.atoms';
import { isPoolRetired, PoolInfo } from '@/store/pools';
import { getPoolInfoFromStrategy, sortAtom } from '@/store/protocols';
import { STRKFarmStrategyAPIResult } from '@/store/strkfarm.atoms';
import { UserStats, userStatsAtom } from '@/store/utils.atoms';
import { isLive, StrategyLiveStatus } from '@/strategies/IStrategy';
import { getDisplayCurrencyAmount } from '@/utils';
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons';
import {
  Avatar,
  AvatarGroup,
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Image,
  Link,
  Spinner,
  Stack,
  Td,
  Text,
  Tooltip,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { ContractAddr } from '@strkfarm/sdk';
import { useAtomValue } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { useMemo } from 'react';
import { FaWallet } from 'react-icons/fa';
import arrow from '@public/arrow_left.png';

export interface YieldCardProps {
  pool: PoolInfo;
  index: number;
  showProtocolName?: boolean;
  onClick?: (strategyId: string) => void;
}

export function getStratCardBg(status: StrategyLiveStatus, index: number) {
  if (status == StrategyLiveStatus.HOT) {
    return '#414173';
  }
  if (isLive(status)) {
    return index % 2 === 0 ? 'color1_50p' : 'color2_50p';
  }
  if (status == StrategyLiveStatus.RETIRED) {
    return 'black';
  }
  return 'bg';
}

function getStratCardBadgeBg(status: StrategyLiveStatus) {
  if (isLive(status)) {
    return 'cyan';
  } else if (status === StrategyLiveStatus.COMING_SOON) {
    return 'yellow';
  } else if (status == StrategyLiveStatus.RETIRED) {
    return 'grey';
  }
  return 'bg';
}

export function StrategyInfo(props: YieldCardProps) {
  const { pool } = props;

  return (
    <Box>
      <HStack spacing={2}>
        <AvatarGroup size="xs" max={3} marginRight={'10px'}>
          {pool.pool.logos.map((logo, index) => (
            <Avatar key={index} src={logo} />
          ))}
        </AvatarGroup>
        <Box>
          <HStack spacing={2}>
            <Heading size="sm" marginTop={'2px'}>
              {pool.pool.name}
            </Heading>
            {pool.additional && pool.additional.auditUrl && (
              <Tooltip label="Audited smart contract. Click to view the audit report.">
                <Link
                  href={pool.additional.auditUrl}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Box
                    width={'24px'}
                    height={'24px'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={'rgba(0, 0, 0, 0.2)'}
                    borderRadius={'50%'}
                  >
                    <Image src={shield.src} alt="badge" />
                  </Box>
                </Link>
              </Tooltip>
            )}
          </HStack>
          {props.showProtocolName && (
            <HStack marginTop={'5px'} spacing={1}>
              <Avatar size={'2xs'} src={pool.protocol.logo} />
              <Heading size="xs" marginTop={'2px'} color={'light_grey'}>
                {pool.protocol.name}
              </Heading>
            </HStack>
          )}
        </Box>
      </HStack>
    </Box>
  );
}

function getAPRWithToolTip(pool: PoolInfo) {
  const tip = (
    <Box width={'300px'}>
      {pool.aprSplits.map((split) => {
        return (
          <Flex
            margin="5px 0"
            justifyContent={'space-between'}
            key={split.title}
          >
            <Box>
              <Text>{split.title}:</Text>
              <Text fontSize={'12px'} opacity={0.7}>
                {split.description}
              </Text>
            </Box>
            <Text fontWeight={'bold'}>
              {split.apr === 'Err' ? split.apr : (split.apr * 100).toFixed(2)}%
            </Text>
          </Flex>
        );
      })}
    </Box>
  );
  return (
    <Tooltip hasArrow label={tip} bg="gray.300" color="black">
      <Box
        width={'100%'}
        marginRight={'0px'}
        marginLeft={'auto'}
        display={'flex'}
        justifyContent={'flex-end'}
      >
        {pool.isLoading && <Spinner />}
        {!pool.isLoading && (
          <>
            <Text
              textAlign={'right'}
              color="white"
              fontSize={'16px'}
              fontWeight={'bolder'}
            >
              {(pool.apr * 100).toFixed(2)}%
            </Text>
          </>
        )}
      </Box>
    </Tooltip>
  );
}

function StrategyAPY(props: YieldCardProps) {
  const { pool } = props;
  const isRetired = useMemo(() => {
    return isPoolRetired(pool);
  }, [pool]);

  return (
    <Box width={'100%'} marginBottom={'5px'} alignItems={'center'}>
      {isRetired ? (
        <Text ml="auto" w="fit-content" mr="6">
          -
        </Text>
      ) : (
        <>
          {getAPRWithToolTip(pool)}

          {pool.aprSplits.length &&
            pool.aprSplits.some((a) => a.title == 'Rewards APY') && (
              <Tooltip
                label="Boosted rewards from STRKFarm"
                bg="gray.300"
                color="black"
              >
                <Box width={'100%'}>
                  <Box float={'right'} display={'flex'} fontSize={'13px'}>
                    <Text color="#FCC01E" textAlign={'right'}>
                      ⚡
                    </Text>
                    <Text
                      width="100%"
                      color="cyan"
                      textAlign={'right'}
                      fontWeight={600}
                    >
                      Boosted
                    </Text>
                  </Box>
                </Box>
              </Tooltip>
            )}
        </>
      )}
    </Box>
  );
}

export function getStrategyWiseHoldingsInfo(
  userData: UserStats | null | undefined,
  id: string,
) {
  const amount = userData?.strategyWise.find((item) => item.id === id);
  const defaultTokenInfo = {
    name: 'N/A',
    symbol: 'N/A',
    address: ContractAddr.from('0x0'),
    decimals: 0,
    logo: '',
    displayDecimals: 2,
  };
  if (!amount) {
    return {
      usdValue: 0,
      amount: 0,
      tokenInfo: defaultTokenInfo,
    };
  }
  return {
    usdValue: amount.usdValue,
    amount: amount.holdings.length ? Number(amount.holdings[0].amount) : 0,
    tokenInfo: amount.holdings.length
      ? amount.holdings[0].tokenInfo
      : defaultTokenInfo,
  };
}

export function StrategyTVL(props: YieldCardProps) {
  const { pool } = props;
  const address = useAtomValue(addressAtom);
  const { data: userData } = useAtomValue(userStatsAtom);

  const holdingsInfo = getStrategyWiseHoldingsInfo(userData, pool.pool.id);

  const isPoolLive =
    pool.additional &&
    pool.additional.tags[0] &&
    isLive(pool.additional.tags[0]);

  return (
    <Box
      width={'100%'}
      textAlign={'right'}
      fontWeight={600}
      display={'flex'}
      flexDirection={'column'}
      justifyContent={'center'}
      alignItems={'flex-end'}
    >
      {isPoolLive && (
        <Text fontSize={'16px'}>
          ${getDisplayCurrencyAmount(pool.tvl || 0, 0)}
        </Text>
      )}
      {!isPoolLive && <Text>-</Text>}
      {address && isPoolLive && pool.protocol.name == 'STRKFarm' && (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius={'20px'}
          color="grey_text"
          fontSize={'12px'}
          width={'100%'}
          mt="5px"
        >
          <Tooltip label="Your deposits in this STRKFarm strategy">
            <Box width={'100%'} fontWeight={600}>
              <Flex>
                <Text width={'100%'} justifyContent={'flex-end'}>
                  ${getDisplayCurrencyAmount(holdingsInfo.usdValue, 0)}
                </Text>
                <Box>
                  <Icon as={FaWallet} marginLeft={'3px'} mt={'-3px'} />
                </Box>
              </Flex>
              {holdingsInfo.amount != 0 && (
                <Flex
                  justifyContent={'flex-end'}
                  marginTop={'-5px'}
                  width={'100%'}
                  opacity={0.5}
                >
                  {/* <Avatar size={'2xs'} src={holdingsInfo.tokenInfo.logo} mr={'2px'}/> */}
                  <Text textAlign={'right'} fontSize={'11px'}>
                    {getDisplayCurrencyAmount(
                      holdingsInfo.amount,
                      holdingsInfo.tokenInfo.displayDecimals,
                    ).toLocaleString()}
                  </Text>
                  <Image
                    width={'10px'}
                    src={holdingsInfo.tokenInfo.logo}
                    ml={'4px'}
                    mr={'1px'}
                    filter={'grayscale(1)'}
                  />
                </Flex>
              )}
            </Box>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
// return sort heading text to match with sort options heading text
function sortHeading(field: string) {
  if (field == 'APY') {
    return 'APR';
  }
  return field.toUpperCase();
}
function GetRiskLevel(riskFactor: number) {
  let color = '';
  let bgColor = '';
  let count = 0;
  let tooltipLabel = '';

  if (riskFactor <= 2) {
    color = 'rgba(131, 241, 77, 1)';
    bgColor = 'rgba(131, 241, 77, 0.3)';
    count = 1;
    tooltipLabel = 'Low risk';
  } else if (riskFactor < 4) {
    color = 'rgba(255, 146, 0, 1)';
    bgColor = 'rgba(255, 146, 0, 0.3)';
    count = 3;
    tooltipLabel = 'Medium risk';
  } else {
    color = 'rgba(255, 32, 32, 1)';
    bgColor = 'rgba(255, 32, 32, 0.3)';
    count = 5;
    tooltipLabel = 'High risk';
  }

  return (
    <Box
      width="100%"
      display="flex"
      justifyContent={'flex-end'}
      alignContent={'flex-end'}
    >
      <Tooltip
        hasArrow
        label={`${tooltipLabel}. We currently assess only impermanent loss risk: stable pairs/pools are low risk, volatile multi-token pools are medium risk. More factors will be added soon.`}
        bg="gray.300"
        color="black"
      >
        <Box
          position={'relative'}
          display={'flex'}
          flexDirection={'column'}
          alignSelf={{ base: 'left', md: 'center' }}
          justifyContent={'flex-start'}
        >
          <Box
            width={'100%'}
            display="flex"
            alignItems="center"
            justifyContent={{ base: 'flex-start', md: 'center' }}
            padding={'4px 0px'}
            height={'100%'}
            position={'relative'}
          >
            <Stack direction="row" spacing={1}>
              {[...Array(5)].map((_, index) => (
                <Box
                  key={index}
                  width="4px"
                  height="18px"
                  borderRadius="md"
                  bg={
                    index < count ? color : 'var(--chakra-colors-opacity_50p)'
                  }
                />
              ))}
            </Stack>
          </Box>
          <Box
            position={'absolute'}
            backgroundColor={bgColor}
            opacity={0.3}
            filter={'blur(30.549999237060547px)'}
            right={{ base: '-50', md: '-37px' }}
            bottom={'-80px'}
            width={'94px'}
            height={'94px'}
            zIndex={0}
          />
        </Box>
      </Tooltip>
    </Box>
  );
}

function StrategyMobileCard(props: YieldCardProps) {
  const { pool, index } = props;
  return (
    <Grid
      color={'white'}
      bg={getStratCardBg(
        pool.additional?.tags[0] || StrategyLiveStatus.ACTIVE,
        index,
      )}
      templateColumns={'repeat(3, 1fr)'}
      templateRows={
        props.showProtocolName ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)'
      }
      display={{ base: 'grid', md: 'none' }}
      padding={'20px'}
      gap={2}
      borderBottom={'1px solid var(--chakra-colors-bg)'}
      as={'a'}
      {...getLinkProps(pool, props.showProtocolName)}
    >
      <GridItem colSpan={3} rowSpan={props.showProtocolName ? 2 : 1}>
        <StrategyInfo
          pool={pool}
          index={index}
          showProtocolName={props.showProtocolName}
        />
      </GridItem>
      <GridItem colSpan={1} rowSpan={2}>
        <Text
          textAlign={'right'}
          color={'color2'}
          fontWeight={'bold'}
          fontSize={'13px'}
        >
          APY
        </Text>
        <StrategyAPY pool={pool} index={index} />
      </GridItem>
      <GridItem colSpan={1} rowSpan={2}>
        <Text
          textAlign={'right'}
          color={'color2'}
          fontWeight={'bold'}
          fontSize={'13px'}
        >
          RISK
        </Text>
        {pool.additional?.riskFactor
          ? GetRiskLevel(pool.additional?.riskFactor)
          : '-'}
      </GridItem>
      <GridItem colSpan={1} rowSpan={2}>
        <Text
          textAlign={'right'}
          color={'color2'}
          fontWeight={'bold'}
          fontSize={'13px'}
        >
          TVL
        </Text>
        <StrategyTVL pool={pool} index={index} />
      </GridItem>
    </Grid>
  );
}

export function getLinkProps(
  pool: PoolInfo,
  showProtocolName?: boolean,
  onClick?: (strategyId: string) => void,
) {
  return {
    onClick: () => {
      mixpanel.track('Pool clicked', {
        pool: pool.pool.name,
        protocol: pool.protocol.name,
        yield: pool.apr,
        risk: pool.additional.riskFactor,
        tvl: pool.tvl,
        showProtocolName,
      });
      onClick?.(pool.pool.id);
    },
  };
}
export default function YieldCard(props: YieldCardProps) {
  const { pool, index, onClick } = props;

  const isRetired = useMemo(() => {
    return isPoolRetired(pool);
  }, [pool]);
  return (
    <>
      <Tr
        color={'white'}
        bg="#212121"
        borderBottom={'10px solid #131313 !important'}
        padding={'5px 10px'}
        borderRadius="9px"
        backgroundClip="padding-box"
        display={{ base: 'none', md: 'table-row' }}
        as={'a'}
        _hover={{ cursor: 'pointer' }}
        {...getLinkProps(pool, props.showProtocolName, onClick)}
      >
        <Td borderLeft={'10px solid #131313 !important'}>
          <StrategyInfo
            pool={pool}
            index={index}
            showProtocolName={props.showProtocolName}
          />
        </Td>
        <Td alignContent={'center'}>
          {isRetired ? (
            <Text ml="auto" w="fit-content" mr="2">
              -
            </Text>
          ) : (
            <StrategyAPY pool={pool} index={index} />
          )}
        </Td>
        {/* <Td>
          {isRetired ? (
            <Text ml="auto" w="fit-content" mr="2">
              -
            </Text>
          ) : pool.additional?.riskFactor ? (
            GetRiskLevel(pool.additional?.riskFactor)
          ) : (
            '-'
          )}
        </Td> */}
        <Td alignContent={'center'}>
          {isRetired ? (
            <Text ml="auto" w="fit-content" mr="2">
              -
            </Text>
          ) : (
            <StrategyTVL pool={pool} index={index} />
          )}
        </Td>
        <Td
          alignContent={'center'}
          width={'70px'}
          borderRight={'10px solid #131313 !important'}
        >
          <Image
            src={arrow.src}
            alt="logo"
            height="13px"
            width="9px"
            marginBottom={'2px'}
          />
        </Td>
      </Tr>
      <StrategyMobileCard
        pool={pool}
        index={index}
        showProtocolName={props.showProtocolName}
      />
    </>
  );
}

export function YieldStrategyCard(props: {
  strat: STRKFarmStrategyAPIResult;
  index: number;
  onClick: (strategyId: string) => void;
}) {
  const strat = getPoolInfoFromStrategy(props.strat);
  return (
    <YieldCard
      pool={strat}
      index={props.index}
      showProtocolName={true}
      onClick={props.onClick}
    />
  );
}

export function HeaderSorter(props: {
  heading: string;
  mainColor: string;
  inActiveColor: string;
  onClick: (order: 'asc' | 'desc') => void;
  // added active? boolean to handle sort status...
  active?: boolean;
}) {
  // get the current sort atom
  const sort = useAtomValue(sortAtom);
  // get corrent index for a particular sort option from the current sort atom
  const currentFieldIndex = sort.findIndex(
    (s) => s.field === sortHeading(props.heading),
  );
  // get the order of the clicked sort option
  const order: 'asc' | 'desc' =
    currentFieldIndex >= 0 ? sort[currentFieldIndex].order : 'desc';
  return (
    <HStack
      as="button"
      onClick={() => {
        props.onClick(order);
      }}
      float={'right'}
    >
      <Text color={props.mainColor}>{props.heading.toUpperCase()}</Text>
      <VStack gap={0} spacing={0}>
        <TriangleUpIcon
          color={
            order == 'asc' && props.active
              ? props.mainColor
              : props.inActiveColor
          }
        />
        <TriangleDownIcon
          color={
            order == 'desc' && props.active
              ? props.mainColor
              : props.inActiveColor
          }
        />
      </VStack>
    </HStack>
  );
}
