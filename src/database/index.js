import sqlite3 from "sqlite3";
import { DB_PATH } from "../config/index.js";

// Initialize database
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to the SQLite database.");
    // Create tables if they don't exist
    db.run(`
            CREATE TABLE IF NOT EXISTS exchange_rates (
                base_currency TEXT PRIMARY KEY,
                rates TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
  }
});

/**
 * Save exchange rates to database
 * @param {string} baseCurrency - Base currency code
 * @param {Object} rates - Exchange rates object
 * @returns {Promise<void>}
 */
function saveRates(baseCurrency, rates) {
  return new Promise((resolve, reject) => {
    const ratesJson = JSON.stringify(rates);
    db.run(
      "INSERT OR REPLACE INTO exchange_rates (base_currency, rates, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)",
      [baseCurrency, ratesJson],
      err => {
        if (err) {
          console.error("Error saving to database:", err);
          reject(err);
        } else {
          console.log("Exchange rates updated successfully");
          resolve();
        }
      }
    );
  });
}

/**
 * Fetch exchange rates from database
 * @param {string} baseCurrency - Base currency code
 * @returns {Promise<Object|null>}
 */
function getRates(baseCurrency) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM exchange_rates WHERE base_currency = ?",
      [baseCurrency],
      (err, row) => {
        if (err) {
          console.error("Error loading from database:", err);
          reject(err);
        } else if (row) {
          try {
            const rates = {
              base_currency: row.base_currency,
              rates: JSON.parse(row.rates),
              last_updated: row.last_updated,
            };
            resolve(rates);
          } catch (parseError) {
            console.error("Error parsing rates from database:", parseError);
            reject(parseError);
          }
        } else {
          resolve(null);
        }
      }
    );
  });
}

export { db, saveRates, getRates };
