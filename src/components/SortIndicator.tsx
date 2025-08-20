import { ArrowUpIcon } from '@chakra-ui/icons';

export type SortColumn = 'name' | 'apy' | 'tvl';
export type SortDirection = 'asc' | 'desc';

interface SortIndicatorProps {
  column: SortColumn;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
}

export function SortIndicator({
  column,
  sortColumn,
  sortDirection,
}: SortIndicatorProps) {
  const opacity = sortColumn !== column ? 0 : 1;
  const transition = opacity ? 'transform 0.2s ease' : undefined;
  return (
    <ArrowUpIcon
      width="12px"
      height="12px"
      marginLeft="8px"
      display="inline"
      transform={sortDirection === 'desc' ? 'rotate(0deg)' : 'rotate(180deg)'}
      transition={transition}
      color="#8A9B9B"
      opacity={opacity}
    />
  );
}
