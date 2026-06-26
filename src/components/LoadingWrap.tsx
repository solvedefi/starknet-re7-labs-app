import { TriangleAlert } from 'lucide-react';
import React from 'react';
import { Skeleton } from './ui/skeleton';

type LoadingWrapProps = {
  isLoading: boolean;
  isError: boolean;
  // Permissive: callers may still pass Chakra-style props during the migration.
  skeletonProps?: {
    height?: string | number;
    width?: string | number;
    className?: string;
  } & Record<string, any>;
  iconProps?: Record<string, any>;
};

export default function LoadingWrap(
  props: React.PropsWithChildren<LoadingWrapProps>,
) {
  if (props.isLoading) {
    const { height, width, className } = props.skeletonProps || {};
    return <Skeleton className={className} style={{ height, width }} />;
  }
  if (props.isError) return <TriangleAlert className="h-4 w-4 text-yellow" />;

  return <>{props.children}</>;
}
