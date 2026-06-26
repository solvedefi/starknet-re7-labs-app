import { dAppStatsAtom, userStatsAtom } from '@/store/utils.atoms';
import { useAtomValue } from 'jotai';
import { Loader2 } from 'lucide-react';
import React from 'react';
import chart from '@public/chart.png';

function StatCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <div className="w-full rounded-[15px] bg-[#1D1D1D] px-[43px] py-[25px] text-white">
        <div className="mb-1 flex items-center justify-between">
          <p className="mt-[3px] text-sm font-medium">{label}</p>
          <img
            src={chart.src}
            alt="pfp"
            className="h-[13px] w-[13px] sm:h-[15px] sm:w-[15px]"
          />
        </div>
        <p className="flex items-center text-2xl font-semibold">{children}</p>
      </div>
    </div>
  );
}

const TVL: React.FC = () => {
  const { data, isPending } = useAtomValue(dAppStatsAtom);
  const { data: userData, isPending: userStatsPending } =
    useAtomValue(userStatsAtom);

  const formattedTvlData = (tvlData: number) => {
    if (tvlData >= 1000000) {
      return `${(tvlData / 1000000).toFixed(2)}m`;
    } else if (tvlData >= 1000) {
      return `${(tvlData / 1000).toFixed(2)}k`;
    }
    return `${tvlData.toString()}`;
  };

  return (
    <div className="mt-10 grid w-full grid-cols-1 gap-6 md:grid-cols-2">
      <StatCard label="Total Value locked (TVL)">
        $
        {isPending ? (
          <Loader2 className="ml-[5px] h-4 w-4 animate-spin" />
        ) : data !== undefined ? (
          formattedTvlData(Number(data.tvl?.toFixed(4) ?? 0))
        ) : (
          '0'
        )}
      </StatCard>

      <StatCard label="Total Position Value">
        $
        {userStatsPending ? (
          <Loader2 className="ml-[5px] h-4 w-4 animate-spin" />
        ) : !userData ? (
          0
        ) : (
          Number(userData?.holdingsUSD.toFixed(2)).toLocaleString()
        )}
      </StatCard>
    </div>
  );
};

export default TVL;
