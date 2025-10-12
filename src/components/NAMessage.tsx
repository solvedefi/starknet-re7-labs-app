import { Text, TextProps } from '@chakra-ui/react';

export const NAMessage = (props: TextProps) => {
  return (
    <Text color="#8A9B9B" {...props}>
      N/A
    </Text>
  );
};
