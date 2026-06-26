import { StrategyDetails } from '@/hooks/useStrategiesInfo';
import chart from '@public/chart.png';

type TotalYieldProps = {
  strategies: StrategyDetails[];
};

export const TotalYield = ({ strategies }: TotalYieldProps) => {
  const totalYield = strategies.reduce(
    (acc, strategy) => acc + strategy.yields.amount,
    0,
  );

  return (
    <div className="relative w-full">
      {/* glow */}
      <div
        className="pointer-events-none absolute -inset-1 rounded-[24px] opacity-50 blur-[12px]"
        style={{
          background: 'linear-gradient(to right, #2E45D0, #B1525C)',
        }}
      />
      <div
        className="relative flex h-[180px] w-full justify-between overflow-visible rounded-[14px] border-2 border-transparent px-[42px] py-[26px] text-white"
        style={{
          background:
            'linear-gradient(#1D1D1D, #1D1D1D) padding-box, linear-gradient(to right, #2E45D0, #B1525C) border-box',
        }}
      >
        <div className="relative flex w-full flex-col items-start justify-between self-stretch">
          <div className="flex w-full justify-between">
            <p className="text-[17px] font-medium">My Total Yield</p>
            <img
              src={chart.src}
              alt="pfp"
              className="h-[13px] w-[13px] sm:h-[15px] sm:w-[15px]"
            />
          </div>
          <p className="text-[42px] font-semibold">
            ${(totalYield || 0).toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  );
};
