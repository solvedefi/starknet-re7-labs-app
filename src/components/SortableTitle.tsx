import { Th, Text } from '@chakra-ui/react';
import { SortColumn, SortDirection, SortIndicator } from './SortIndicator';
import { ReactNode } from 'react';

type SortableTitleProps = {
  titleText: SortColumn;
  selectedColumn: SortColumn;
  sortDirection: SortDirection;
  children: ReactNode;
};

const SortableTitle = ({
  titleText,
  selectedColumn,
  sortDirection,
  children,
}: SortableTitleProps) => {
  return (
    <Th>
      <Text>{titleText}</Text>
      <SortIndicator
        column={titleText}
        sortColumn={selectedColumn}
        sortDirection={sortDirection}
      />
    </Th>
  );
};
