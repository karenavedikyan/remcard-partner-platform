import ngeohash from "ngeohash";

/** Encode coordinates to geohash 5 chars (~5 km), same contract as remcard-navigator. */
export function encodeGeohash5(lat: number, lon: number): string {
  return String(ngeohash.encode(lat, lon, 5)).toLowerCase();
}

export function validateGeohash5(gh: unknown): gh is string {
  return typeof gh === "string" && /^[0-9bcdefghjkmnpqrstuvwxyz]{5}$/.test(gh);
}
