import { IInvestmentFlow } from '@strkfarm/sdk';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

type StructuredFlowNodeProps = {
  flow: IInvestmentFlow;
};

export const StructuredFlowNode = ({ flow }: StructuredFlowNodeProps) => {
  const isRightNode = flow.title.includes('/');
  return (
    <div
      className="relative box-border flex h-full min-h-[120px] w-full flex-col items-end justify-end overflow-hidden whitespace-nowrap rounded-[25px] border-2 border-dashed border-transparent p-2.5 text-end text-xs font-light text-white"
      style={{
        background: isRightNode
          ? 'linear-gradient(#1A1A1A, #1A1A1A) padding-box, linear-gradient(to right, #2E45D0, #B1525C) border-box'
          : 'linear-gradient(#1A1A1A, #1A1A1A) padding-box, linear-gradient(to right, #372C57, #B1525C) border-box',
      }}
    >
      <Handle
        type="source"
        position={isRightNode ? Position.Left : Position.Right}
        style={{
          pointerEvents: 'none',
          background: isRightNode ? '#2E45D0' : '#B1525C',
          border: '2px solid #1A2B8A',
          width: '15px',
          height: isRightNode ? '40px' : '20px',
          zIndex: 10,
          borderRadius: '40%',
        }}
      />
      <div
        className={cn(
          'flex flex-col gap-2 p-5',
          isRightNode ? 'items-start' : 'items-end',
        )}
      >
        <p className="text-lg font-semibold">{flow.title}</p>
        <div className="flex justify-between gap-5">
          <div className="flex flex-col items-end gap-2">
            {flow.subItems.map((item) => (
              <p key={item.key} className="text-xs font-light">
                {item.key}{' '}
              </p>
            ))}
          </div>
          <div className="flex flex-col items-start gap-2">
            {flow.subItems.map((item) => (
              <p key={item.key} className="text-xs font-bold">
                {item.value}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
