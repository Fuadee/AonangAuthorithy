import type { LatLng } from '@/lib/maps/distance';

export function buildGoogleMapsDirectionsUrl(destination: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
}
