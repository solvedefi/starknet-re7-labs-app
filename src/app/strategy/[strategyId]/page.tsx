import { getStrategies } from '@/store/strategies.atoms';
import Strategy from './_components/Strategy';

export type StrategyParams = {
  params: { strategyId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

type StrategyPageProps = {
  params: Promise<{ strategyId: string }>;
};

export async function generateMetadata({ params }: StrategyPageProps) {
  const { strategyId } = await params;
  const strategies = getStrategies();
  const strategy = strategies.find((s) => s.id === strategyId);
  if (strategy) {
    return {
      title: `${strategy.name} | Re7 Labs`,
      description: strategy.description,
    };
  }

  return {
    title: 'Yield Strategy | Re7 Labs',
    description:
      "Re7 Labs's yield strategies are designed to maximize your yield farming returns. Stake your assets in our strategies to earn passive income while we take care of the rest.",
  };
}

export default async function StrategyPage({ params }: StrategyPageProps) {
  const { strategyId } = await params;
  return (
    <div className="mx-auto max-w-[1000px] px-2.5 py-[30px]">
      <Strategy params={{ strategyId }} />
    </div>
  );
}
