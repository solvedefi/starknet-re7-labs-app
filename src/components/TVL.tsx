import { dAppStatsAtom, userStatsAtom } from '@/store/utils.atoms';
import {
  Card,
  Grid,
  GridItem,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react';
import { useAtomValue } from 'jotai';
import React from 'react';

const TVL: React.FC = () => {
  const { data, isPending } = useAtomValue(dAppStatsAtom);
  const { data: userData, isPending: userStatsPending } =
    useAtomValue(userStatsAtom);

  const formattedTvlData = (tvlData: number) => {
    if (tvlData >= 1000000) {
      return `${(tvlData / 1000000).toFixed(2)}m`;
    } else if (tvlData >= 1000) {
      return `${(tvlData / 1000).toFixed(2)}k`;
    }
    return `${tvlData.toString()}`;
  };

  return (
    <Grid
      templateColumns={{ base: 'repeat(1, 1, 1fr)', md: 'repeat(2, 1fr)' }}
      gap="6"
      width="100%"
      marginTop="40px"
    >
      <GridItem display="flex">
        <Card width="100%" padding={'15px 30px'} color="white" bg="color2_50p">
          <Stat>
            <StatLabel>Total Value locked (TVL)</StatLabel>
            <StatNumber>
              $
              {isPending ? (
                <Spinner size="sm" color="white" marginLeft={'5px'} />
              ) : data !== undefined ? (
                formattedTvlData(Number(data.tvl))
              ) : (
                '0'
              )}
            </StatNumber>
          </Stat>
        </Card>
      </GridItem>

      <GridItem display="flex">
        <Card width="100%" padding={'15px 30px'} color="white" bg="color2_50p">
          <Stat>
            <StatLabel>Your holdings</StatLabel>
            <StatNumber>
              $
              {userStatsPending ? (
                <Spinner size="sm" color="white" marginLeft={'5px'} />
              ) : !userData ? (
                0
              ) : (
                Number(userData?.holdingsUSD.toFixed(2)).toLocaleString()
              )}
            </StatNumber>
          </Stat>
        </Card>
      </GridItem>
    </Grid>
  );
};

export default TVL;
