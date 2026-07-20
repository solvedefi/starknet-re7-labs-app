import { ReactNode } from 'react';

export default function MdxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[960px] px-6 py-12 font-sans text-[15px] text-white">
      {children}
    </div>
  );
}
