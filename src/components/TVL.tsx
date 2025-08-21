import { dAppStatsAtom, userStatsAtom } from '@/store/utils.atoms';
import {
  Card,
  Container,
  Grid,
  GridItem,
  Image,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Text,
} from '@chakra-ui/react';
import { useAtomValue } from 'jotai';
import React from 'react';
import chart from '@public/chart.png';

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
        <Card
          width="100%"
          padding={'25px 43px'}
          color="#FFFFFF"
          bg="#1D1D1D"
          borderRadius="15px"
        >
          <Stat>
            <StatLabel>
              <Container
                display={'flex'}
                alignItems="center"
                justifyContent={'space-between'}
                padding={'0px'}
              >
                <Text marginTop={'3px'}>Total Value locked (TVL)</Text>
                <Image
                  src={chart.src}
                  alt="pfp"
                  width={{ base: '13px', sm: '15px' }}
                  height={{ base: '13px', sm: '15px' }}
                />
              </Container>
            </StatLabel>
            <StatNumber>
              $
              {isPending ? (
                <Spinner size="sm" color="white" marginLeft={'5px'} />
              ) : data !== undefined ? (
                formattedTvlData(Number(data.tvl?.toFixed(4) ?? 0))
              ) : (
                '0'
              )}
            </StatNumber>
          </Stat>
        </Card>
      </GridItem>

      <GridItem display="flex">
        <Card
          width="100%"
          padding={'25px 43px'}
          color="#FFFFFF"
          bg="#1D1D1D"
          borderRadius="15px"
        >
          <Stat>
            <StatLabel>
              <Container
                display={'flex'}
                alignItems="center"
                justifyContent={'space-between'}
                padding={'0px'}
              >
                <Text marginTop={'3px'}>Total Position Value</Text>
                <Image
                  src={chart.src}
                  alt="pfp"
                  width={{ base: '13px', sm: '15px' }}
                  height={{ base: '13px', sm: '15px' }}
                />
              </Container>
            </StatLabel>
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
