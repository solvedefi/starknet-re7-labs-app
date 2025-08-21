import { Th, Flex } from '@chakra-ui/react';
import { SortColumn, SortDirection, SortIndicator } from './SortIndicator';
import { ReactNode, useState } from 'react';

type SortableTitleProps = {
  columnId: SortColumn;
  selectedColumn: SortColumn | null;
  sortDirection: SortDirection;
  children: ReactNode;
  handleSort: (columnId: SortColumn) => void;
};

export const SortableTitle = ({
  columnId,
  selectedColumn,
  sortDirection,
  handleSort,
  children,
}: SortableTitleProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <Th
      cursor="pointer"
      onClick={() => handleSort(columnId)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Flex alignItems="center" justifyContent="flex-start">
        {children}
        <SortIndicator
          column={columnId}
          sortColumn={selectedColumn}
          sortDirection={sortDirection}
          isHovered={isHovered}
        />
      </Flex>
    </Th>
  );
};
