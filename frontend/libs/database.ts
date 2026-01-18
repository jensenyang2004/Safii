import * as SQLite from 'expo-sqlite';
import { haversineDistance } from '@/utils/geo'; // Assuming this utility is available

// 使用新的同步方法開啟資料庫
const db = SQLite.openDatabaseSync('cache.db');

export interface CacheResult {
  cache_key: string; // Add cache_key to interface for consistency
  results: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  keyword: string; // Add keyword to interface
}

/**
 * Initializes the database, creates the cache table if it doesn't exist,
 * and purges records older than 30 days.
 */
export const initDatabase = async () => {
  try {
    // Drop table if it exists to ensure schema is always up-to-date during development
    // For production, a more robust migration strategy would be needed.
    db.execSync(`DROP TABLE IF EXISTS places_cache;`);
    console.log('SQLite: Existing places_cache table dropped (if any).');

    // Create table with new 'keyword' column
    db.execSync(`
      CREATE TABLE IF NOT EXISTS places_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        results TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        keyword TEXT NOT NULL
      );
    `);
    console.log('SQLite: places_cache table initialized.');

    // Auto-Purge: Delete records older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    db.execSync(`DELETE FROM places_cache WHERE timestamp < ${thirtyDaysAgo};`);
    console.log('SQLite: Old cache records purged.');

  } catch (error) {
    console.error('SQLite: Initialization failed', error);
    throw error;
  }
};

/**
 * Finds the closest cached result within a given range and keyword.
 * Implements a spatial query using bounding box and Haversine distance.
 * @param lat Current latitude.
 * @param lng Current longitude.
 * @param keyword The search keyword.
 * @param rangeKm The maximum distance in kilometers to consider a cache hit.
 * @returns The closest valid cached data or null if not found.
 */
export const findClosestCache = async (
  lat: number,
  lng: number,
  keyword: string,
  rangeKm: number
): Promise<CacheResult | null> => {
  try {
    // Calculate rough bounding box for initial SQL filter
    const latDegreeKm = 111.12; // Approx km per degree latitude
    const lngDegreeKm = 111.12 * Math.cos(lat * Math.PI / 180); // Approx km per degree longitude at current latitude

    const latDelta = rangeKm / latDegreeKm;
    const lngDelta = rangeKm / lngDegreeKm;

    const latMin = lat - latDelta;
    const latMax = lat + latDelta;
    const lngMin = lng - lngDelta;
    const lngMax = lng + lngDelta;

    // Fetch candidates using SQL BETWEEN clause (Bounding Box)
    const candidates = db.getAllSync<CacheResult>(
      `SELECT * FROM places_cache
       WHERE keyword = ?
       AND latitude BETWEEN ? AND ?
       AND longitude BETWEEN ? AND ?`,
      [keyword, latMin, latMax, lngMin, lngMax]
    );

    if (!candidates || candidates.length === 0) {
      console.log(`SQLite: No cache candidates found for keyword '${keyword}' in bounding box.`);
      return null;
    }

    let closestEntry: CacheResult | null = null;
    let minDistance = Infinity;

    // Iterate through candidates to calculate exact Haversine distance
    for (const entry of candidates) {
      const distance = haversineDistance(
        { latitude: lat, longitude: lng },
        { latitude: entry.latitude, longitude: entry.longitude }
      );

      if (distance <= rangeKm && distance < minDistance) {
        minDistance = distance;
        closestEntry = entry;
      }
    }

    if (closestEntry) {
      console.log(`SQLite: Cache hit for keyword '${keyword}' within ${rangeKm}km. Closest distance: ${minDistance.toFixed(2)}km`);
      return closestEntry;
    } else {
      console.log(`SQLite: No valid cache found for keyword '${keyword}' within ${rangeKm}km after Haversine check.`);
      return null;
    }
  } catch (error) {
    console.error(`SQLite: Error finding closest cache for keyword '${keyword}':`, error);
    return null;
  }
};

/**
 * Inserts or replaces a cache entry in the database.
 * @param cacheKey The key for the cache entry.
 * @param results The JSON string of the results.
 * @param location The location of the search.
 * @param keyword The search keyword.
 */
export const insertCache = async (
  cacheKey: string,
  results: string,
  location: { latitude: number; longitude: number },
  keyword: string // Add keyword parameter
) => {
  try {
    db.runSync(
      `INSERT OR REPLACE INTO places_cache (cache_key, results, latitude, longitude, timestamp, keyword)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cacheKey, results, location.latitude, location.longitude, Date.now(), keyword]
    );
    console.log(`SQLite: Cache inserted/updated for key: ${cacheKey}, keyword: ${keyword}`);
  } catch (error) {
    console.error(`SQLite: Error inserting/updating cache for key ${cacheKey}, keyword ${keyword}:`, error);
    throw error;
  }
};