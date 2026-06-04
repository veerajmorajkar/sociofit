import { env } from '../config/env.js';

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

const MUMBAI_CENTER = '19.0760,72.8777';
const MUMBAI_RADIUS_M = 80000;

function apiKey(): string | undefined {
  return env.GOOGLE_PLACES_API_KEY;
}

export function isPlacesConfigured(): boolean {
  return !!apiKey();
}

export async function autocompletePlaces(input: string): Promise<PlaceSuggestion[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  const key = apiKey();
  if (!key) return [];

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', q);
  url.searchParams.set('key', key);
  url.searchParams.set('types', 'establishment|geocode');
  url.searchParams.set('components', 'country:in');
  url.searchParams.set('location', MUMBAI_CENTER);
  url.searchParams.set('radius', String(MUMBAI_RADIUS_M));
  url.searchParams.set('strictbounds', 'false');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Places autocomplete failed');

  const data = (await res.json()) as {
    status: string;
    predictions?: Array<{
      place_id: string;
      description: string;
      structured_formatting?: {
        main_text: string;
        secondary_text?: string;
      };
    }>;
    error_message?: string;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message ?? `Places API: ${data.status}`);
  }

  return (data.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = apiKey();
  if (!key || !placeId.trim()) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('key', key);
  url.searchParams.set('fields', 'place_id,name,formatted_address,geometry');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Places details failed');

  const data = (await res.json()) as {
    status: string;
    result?: {
      place_id: string;
      name: string;
      formatted_address: string;
      geometry?: { location?: { lat: number; lng: number } };
    };
    error_message?: string;
  };

  if (data.status !== 'OK' || !data.result?.geometry?.location) {
    return null;
  }

  const { lat, lng } = data.result.geometry.location;
  return {
    placeId: data.result.place_id,
    name: data.result.name,
    formattedAddress: data.result.formatted_address,
    latitude: lat,
    longitude: lng,
  };
}
