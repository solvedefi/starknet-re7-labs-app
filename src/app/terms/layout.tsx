import TncSignBar from '@/components/TncSignBar';
import TncSignedNotice from '@/components/TncSignedNotice';
import { ReactNode } from 'react';

export default function MdxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[960px] px-6 pb-32 pt-12 font-sans text-[15px] text-white">
      {children}
      <TncSignedNotice />
      <TncSignBar />
    </div>
  );
}
