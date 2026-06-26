import shield from '@public/shield.svg';
import { addressAtom } from '@/store/claims.atoms';
import { isPoolRetired, PoolInfo } from '@/store/pools';
import { getPoolInfoFromStrategy } from '@/store/protocols';
import { UserStats, userStatsAtom } from '@/store/utils.atoms';
import { isLive, StrategyLiveStatus } from '@/strategies/IStrategy';
import { getDisplayCurrencyAmount } from '@/utils';
import { ContractAddr } from '@strkfarm/sdk';
import { useAtomValue } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { useMemo } from 'react';
import { FaWallet } from 'react-icons/fa';
import { Loader2, TriangleAlert } from 'lucide-react';
import arrow from '@public/arrow_left.png';
import { useRouter } from 'next/navigation';
import { StrategyDetails } from '@/hooks/useStrategiesInfo';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { SimpleTooltip } from './ui/simple-tooltip';
import { cn } from '@/lib/utils';

interface YieldCardProps {
  pool: PoolInfo;
  index: number;
  showProtocolName?: boolean;
  onClick?: (strategyId: string) => void;
}

function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

function getStratCardBg(status: StrategyLiveStatus, index: number) {
  if (status == StrategyLiveStatus.HOT) {
    return 'bg-[#414173]';
  }
  if (isLive(status)) {
    return index % 2 === 0 ? 'bg-color1_50p' : 'bg-color2_50p';
  }
  if (status == StrategyLiveStatus.RETIRED) {
    return 'bg-black';
  }
  return 'bg-bg';
}

function AvatarGroup({ logos, size }: { logos: string[]; size: number }) {
  return (
    <div className="flex -space-x-2">
      {logos.slice(0, 3).map((logo, index) => (
        <Avatar
          key={index}
          className="border-2 border-[#212121]"
          style={{ width: size, height: size }}
        >
          <AvatarImage src={logo} />
          <AvatarFallback />
        </Avatar>
      ))}
    </div>
  );
}

function StrategyInfo(props: YieldCardProps) {
  const { pool } = props;

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="mr-2.5">
          <AvatarGroup logos={pool.pool.logos} size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="mt-0.5 font-heading text-sm font-bold">
              {pool.pool.name}
            </h3>
            {pool.additional && pool.additional.auditUrl && (
              <SimpleTooltip label="Audited smart contract. Click to view the audit report.">
                <a
                  href={pool.additional.auditUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20">
                    <img src={shield.src} alt="badge" />
                  </span>
                </a>
              </SimpleTooltip>
            )}
            {pool.pool.name.includes('USDC.e') && (
              <SimpleTooltip label="Vault currently under migration">
                <span>
                  <TriangleAlert className="h-4 w-4 text-orange-400" />
                </span>
              </SimpleTooltip>
            )}
          </div>
          {props.showProtocolName && (
            <div className="mt-1 flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={pool.protocol.logo} />
                <AvatarFallback />
              </Avatar>
              <h4 className="mt-0.5 font-heading text-xs text-light_grey">
                {pool.protocol.name}
              </h4>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getAPRWithToolTip(pool: PoolInfo) {
  const tip = (
    <div className="w-[300px]">
      {pool.aprSplits.map((split) => {
        return (
          <div className="my-1 flex justify-between" key={split.title}>
            <div>
              <p>{split.title}:</p>
              <p className="text-xs opacity-70">{split.description}</p>
            </div>
            <p className="font-bold">
              {split.apr === 'Err' ? split.apr : (split.apr * 100).toFixed(2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
  return (
    <SimpleTooltip label={tip} className="bg-gray-300 text-black">
      <div className="flex justify-start">
        {pool.isLoading && <Spinner />}
        {!pool.isLoading && (
          <p className="text-right text-base font-extrabold text-white">
            {(pool.apr * 100).toFixed(2)}%
          </p>
        )}
      </div>
    </SimpleTooltip>
  );
}

function StrategyAPY(props: YieldCardProps) {
  const { pool } = props;
  const isRetired = useMemo(() => {
    return isPoolRetired(pool);
  }, [pool]);

  return (
    <div className="mb-1 w-full items-center">
      {isRetired ? (
        <p className="ml-auto mr-6 w-fit">-</p>
      ) : (
        <div className="justify-start">
          {getAPRWithToolTip(pool)}

          {pool.aprSplits.length &&
            pool.aprSplits.some((a) => a.title == 'Rewards APY') && (
              <SimpleTooltip
                label="Boosted rewards from STRKFarm"
                className="bg-gray-300 text-black"
              >
                <div className="w-full">
                  <div className="float-right flex text-[13px]">
                    <p className="text-right text-[#FCC01E]">⚡</p>
                    <p className="w-full text-right font-semibold text-cyan">
                      Boosted
                    </p>
                  </div>
                </div>
              </SimpleTooltip>
            )}
        </div>
      )}
    </div>
  );
}

function getStrategyWiseHoldingsInfo(
  userData: UserStats | null | undefined,
  id: string,
) {
  const amount = userData?.strategyWise.find((item) => item.id === id);
  const defaultTokenInfo = {
    name: 'N/A',
    symbol: 'N/A',
    address: ContractAddr.from('0x0'),
    decimals: 0,
    logo: '',
    displayDecimals: 2,
  };
  if (!amount) {
    return {
      usdValue: 0,
      amount: 0,
      tokenInfo: defaultTokenInfo,
    };
  }
  return {
    usdValue: amount.usdValue,
    amount: amount.holdings.length ? Number(amount.holdings[0].amount) : 0,
    tokenInfo: amount.holdings.length
      ? amount.holdings[0].tokenInfo
      : defaultTokenInfo,
  };
}

function StrategyTVL(props: YieldCardProps) {
  const { pool } = props;
  const address = useAtomValue(addressAtom);
  const { data: userData } = useAtomValue(userStatsAtom);

  const holdingsInfo = getStrategyWiseHoldingsInfo(userData, pool.pool.id);

  const isPoolLive =
    pool.additional &&
    pool.additional.tags[0] &&
    isLive(pool.additional.tags[0]);

  return (
    <div className="flex w-full flex-col items-start justify-center text-right font-semibold">
      {isPoolLive && (
        <p className="text-base">
          ${getDisplayCurrencyAmount(pool.tvl || 0, 0)}
        </p>
      )}
      {!isPoolLive && <p>-</p>}
      {address && isPoolLive && pool.protocol.name == 'STRKFarm' && (
        <div className="mt-[5px] flex w-full items-center justify-center rounded-[20px] text-xs text-grey_text">
          <SimpleTooltip label="Your deposits in this STRKFarm strategy">
            <div className="w-full font-semibold">
              <div className="flex">
                <p className="w-full justify-end">
                  ${getDisplayCurrencyAmount(holdingsInfo.usdValue, 0)}
                </p>
                <div>
                  <FaWallet className="-mt-0.5 ml-[3px]" />
                </div>
              </div>
              {holdingsInfo.amount != 0 && (
                <div className="-mt-[5px] flex w-full justify-end opacity-50">
                  <p className="text-right text-[11px]">
                    {getDisplayCurrencyAmount(
                      holdingsInfo.amount,
                      holdingsInfo.tokenInfo.displayDecimals,
                    ).toLocaleString()}
                  </p>
                  <img
                    className="ml-1 mr-px w-2.5 grayscale"
                    src={holdingsInfo.tokenInfo.logo}
                    alt=""
                  />
                </div>
              )}
            </div>
          </SimpleTooltip>
        </div>
      )}
    </div>
  );
}

function StrategyMobileCard(props: YieldCardProps) {
  const { pool, index } = props;
  const router = useRouter();
  return (
    <tr className="md:hidden">
      <td colSpan={8} className="p-0">
        <div
          role="link"
          onClick={() => {
            getLinkProps(pool, props.showProtocolName).onClick();
            router.push(`/strategy/${pool.pool.id}`);
          }}
          className={cn(
            'grid cursor-pointer grid-cols-3 gap-2 border-b border-bg p-5 text-white',
            getStratCardBg(
              pool.additional?.tags[0] || StrategyLiveStatus.ACTIVE,
              index,
            ),
          )}
          style={{
            gridTemplateRows: props.showProtocolName
              ? 'repeat(4, 1fr)'
              : 'repeat(3, 1fr)',
          }}
        >
          <div className="col-span-3" style={{ gridRow: 'span 2' }}>
            <StrategyInfo
              pool={pool}
              index={index}
              showProtocolName={props.showProtocolName}
            />
          </div>
          <div className="col-span-1" style={{ gridRow: 'span 2' }}>
            <p className="text-left text-[13px] font-bold text-color2">APY</p>
            <StrategyAPY pool={pool} index={index} />
          </div>
          <div className="col-span-1" style={{ gridRow: 'span 2' }}>
            <p className="text-left text-[13px] font-bold text-color2">TVL</p>
            <StrategyTVL pool={pool} index={index} />
          </div>
        </div>
      </td>
    </tr>
  );
}

function getLinkProps(pool: PoolInfo, showProtocolName?: boolean) {
  return {
    onClick: () => {
      mixpanel.track('Pool clicked', {
        pool: pool.pool.name,
        protocol: pool.protocol.name,
        yield: pool.apr,
        risk: pool.additional.riskFactor,
        tvl: pool.tvl,
        showProtocolName,
      });
    },
  };
}

function YieldCard(props: YieldCardProps) {
  const { pool, index } = props;
  const router = useRouter();

  const isRetired = useMemo(() => {
    return isPoolRetired(pool);
  }, [pool]);

  return (
    <>
      <tr
        onClick={() => {
          getLinkProps(pool, props.showProtocolName).onClick();
          router.push(`/strategy/${pool.pool.id}`);
        }}
        className="hidden cursor-pointer bg-[#212121] text-white [border-bottom:10px_solid_#131313] md:table-row"
      >
        <td className="align-middle [border-left:10px_solid_#131313]">
          <StrategyInfo
            pool={pool}
            index={index}
            showProtocolName={props.showProtocolName}
          />
        </td>
        <td className="align-middle">
          <LoadedNumericalValue {...pool.depositDetails} />
        </td>
        <td className="align-middle">
          <LoadedNumericalValue {...pool.yields} />
        </td>
        <td className="align-middle">
          <LoadedNumericalValue {...pool.volume} />
        </td>
        <td className="align-middle">
          <LoadedNumericalValue {...pool.fees} />
        </td>
        <td className="align-middle">
          <StrategyAPY pool={pool} index={index} />
        </td>
        <td className="align-middle">
          {isRetired ? (
            <p className="ml-auto mr-2 w-fit">-</p>
          ) : (
            <StrategyTVL pool={pool} index={index} />
          )}
        </td>
        <td className="w-[70px] align-middle [border-right:10px_solid_#131313]">
          <img src={arrow.src} alt="logo" className="mb-0.5 h-[13px] w-[9px]" />
        </td>
      </tr>
      <StrategyMobileCard
        pool={pool}
        index={index}
        showProtocolName={props.showProtocolName}
      />
    </>
  );
}

function LoadedNumericalValue({
  amount,
  isLoading = false,
}: {
  amount?: number;
  isLoading?: boolean;
}) {
  if (isLoading) return <Spinner />;
  if (amount === 0 || amount === undefined) return <p>-</p>;
  return <p>${getDisplayCurrencyAmount(amount, 2)}</p>;
}

export function YieldStrategyCard(props: {
  strat: StrategyDetails;
  index: number;
}) {
  const strat = getPoolInfoFromStrategy(props.strat);

  return <YieldCard pool={strat} index={props.index} showProtocolName={true} />;
}
