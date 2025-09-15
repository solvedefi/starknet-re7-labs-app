import { Container, Flex, Text, VStack, Image } from '@chakra-ui/react';
import { StrategyDetails } from '@/hooks/useStrategiesInfo';
import chart from '@public/chart.png';

type TotalYieldProps = {
  strategies: StrategyDetails[];
};

export const TotalYield = ({ strategies }: TotalYieldProps) => {
  const totalYield = strategies.reduce(
    (acc, strategy) => acc + strategy.yields.amount,
    0,
  );

  return (
    <Container
      position="relative"
      p={0}
      _before={{
        content: '""',
        position: 'absolute',
        inset: '-4px', // Extend beyond the container for glow
        borderRadius: '24px', // Slightly larger than container (14px + 20px)
        background: 'linear-gradient(to right, #2E45D0, #B1525C)',
        filter: 'blur(12px)',
        opacity: 0.5, // Make it more subtle
        zIndex: 0,
      }}
    >
      <Container
        position="relative"
        background="linear-gradient(#1D1D1D, #1D1D1D) padding-box, linear-gradient(to right, #2E45D0, #B1525C) border-box"
        border="2px solid transparent"
        width={'100%'}
        h="180px"
        display={'flex'}
        justifyContent={'space-between'}
        color="#FFF"
        padding="26px 42px"
        overflow="visible"
        borderRadius="14px"
      >
        <VStack
          gap="auto"
          alignItems="flex-start"
          justifyContent="space-between"
          alignSelf="stretch"
          position="relative"
          width={'100%'}
        >
          <Flex justifyContent={'space-between'} width={'100%'}>
            <Text fontSize="17px" fontWeight="500">
              My Total Yield
            </Text>
            <Image
              src={chart.src}
              alt="pfp"
              width={{ base: '13px', sm: '15px' }}
              height={{ base: '13px', sm: '15px' }}
            />
          </Flex>
          <Text fontSize="42px" fontWeight="600">
            ${(totalYield || 0).toFixed(3)}
          </Text>
        </VStack>
      </Container>
    </Container>
  );
};
