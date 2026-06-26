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

  return (
    <th
      className="cursor-pointer whitespace-nowrap px-6 py-3 text-left align-middle"
      onClick={() => handleSort(columnId)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-start">
        {children}
        <SortIndicator
          column={columnId}
          sortColumn={selectedColumn}
          sortDirection={sortDirection}
          isHovered={isHovered}
        />
      </div>
    </th>
  );
};
