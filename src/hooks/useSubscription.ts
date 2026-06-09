import { useQuery } from '@tanstack/react-query';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { getSubscription, getSubscriptionSummary } from '@/lib/api';

export interface SubscriptionData {
  id: string;
  organization_id: string;
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
  pages_limit: number;
  pages_used: number;
  pages_remaining: number;
  simple_interactions_limit: number;
  simple_interactions_used: number;
  simple_interactions_remaining: number;
  complex_interactions_limit: number;
  complex_interactions_used: number;
  complex_interactions_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface UsageSummary {
  credits: {
    total: number;
    used: number;
    remaining: number;
    percentage: number;
  };
  pages: {
    total: number;
    used: number;
    remaining: number;
    percentage: number;
  };
  simple_interactions: {
    total: number;
    used: number;
    remaining: number;
    percentage: number;
  };
  complex_interactions: {
    total: number;
    used: number;
    remaining: number;
    percentage: number;
  };
}

/**
 * Hook to fetch organization subscription details.
 * 
 * Usage:
 *   const { subscription, isLoading } = useSubscription();
 *   console.log(subscription.credits_remaining);
 */
export function useSubscription() {
  const { getToken, isAuthenticated } = useKindeAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('No auth token');
      return getSubscription(token);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    throwOnError: false,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  return {
    subscription: data as SubscriptionData | undefined,
    isLoading,
    error,
    isError: !!error,
    refetch,
  };
}

/**
 * Hook to fetch subscription usage summary (with percentages).
 * Better for dashboard widgets and progress bars.
 * 
 * Usage:
 *   const { summary, isLoading } = useSubscriptionSummary();
 *   <ProgressBar value={summary.credits.percentage} />
 */
export function useSubscriptionSummary() {
  const { getToken, isAuthenticated } = useKindeAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription-summary'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('No auth token');
      return getSubscriptionSummary(token);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    throwOnError: false,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds for live dashboard updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  return {
    summary: data as UsageSummary | undefined,
    isLoading,
    error,
    isError: !!error,
    refetch,
  };
}
