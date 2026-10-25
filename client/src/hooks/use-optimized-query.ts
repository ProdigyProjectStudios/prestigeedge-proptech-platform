import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { memoizeWithTTL } from '@/lib/performance';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  cacheTime?: number;
  staleTime?: number;
}

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  cacheTime = 5 * 60 * 1000, // 5 minutes
  staleTime = 30 * 1000, // 30 seconds
  ...options
}: OptimizedQueryOptions<T>) {
  return useQuery({
    queryKey,
    queryFn: () => memoizeWithTTL(queryKey.join('-'), queryFn),
    cacheTime,
    staleTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
}