import { Th, Flex } from '@chakra-ui/react';
import { SortColumn, SortDirection, SortIndicator } from './SortIndicator';
import { ReactNode, useState } from 'react';

type SortableThProps = {
  columnId: SortColumn;
  selectedColumn: SortColumn | null;
  sortDirection: SortDirection;
  handleSort: (columnId: SortColumn) => void;
  defaultSortDirection?: SortDirection;
  children: ReactNode;
};

export const SortableTh = ({
  columnId,
  selectedColumn,
  sortDirection,
  handleSort,
  children,
}: SortableThProps) => {
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
