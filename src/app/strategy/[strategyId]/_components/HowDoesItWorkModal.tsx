import { StrategyInfo } from '@/store/strategies.atoms';
import { getUniqueById } from '@/utils';
import { CloseIcon } from '@chakra-ui/icons';
import {
  Box,
  Wrap,
  Text,
  Avatar,
  Center,
  WrapItem,
  Modal,
  useDisclosure,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Heading,
} from '@chakra-ui/react';

function cutLongDescription(description: string) {
  const maxLength = 300;
  if (description.length > maxLength) {
    const nextSpaceIndex = description.indexOf(' ', maxLength);
    if (nextSpaceIndex === -1) {
      return { description, isTruncated: false };
    }

    const cutDescription = description.slice(0, nextSpaceIndex).trim();
    const sentenceEnd = description.at(-1) === '.';
    return {
      description: `${cutDescription}${sentenceEnd ? '..' : '...'}`,
      isTruncated: true,
    };
  }
  return { description, isTruncated: false };
}

type HowDoesItWorkModalProps = {
  strategy: StrategyInfo<any>;
};

export const HowDoesItWorkModal = ({ strategy }: HowDoesItWorkModalProps) => {
  const { isOpen, onClose, onOpen } = useDisclosure();
  const { description, isTruncated } = cutLongDescription(strategy.description);
  return (
    <Box display={{ base: 'block', md: 'flex' }} marginTop={'20px'}>
      <Box width={{ base: '100%', md: '100%' }}>
        <Heading fontSize={'20px'} marginBottom={'0px'} fontWeight={600}>
          How does it work?
        </Heading>
        <Text
          fontFamily="light"
          color="#FFF"
          marginBottom="5px"
          fontSize={'14px'}
        >
          {description}
        </Text>
        <Wrap>
          {getUniqueById(
            strategy.actions.map((p) => ({
              id: p.pool.protocol.name,
              logo: p.pool.protocol.logo,
            })),
          ).map((p) => (
            <WrapItem marginRight={'10px'} key={p.id}>
              <Center>
                <Avatar
                  size="2xs"
                  bg={'black'}
                  src={p.logo}
                  marginRight={'2px'}
                />
                <Text marginTop={'2px'}>{p.id}</Text>
              </Center>
            </WrapItem>
          ))}
        </Wrap>
        <Text
          display={isTruncated ? 'block' : 'none'}
          _hover={{ cursor: 'pointer', textDecoration: 'underline' }}
          color="#FFFFFF"
          fontWeight="bold"
          fontSize={15}
          onClick={onOpen}
        >
          {'Learn More >'}
        </Text>
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          scrollBehavior="inside"
          isCentered
        >
          <ModalOverlay />
          <ModalContent
            maxWidth={512}
            maxHeight={484}
            bg="#1D1D1D"
            boxShadow="0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a;"
            color="#FFFFFF"
            borderRadius="10px"
            border="1px solid #FFFFFF"
          >
            <ModalHeader paddingX={25} pt={25} pb="14px">
              How does {strategy.name} work?
            </ModalHeader>
            <ModalCloseButton w="16px" h="16px" right="17px" top="17px">
              <CloseIcon h="8px" w="8px" />
            </ModalCloseButton>
            <ModalBody
              paddingX="25px"
              pt={0}
              pb={5}
              sx={{
                '&::-webkit-scrollbar-button': {
                  display: 'none',
                },
                // Scrollbar width
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                // Scrollbar thumb (the draggable part)
                '&::-webkit-scrollbar-thumb': {
                  bg: 'var(--chakra-colors-tertiary)',
                  borderRadius: 'md',
                },
                // Scrollbar track (the background)
                '&::-webkit-scrollbar-track': {
                  bg: 'transparent',
                },
              }}
            >
              <Text
                fontFamily="light"
                color="#FFF"
                fontSize="13px"
                lineHeight="20px"
              >
                {strategy.description}
              </Text>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </Box>
  );
};
