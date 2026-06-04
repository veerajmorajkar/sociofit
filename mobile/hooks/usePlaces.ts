import { useQuery } from '@tanstack/react-query';
import { autocompletePlaces, getPlacesStatus } from '@/services/places.service';

export function usePlacesStatus() {
  return useQuery({
    queryKey: ['places', 'status'],
    queryFn: getPlacesStatus,
    staleTime: 1000 * 60 * 10,
  });
}

export function usePlaceAutocomplete(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['places', 'autocomplete', trimmed],
    queryFn: () => autocompletePlaces(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 60,
  });
}
