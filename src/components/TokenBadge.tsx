import { Badge, Center, Flex, Text, Image } from '@chakra-ui/react';

type TokenBadgeProps = {
  symbol: string;
  iconSrc: string;
};

export default function TokenBadge(props: TokenBadgeProps) {
  return (
    <Badge
      width={'111px'}
      height={'100%'}
      bgColor={'#212121'}
      borderColor={'#363636'}
      borderWidth={'1px'}
      borderRadius={'46px'}
      color="#FFF"
    >
      <Flex justifyContent="space-between">
        <Center>
          <Image
            m="10px"
            src={props.iconSrc}
            alt={props.symbol}
            width={'25px'}
          />
          <Text fontSize="15px" align="center" paddingRight={'auto'}>
            {props.symbol}
          </Text>
        </Center>
      </Flex>
    </Badge>
  );
}
