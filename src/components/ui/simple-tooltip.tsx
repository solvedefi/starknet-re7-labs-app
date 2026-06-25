'use client';

import * as React from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

// Ergonomic wrapper that mirrors Chakra's <Tooltip label=...>{child}</Tooltip>.
// Self-contained (includes its own provider) so it works anywhere.
export function SimpleTooltip({
  label,
  children,
  className,
  hasArrow,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hasArrow?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className={className}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
