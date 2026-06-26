import React, { useMemo, useState } from 'react';

import { YieldStrategyCard } from './YieldCard';
import { SortColumn, SortDirection } from './SortIndicator';
import { SortableTh } from './SortableTh';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { StrategyDetails } from '@/hooks/useStrategiesInfo';
import { getLiveStatusEnum, StrategyLiveStatus } from '@/strategies/IStrategy';

type StrategiesProps = {
  strategies: StrategyDetails[];
};

type StrategyView = 'live' | 'migrated';

// A strategy is "migrated" when it has been retired or is one of the vaults
// currently under migration (today only the USDC.e vaults). Everything else
// is considered live.
function isMigrated(strat: StrategyDetails) {
  return (
    getLiveStatusEnum(strat.status.number) === StrategyLiveStatus.RETIRED ||
    strat.name.includes('USDC.e')
  );
}

export default function Strategies({ strategies }: StrategiesProps) {
  const [view, setView] = useState<StrategyView>('live');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('tvl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Split strategies by the selected Live / Migrated view.
  const liveStrategies = useMemo(
    () => strategies.filter((strat) => !isMigrated(strat)),
    [strategies],
  );
  const migratedStrategies = useMemo(
    () => strategies.filter(isMigrated),
    [strategies],
  );
  const viewStrategies = view === 'live' ? liveStrategies : migratedStrategies;

  // Apply sorting to the data (copy first — never mutate the source array).
  const sortedStrategies = useMemo(() => {
    if (!sortColumn) return viewStrategies;

    return [...viewStrategies].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          // we want to treat letters and numbers differently, as we want A to be
          // the top of a desc list
          bValue = a.name.toLowerCase();
          aValue = b.name.toLowerCase();
          break;
        case 'apy':
          // Sort by the SAME value shown in the APY column (calculatedApr =
          // fees-derived APR), not the raw API `apy` field — otherwise rows
          // reorder by a hidden number and sorting looks broken.
          aValue = a.calculatedApr;
          bValue = b.calculatedApr;
          break;
        case 'tvl':
          aValue = a.tvlUsd;
          bValue = b.tvlUsd;
          break;
        case 'deposit':
          aValue = a.depositDetails.amount;
          bValue = b.depositDetails.amount;
          break;
        case 'fees':
          aValue = a.fees.amount;
          bValue = b.fees.amount;
          break;
        case 'yield':
          aValue = a.yields.amount;
          bValue = b.yields.amount;
          break;
        case 'volume':
          aValue = a.volume.amount;
          bValue = b.volume.amount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortColumn, sortDirection, viewStrategies]);

  const views: { id: StrategyView; label: string; count: number }[] = [
    { id: 'live', label: 'Live', count: liveStrategies.length },
    { id: 'migrated', label: 'Migrated', count: migratedStrategies.length },
  ];

  return (
    <div className="float-left w-full">
      <div className="float-left w-full px-8 pb-3 pt-6">
        <p className="py-1 text-lg text-white">
          <b>What are strategies?</b>
        </p>
        <p className="mb-4 py-0.5 text-[15px] text-white">
          Strategies are a combination of investment steps that combine various
          pools to maximize yield.
        </p>
      </div>

      <div className="float-left w-full px-8 pb-4">
        <div className="flex gap-2">
          {views.map(({ id, label, count }) => {
            const isSelected = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-sm transition-colors hover:text-white',
                  isSelected
                    ? 'bg-[#2E2E2E] font-bold text-white'
                    : 'text-light_grey',
                )}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <table className="w-full overflow-hidden">
        <thead className="hidden md:table-header-group">
          <tr className="bg-[#131313] text-[15px] text-[#8A9B9B]">
            <SortableTh
              columnId="name"
              selectedColumn={sortColumn}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              <span>Position Name</span>
            </SortableTh>
            <SortableTh
              columnId="deposit"
              selectedColumn={sortColumn}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              <span>Deposit</span>
            </SortableTh>
            <SortableTh
              columnId="yield"
              selectedColumn={sortColumn}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              <span className="whitespace-nowrap">Current Yield</span>
            </SortableTh>
            <SortableTh
              columnId="volume"
              selectedColumn={sortColumn}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              <span>Vol(7D)</span>
            </SortableTh>
            <SortableTh
              columnId="fees"
              selectedColumn={sortColumn}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              <span>Fees(7D)</span>
            </SortableTh>
            <SortableTh
              columnId="apy"
              selectedColumn={sortColumn}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              <span>APY</span>
            </SortableTh>
            <SortableTh
              columnId="tvl"
              selectedColumn={sortColumn}
              sortDirection={sortDirection}
              handleSort={handleSort}
            >
              <span>TVL</span>
            </SortableTh>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedStrategies.map((strat, index) => (
            <YieldStrategyCard key={strat.id} strat={strat} index={index} />
          ))}
        </tbody>
      </table>

      {strategies.length === 0 && (
        <div className="flex flex-col gap-2 p-2">
          <Skeleton className="h-[70px] w-full" />
          <Skeleton className="h-[70px] w-full" />
          <Skeleton className="h-[70px] w-full" />
          <Skeleton className="h-[70px] w-full" />
        </div>
      )}
      {strategies.length > 0 && sortedStrategies.length === 0 && (
        <p className="my-8 w-full text-center text-sm text-light_grey">
          No {view} strategies.
        </p>
      )}

      <div className="float-left w-full px-7 py-4">
        <p className="m-0 w-full py-0.5 text-center text-[13px] text-white">
          More strategies coming soon.
        </p>
      </div>
    </div>
  );
}
