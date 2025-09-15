import { Container, Text, VStack } from '@chakra-ui/react';
import { StrategyDetails } from '@/hooks/useStrategiesInfo';

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
      _before={{
        content: '""',
        position: 'absolute',
        inset: '-2px', // Extend beyond the container for glow
        borderRadius: '24px', // Slightly larger than container (14px + 20px)
        background: 'linear-gradient(to right, #2E45D0, #B1525C)',
        filter: 'blur(12px)',
        opacity: 0.5, // Make it more subtle
        zIndex: 0,
      }}
    >
      <Container
        position="relative"
        background="linear-gradient(#1A1919, #1A1919) padding-box, linear-gradient(to right, #2E45D0, #B1525C) border-box"
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
        >
          <Text fontSize="17px" fontWeight="500">
            My Total Yield
          </Text>
          <Text fontSize="42px" fontWeight="600">
            ${totalYield}
          </Text>
        </VStack>
      </Container>
    </Container>
  );
};
