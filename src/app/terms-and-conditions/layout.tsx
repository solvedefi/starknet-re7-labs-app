import { ReactNode } from 'react';
import { Container } from '@chakra-ui/react';

export default function MdxLayout({ children }: { children: ReactNode }) {
  return (
    <Container color="white" maxW="700px" px={6}>
      {children}
    </Container>
  );
}
