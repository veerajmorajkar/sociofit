import { api } from './api';

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export async function autocompletePlaces(query: string): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query.trim() });
  const res = await api.get<PlaceSuggestion[]>(`/places/autocomplete?${params.toString()}`);
  if (!res.success) throw new Error(res.error ?? 'Location search failed');
  return res.data ?? [];
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const params = new URLSearchParams({ placeId });
  const res = await api.get<PlaceDetails>(`/places/details?${params.toString()}`);
  if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load place');
  return res.data;
}

export async function getPlacesStatus(): Promise<{ configured: boolean }> {
  const res = await api.get<{ configured: boolean }>('/places/status');
  if (!res.success || !res.data) return { configured: false };
  return res.data;
}
