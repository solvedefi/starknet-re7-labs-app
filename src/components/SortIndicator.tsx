import arrowsUpDownIcon from '@public/arrows-up-down.svg';
import { ArrowUp } from 'lucide-react';

export type SortColumn =
  | 'name'
  | 'apy'
  | 'tvl'
  | 'deposit'
  | 'fees'
  | 'yield'
  | 'volume';

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
  const isActive = sortColumn === column;

  return (
    <div className="ml-2 flex h-3 w-3 items-center">
      {isHovered && !isActive ? (
        <img
          src={arrowsUpDownIcon.src}
          alt="arrows-up-down"
          width={12}
          height={12}
          className="inline"
          style={{
            filter:
              'invert(62%) sepia(6%) saturate(1012%) hue-rotate(130deg) brightness(92%) contrast(88%)',
          }}
        />
      ) : (
        <ArrowUp
          width={12}
          height={12}
          className="inline transition-transform"
          style={{
            transform:
              sortDirection === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)',
            color: '#8A9B9B',
            opacity: isActive ? 1 : 0,
          }}
        />
      )}
    </div>
  );
}
