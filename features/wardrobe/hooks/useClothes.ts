import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { clothingService } from '../services/clothingService';

const SIGNED_URL_TTL = 15 * 60 * 1000; // 15 min — must stay <= SIGNED_URL_EXPIRY (900s)

export function useClothes(profileId: string | null) {
  return useQuery({
    queryKey: queryKeys.clothes.list(profileId ?? ''),
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await clothingService.getClothes(profileId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000, // 10 min — refetch before signed URLs expire
    gcTime: SIGNED_URL_TTL, // 15 min — discard cache when URLs expire
  });
}
