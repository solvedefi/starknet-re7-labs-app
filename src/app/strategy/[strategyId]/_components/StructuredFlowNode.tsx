import { Box, Flex, VStack, Text } from '@chakra-ui/react';
import { IInvestmentFlow } from '@strkfarm/sdk';
import { Handle, Position } from '@xyflow/react';

type StructuredFlowNodeProps = {
  flow: IInvestmentFlow;
};

export const StructuredFlowNode = ({ flow }: StructuredFlowNodeProps) => {
  const isRightNode = flow.title.includes('/');
  return (
    <Box
      position="relative"
      padding="10px"
      borderRadius="25px"
      background={
        isRightNode
          ? `
          linear-gradient(#1A1A1A, #1A1A1A) padding-box,
          linear-gradient(to right, #2E45D0, #B1525C) border-box
        `
          : `
          linear-gradient(#1A1A1A, #1A1A1A) padding-box,
          linear-gradient(to right, #372C57, #B1525C) border-box
        `
      }
      border="2px dashed transparent"
      color="white"
      fontSize="12px"
      minHeight="120px"
      width="100%"
      height="100%"
      alignItems="end"
      textAlign="end"
      fontWeight="300"
      boxSizing="border-box"
      display="flex"
      flexDirection="column"
      justifyContent="right"
      whiteSpace="nowrap"
      overflow="hidden"
    >
      <Handle
        type="source"
        position={isRightNode ? Position.Left : Position.Right}
        style={{
          pointerEvents: 'none',
          background: isRightNode ? '#2E45D0' : '#B1525C',
          border: '2px solid #1A2B8A',
          width: '15px',
          height: isRightNode ? '40px' : '20px',
          zIndex: 10,
          borderRadius: '40%',
        }}
      />
      <VStack p={'20px'} alignItems={isRightNode ? 'flex-start' : 'flex-end'}>
        <Text fontWeight={'600'} fontSize={'18px'}>
          {flow.title}
        </Text>
        <Flex justifyContent={'space-between'} gap={'20px'}>
          <VStack alignItems={'flex-end'}>
            {flow.subItems.map((item) => (
              <Text key={item.key} fontSize={'12px'} fontWeight={'300'}>
                {item.key}{' '}
              </Text>
            ))}
          </VStack>
          <VStack alignItems={'flex-start'}>
            {flow.subItems.map((item) => (
              <Text key={item.key} fontWeight={'700'} fontSize={'12px'}>
                {item.value}
              </Text>
            ))}
          </VStack>
        </Flex>
      </VStack>
    </Box>
  );
};
