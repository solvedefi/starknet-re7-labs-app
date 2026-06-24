import { redirect } from 'next/navigation';

interface StrategyPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const StrategyPage = async ({ searchParams }: StrategyPageProps) => {
  const params = await searchParams;
  if (params?.id === 'strk_sensei') {
    redirect('/strategy/strk_sensei');
  } else if (params?.id === 'usdc_sensei') {
    redirect('/strategy/usdc_sensei');
  } else if (params?.id === 'eth_sensei') {
    redirect('/strategy/eth_sensei');
  } else if (params?.id === 'auto_token_strk') {
    redirect('/strategy/auto_token_strk');
  } else if (params?.id === 'auto_token_usdc') {
    redirect('/strategy/auto_token_usdc');
  }

  return <div>Page not found</div>;
};

export default StrategyPage;
