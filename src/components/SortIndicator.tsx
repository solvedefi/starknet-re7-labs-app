import { ArrowUpIcon } from '@chakra-ui/icons';
import arrowsUpDownIcon from '@/assets/arrows-up-down.svg';
import { Image } from '@chakra-ui/react';

export type SortColumn = 'name' | 'apy' | 'tvl';
export type SortDirection = 'asc' | 'desc';

interface SortIndicatorProps {
  column: SortColumn;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  isHovered: boolean;
}

export function SortIndicator({
  column,
  sortColumn,
  sortDirection,
  isHovered = false,
}: SortIndicatorProps) {
  const arrowOpacity = sortColumn !== column ? 0 : 1;
  const transition = arrowOpacity ? 'transform 0.2s ease' : undefined;

  return isHovered && !arrowOpacity ? (
    <Image
      src={arrowsUpDownIcon.src}
      alt="arrows-up-down"
      width="12px"
      height="12px"
      display="inline"
      marginLeft="8px"
      filter="invert(62%) sepia(6%) saturate(1012%) hue-rotate(130deg) brightness(92%) contrast(88%)"
    />
  ) : (
    <ArrowUpIcon
      width="12px"
      height="12px"
      marginLeft="8px"
      display="inline"
      transform={sortDirection === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)'}
      transition={transition}
      color="#8A9B9B"
      opacity={arrowOpacity}
    />
  );
}
