import sqlite3 from "sqlite3";
import { DB_PATH } from "../config/index.js";
import type { ExchangeRateRecord, DbRow } from "../types/exchangeRate.js";

const db = new sqlite3.Database(DB_PATH, err => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(`
            CREATE TABLE IF NOT EXISTS exchange_rates (
                base_currency TEXT PRIMARY KEY,
                rates TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
  }
});

function saveRates(baseCurrency: string, rates: Record<string, number>): Promise<void> {
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
          resolve(undefined);
        }
      }
    );
  });
}

function getRates(baseCurrency: string): Promise<ExchangeRateRecord | null> {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM exchange_rates WHERE base_currency = ?",
      [baseCurrency],
      (err: Error | null, row: DbRow) => {
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
