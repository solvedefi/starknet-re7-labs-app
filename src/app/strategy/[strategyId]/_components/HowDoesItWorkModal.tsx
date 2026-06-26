import { StrategyInfo } from '@/store/strategies.atoms';
import { getUniqueById } from '@/utils';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function cutLongDescription(description: string) {
  const maxLength = 300;
  if (description.length > maxLength) {
    const nextSpaceIndex = description.indexOf(' ', maxLength);
    if (nextSpaceIndex === -1) {
      return { description, isTruncated: false };
    }

    const cutDescription = description.slice(0, nextSpaceIndex).trim();
    const sentenceEnd = description.at(-1) === '.';
    return {
      description: `${cutDescription}${sentenceEnd ? '..' : '...'}`,
      isTruncated: true,
    };
  }
  return { description, isTruncated: false };
}

type HowDoesItWorkModalProps = {
  strategy: StrategyInfo<any>;
};

export const HowDoesItWorkModal = ({ strategy }: HowDoesItWorkModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { description, isTruncated } = cutLongDescription(strategy.description);
  return (
    <div className="mt-5 block md:flex">
      <div className="w-full">
        <h3 className="mb-0 text-xl font-semibold">How does it work?</h3>
        <p className="mb-[5px] font-light text-sm text-white">{description}</p>
        <div className="flex flex-wrap gap-2">
          {getUniqueById(
            strategy.actions.map((p) => ({
              id: p.pool.protocol.name,
              logo: p.pool.protocol.logo,
            })),
          ).map((p) => (
            <div className="mr-2.5 flex items-center" key={p.id}>
              <Avatar className="mr-0.5 h-4 w-4 bg-black">
                <AvatarImage src={p.logo} />
                <AvatarFallback />
              </Avatar>
              <p className="mt-0.5">{p.id}</p>
            </div>
          ))}
        </div>
        <p
          className={cn(
            'cursor-pointer text-[15px] font-bold text-white hover:underline',
            isTruncated ? 'block' : 'hidden',
          )}
          onClick={() => setIsOpen(true)}
        >
          {'Learn More >'}
        </p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-h-[484px] max-w-[512px] overflow-y-auto rounded-[10px] border border-white bg-[#1D1D1D] text-white">
            <DialogHeader>
              <DialogTitle>How does {strategy.name} work?</DialogTitle>
            </DialogHeader>
            <p className="font-light text-[13px] leading-5 text-white">
              {strategy.description}
            </p>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
