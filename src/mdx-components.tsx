import type { MDXComponents } from 'mdx/types';
import {
  Heading,
  Text,
  Link,
  UnorderedList,
  OrderedList,
  ListItem,
  Code,
  Divider,
  Box,
} from '@chakra-ui/react';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <Heading as="h1" size="2xl" my={6} scrollMarginTop="80px" {...props} />
    ),
    h2: (props) => (
      <Heading as="h2" size="xl" my={5} scrollMarginTop="80px" {...props} />
    ),
    h3: (props) => (
      <Heading as="h3" size="lg" my={4} scrollMarginTop="80px" {...props} />
    ),
    h4: (props) => (
      <Heading as="h4" size="md" my={3} scrollMarginTop="80px" {...props} />
    ),
    p: (props) => <Text my={4} lineHeight="tall" {...props} />,
    a: (props) => <Link color="purple" {...props} />,
    ul: (props) => <UnorderedList my={4} pl={4} {...props} />,
    ol: (props) => <OrderedList my={4} pl={4} {...props} />,
    li: (props) => <ListItem my={1} {...props} />,
    code: (props) => <Code px={2} py={1} rounded="md" {...props} />,
    hr: () => <Divider my={6} />,
    blockquote: (props) => (
      <Box
        as="blockquote"
        borderLeftWidth={4}
        borderLeftColor="gray.500"
        pl={4}
        my={4}
        fontStyle="italic"
        {...props}
      />
    ),
    ...components,
  };
}
