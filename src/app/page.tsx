'use client';

import Strategies from '@/components/Strategies';
import TVL from '@/components/TVL';
import arrow from '@public/arrow_left.png';

import mixpanel from 'mixpanel-browser';
import { useEffect } from 'react';
import { TotalYield } from '@/components/TotalYield';
import { StrategyDetails } from '@/hooks/useStrategiesInfo';
import { useSelector } from 'react-redux';
import { selectAllStrategiesAsArray } from '@/redux/features/strategySlice';
import { RootState } from '@/redux/store';

export default function Home() {
  const strategies: StrategyDetails[] = useSelector((state: RootState) =>
    selectAllStrategiesAsArray(state),
  );

  useEffect(() => {
    mixpanel.track('Page open');
  }, []);

  return (
    <div className="mx-auto max-w-[1264px]">
      <div className="mx-auto flex w-full max-w-[1069px] flex-col gap-[22px] pb-[38px]">
        <TVL />
        <TotalYield strategies={strategies} />
      </div>

      <div className="relative mt-[10px] w-full">
        <div className="inline-block">
          <button
            type="button"
            className="flex w-full items-center px-7 py-2 text-white"
            onClick={() => mixpanel.track('Strategies opened')}
          >
            <p>STRATEGIES</p>
            <img
              src={arrow.src}
              alt="logo"
              className="mb-0.5 ml-[30px] h-[13px]"
            />
          </button>
          <div
            className="h-[3px] w-full rounded-[1px]"
            style={{
              background: 'linear-gradient(to right, #2E45D0, #B1525C)',
            }}
          />
        </div>

        <div className="float-left w-full overflow-x-auto bg-[#171717] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Strategies strategies={strategies} />
        </div>
      </div>
    </div>
  );
}
