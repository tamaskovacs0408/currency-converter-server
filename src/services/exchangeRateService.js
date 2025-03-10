import { BASE_CURRENCY, API_URL } from "../config/index.js";
import { saveRates, getRates } from "../database/index.js";

// Cache for storing rates in memory
let ratesCache = null;

/**
 * Fetch and update exchange rates
 * @returns {Promise<void>}
 */
async function updateExchangeRates() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (data.result === "success") {
      // Update cache
      ratesCache = {
        base_currency: BASE_CURRENCY,
        rates: data.conversion_rates,
        last_updated: new Date().toISOString(),
      };

      // Store in database as backup
      await saveRates(BASE_CURRENCY, data.conversion_rates);
    }
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    // If API call fails, try to load from database
    if (!ratesCache) {
      try {
        ratesCache = await getRates(BASE_CURRENCY);
        if (ratesCache) {
          console.log("Loaded rates from database backup");
        }
      } catch (dbError) {
        console.error("Error loading from database:", dbError);
      }
    }
  }
}

/**
 * Get current exchange rates
 * @returns {Promise<Object>} - Returns rates object or null if unavailable
 */
async function getExchangeRates() {
  if (ratesCache) {
    return ratesCache;
  }

  try {
    const rates = await getRates(BASE_CURRENCY);
    return rates;
  } catch (error) {
    console.error("Error getting rates:", error);
    return null;
  }
}

/**
 * Convert amount between currencies
 * @param {string} from - Source currency code
 * @param {string} to - Target currency code
 * @param {number} amount - Amount to convert
 * @returns {Object|null} - Conversion result or null if rates unavailable
 */
async function convertCurrency(from, to, amount) {
  const ratesData = await getExchangeRates();
  if (!ratesData) {
    return null;
  }

  const rates = ratesData.rates;
  if (!rates[from] || !rates[to]) {
    return null;
  }

  let convertedAmount;
  if (from === BASE_CURRENCY) {
    convertedAmount = amount * rates[to];
  } else if (to === BASE_CURRENCY) {
    convertedAmount = amount / rates[from];
  } else {
    const amountInUSD = amount / rates[from];
    convertedAmount = amountInUSD * rates[to];
  }

  // Round to 6 decimal places for precision
  convertedAmount = Number(convertedAmount.toFixed(6));

  return {
    from,
    to,
    amount,
    result: convertedAmount,
    rate: Number((convertedAmount / amount).toFixed(6)),
    last_updated: ratesData.last_updated,
  };
}

/**
 * Get list of available currencies
 * @returns {Promise<Object|null>} - List of currencies or null if unavailable
 */
async function getAvailableCurrencies() {
  const ratesData = await getExchangeRates();
  if (!ratesData) {
    return null;
  }

  const currencies = Object.keys(ratesData.rates)
    .filter(code => /^[A-Z]{3}$/.test(code))
    .map(code => ({
      code,
      name:
        new Intl.DisplayNames(["en"], { type: "currency" }).of(code) || code,
    }));

  return {
    currencies: currencies.sort((a, b) => a.code.localeCompare(b.code)),
    last_updated: ratesData.last_updated,
  };
}

export {
  ratesCache,
  updateExchangeRates,
  getExchangeRates,
  convertCurrency,
  getAvailableCurrencies,
};
