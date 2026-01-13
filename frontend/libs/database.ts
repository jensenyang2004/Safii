// import * as SQLite from 'expo-sqlite';

// const db = SQLite.openDatabase('cache.db');

// /**
//  * Initializes the database and creates the cache table if it doesn't exist.
//  */
// export const initDatabase = () => {
//   const promise = new Promise<void>((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql(
//         `CREATE TABLE IF NOT EXISTS places_cache (
//           cache_key TEXT PRIMARY KEY NOT NULL,
//           results TEXT NOT NULL,
//           latitude REAL NOT NULL,
//           longitude REAL NOT NULL,
//           timestamp INTEGER NOT NULL
//         );`,
//         [],
//         () => {
//           resolve();
//         },
//         (_, error) => {
//           reject(error);
//           return false; // Stop the transaction
//         }
//       );
//     });
//   });
//   return promise;
// };

// /**
//  * Fetches a cached result from the database.
//  * @param cacheKey The key for the cache entry.
//  * @returns The cached data or null if not found.
//  */
// export const fetchCache = (cacheKey: string) => {
//   const promise = new Promise<{ latitude: number; longitude: number; results: string } | null>((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql(
//         'SELECT * FROM places_cache WHERE cache_key = ?',
//         [cacheKey],
//         (_, result) => {
//           if (result.rows.length > 0) {
//             resolve(result.rows.item(0));
//           } else {
//             resolve(null);
//           }
//         },
//         (_, error) => {
//           reject(error);
//           return false;
//         }
//       );
//     });
//   });
//   return promise;
// };

// /**
//  * Inserts or replaces a cache entry in the database.
//  * @param cacheKey The key for the cache entry.
//  * @param results The JSON string of the results.
//  * @param location The location of the search.
//  */
// export const insertCache = (cacheKey: string, results: string, location: { latitude: number; longitude: number }) => {
//   const promise = new Promise<void>((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql(
//         `INSERT OR REPLACE INTO places_cache (cache_key, results, latitude, longitude, timestamp)
//          VALUES (?, ?, ?, ?, ?)`,
//         [cacheKey, results, location.latitude, location.longitude, Date.now()],
//         () => {
//           resolve();
//         },
//         (_, error) => {
//           reject(error);
//           return false;
//         }
//       );
//     });
//   });
//   return promise;
// };
