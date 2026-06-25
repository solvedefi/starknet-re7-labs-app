import { ReactNode } from 'react';

export default function MdxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[700px] px-6 pb-12 text-white">{children}</div>
  );
}
