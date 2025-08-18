import { usePagination } from '@ajna/pagination';
import {
  Container,
  Skeleton,
  Stack,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';

import { filteredPools } from '@/store/protocols';
import {
  STRKFarmBaseAPYsAtom,
  STRKFarmStrategyAPIResult,
} from '@/store/strkfarm.atoms';

import { YieldStrategyCard } from './YieldCard';
import { useRouter } from 'next/navigation';

export default function Strategies() {
  const strkFarmPoolsRes = useAtomValue(STRKFarmBaseAPYsAtom);
  const strkFarmPools = useMemo(() => {
    if (!strkFarmPoolsRes || !strkFarmPoolsRes.data)
      return [] as STRKFarmStrategyAPIResult[];
    return strkFarmPoolsRes.data.strategies;
  }, [strkFarmPoolsRes]);

  const _filteredPools = useAtomValue(filteredPools);
  const router = useRouter();
  const ITEMS_PER_PAGE = 15;
  const { currentPage, setCurrentPage, pagesCount, pages } = usePagination({
    pagesCount: Math.floor(_filteredPools.length / ITEMS_PER_PAGE) + 1,
    initialState: { currentPage: 1 },
  });

  const handleStrategyClick = (strategyId: string) => {
    router.push(`/strategy/${strategyId}`);
  };

  const pools = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return _filteredPools.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [_filteredPools, currentPage]);

  return (
    <Container width="100%" float={'left'} padding={'0px'}>
      <Container width="100%" float={'left'} padding={'24px 30px 12px 32px'}>
        <Text color="#FFF" fontSize={'18px'} padding={'5px 0px'}>
          <b>What are strategies?</b>
        </Text>
        <Text
          color="#FFF"
          fontSize={'15px'}
          marginBottom={'15px'}
          padding={'2px 0px'}
        >
          Strategies are a combination of investment steps that combine various
          pools to maximize yield.
        </Text>
      </Container>
      <Table variant="simple">
        <Thead display={{ base: 'none', md: 'table-header-group' }}>
          <Tr
            fontSize={'15px'}
            color={'#8A9B9B'}
            bg="#131313"
            borderRadius="15px"
            borderBottom={'10px solid #131313 !important'}
          >
            <Th borderLeft={'10px solid #131313 !important'}>Strategy name</Th>
            <Th textAlign={'right'}>Deposit</Th>
            <Th textAlign={'right'}>Current Yield</Th>
            <Th textAlign={'right'}>APY</Th>
            {/* <Th textAlign={'right'}>Risk</Th> */}
            <Th textAlign={'right'}>TVL</Th>
            <Th borderRight={'10px solid #131313 !important'}></Th>
          </Tr>
        </Thead>
        <Tbody>
          {strkFarmPools.length > 0 && (
            <>
              {strkFarmPools.map((pool, index) => {
                return (
                  <YieldStrategyCard
                    key={pool.id}
                    strat={pool}
                    index={index}
                    onClick={handleStrategyClick}
                  />
                );
              })}
            </>
          )}
        </Tbody>
      </Table>
      {strkFarmPools.length === 0 && (
        <Stack>
          <Skeleton height="70px" />
          <Skeleton height="70px" />
          <Skeleton height="70px" />
          <Skeleton height="70px" />
        </Stack>
      )}
      <Container width="100%" float={'left'} padding={'16px 27px'}>
        <Text
          color="#FFF"
          textAlign={'center'}
          width={'100%'}
          margin="15px 0"
          padding="2px 0px"
          fontSize="13px"
        >
          More strategies coming soon.
        </Text>
      </Container>
    </Container>
  );
}
