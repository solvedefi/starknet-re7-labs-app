import Deposit from '@/components/Deposit';
import Redeem from '@/components/Redeem';
import { StrategyInfo } from '@/store/strategies.atoms';
import { ReactNode, useState } from 'react';
import info from '@public/info.png';
import { cn } from '@/lib/utils';

interface TokenDepositProps {
  strategy: StrategyInfo<any>;
  isDualToken?: boolean;
}

function AlertRow({ text }: { text: ReactNode }) {
  return (
    <div className="flex items-center rounded-[10px] bg-[#2D2D2D] p-2.5 text-[12px] text-[#8E8E8E]">
      <img
        src={info.src}
        alt="info icon"
        className="mr-[15px] h-[15px] w-[15px]"
      />
      {text}
    </div>
  );
}

export function TokenDeposit(props: TokenDepositProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const { strategy } = props;
  const tabs = ['DEPOSIT', 'WITHDRAW'];

  return (
    <div className="w-full rounded-md bg-[#212121] p-[22px] text-white">
      <div className="relative w-full">
        <div className="flex">
          {tabs.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setTabIndex(i)}
              className={cn(
                'relative mx-2.5 px-0 pb-2 text-[12px]',
                tabIndex === i ? 'text-white' : 'text-[#5C5959]',
              )}
            >
              <span className="block w-full text-center">{label}</span>
              {tabIndex === i && (
                <span
                  className="absolute bottom-0 left-0 h-0.5 w-full rounded-[1px]"
                  style={{
                    background: 'linear-gradient(to right, #2E45D0, #B1525C)',
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="mt-5 w-full py-2.5">
          {tabIndex == 0 && (
            <>
              <Deposit
                strategy={strategy}
                buttonText="Deposit"
                callsInfo={strategy.depositMethods}
                isDualToken={props.isDualToken || false}
              />
              {strategy.settings.alerts != undefined && (
                <div className="flex flex-col gap-2">
                  {strategy.settings.alerts
                    .filter((a) => a.tab == 'deposit' || a.tab == 'all')
                    .map((alert, index) => (
                      <AlertRow key={index} text={alert.text} />
                    ))}
                </div>
              )}
            </>
          )}
          {tabIndex == 1 && (
            <>
              <Redeem
                strategy={strategy}
                buttonText="Redeem"
                callsInfo={strategy.withdrawMethods}
                isDualToken={props.isDualToken || false}
              />
              {strategy.settings.alerts != undefined && (
                <div className="mt-5 flex flex-col gap-2">
                  {strategy.settings.alerts
                    .filter((a) => a.tab == 'withdraw' || a.tab == 'all')
                    .map((alert, index) => (
                      <AlertRow key={index} text={alert.text} />
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
