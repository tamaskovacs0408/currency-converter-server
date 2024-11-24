import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';
import sqlite3 from 'sqlite3';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Constants
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const BASE_CURRENCY = 'USD';
const API_URL = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${BASE_CURRENCY}`;

// Cache for storing rates in memory
let ratesCache = null;

// Initialize database
const db = new sqlite3.Database(join(__dirname, '../currency.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to the SQLite database.');
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
 * Fetch and update exchange rates
 * @returns {Promise<void>}
 */
async function updateExchangeRates() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data.result === 'success') {
            // Update cache
            ratesCache = {
                base_currency: BASE_CURRENCY,
                rates: data.conversion_rates,
                last_updated: new Date().toISOString()
            };
            
            // Store in database as backup
            const ratesJson = JSON.stringify(data.conversion_rates);
            db.run(
                'INSERT OR REPLACE INTO exchange_rates (base_currency, rates, last_updated) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [BASE_CURRENCY, ratesJson],
                (err) => {
                    if (err) {
                        console.error('Error saving to database:', err);
                    } else {
                        console.log('Exchange rates updated successfully');
                    }
                }
            );
        }
    } catch (error) {
        console.error('Error updating exchange rates:', error);
        // If API call fails, try to load from database
        if (!ratesCache) {
            db.get(
                'SELECT * FROM exchange_rates WHERE base_currency = ?',
                [BASE_CURRENCY],
                (err, row) => {
                    if (err) {
                        console.error('Error loading from database:', err);
                    } else if (row) {
                        try {
                            ratesCache = {
                                base_currency: row.base_currency,
                                rates: JSON.parse(row.rates),
                                last_updated: row.last_updated
                            };
                            console.log('Loaded rates from database backup');
                        } catch (parseError) {
                            console.error('Error parsing rates from database:', parseError);
                        }
                    }
                }
            );
        }
    }
}

// Input validation helpers
/**
 * Validate currency code format
 * @param {string} code - Currency code to validate
 * @returns {boolean}
 */
function validateCurrencyCode(code) {
    return /^[A-Z]{3}$/.test(code);
}

/**
 * Validate amount
 * @param {number} amount - Amount to validate
 * @returns {boolean}
 */
function validateAmount(amount) {
    return !isNaN(amount) && amount > 0 && amount < 1000000000;
}

const app = express();

// Middleware
app.use(morgan('combined')); // Logging
app.use(helmet()); // Security headers
app.use(express.json());

// Rate limiting - 100 requests per minute
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests' }
}));

// CORS configuration
app.use(cors({
    origin: '*', // Modify in production
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 86400,
}));

// Routes
app.get('/rates', (req, res) => {
    // First try cache
    if (ratesCache) {
        return res.json(ratesCache);
    }

    // Fallback to database
    db.get(
        'SELECT * FROM exchange_rates WHERE base_currency = ?',
        [BASE_CURRENCY],
        (err, row) => {
            if (err) {
                console.error('Error fetching rates:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!row) {
                return res.status(404).json({ error: 'No exchange rates available' });
            }

            try {
                const rates = JSON.parse(row.rates);
                return res.json({
                    base_currency: row.base_currency,
                    rates,
                    last_updated: row.last_updated
                });
            } catch (error) {
                console.error('Error parsing rates:', error);
                return res.status(500).json({ error: 'Invalid rate data' });
            }
        }
    );
});

app.get('/currencies', (req, res) => {
    // First try cache
    if (ratesCache) {
        const currencies = Object.keys(ratesCache.rates)
            .filter(code => validateCurrencyCode(code))
            .map(code => ({
                code,
                name: new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || code
            }));

        return res.json({
            currencies: currencies.sort((a, b) => a.code.localeCompare(b.code)),
            last_updated: ratesCache.last_updated
        });
    }

    // Fallback to database
    db.get(
        'SELECT * FROM exchange_rates WHERE base_currency = ?',
        [BASE_CURRENCY],
        (err, row) => {
            if (err) {
                console.error('Error fetching currencies:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!row) {
                return res.status(404).json({ error: 'Currency data not available' });
            }

            try {
                const rates = JSON.parse(row.rates);
                const currencies = Object.keys(rates)
                    .filter(code => validateCurrencyCode(code))
                    .map(code => ({
                        code,
                        name: new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || code
                    }));

                return res.json({
                    currencies: currencies.sort((a, b) => a.code.localeCompare(b.code)),
                    last_updated: row.last_updated
                });
            } catch (error) {
                console.error('Error parsing currencies:', error);
                return res.status(500).json({ error: 'Invalid currency data' });
            }
        }
    );
});

app.get('/convert', (req, res) => {
    const from = req.query.from?.toUpperCase();
    const to = req.query.to?.toUpperCase();
    const amount = Number(req.query.amount);

    // Strict input validation
    if (!from || !to || !validateCurrencyCode(from) || !validateCurrencyCode(to)) {
        return res.status(400).json({
            error: 'Invalid currency code. Must be 3 uppercase letters.'
        });
    }

    if (!validateAmount(amount)) {
        return res.status(400).json({
            error: 'Invalid amount. Must be a positive number less than 1 billion.'
        });
    }

    // First try cache
    if (ratesCache) {
        const rates = ratesCache.rates;
        if (!rates[from] || !rates[to]) {
            return res.status(400).json({ error: 'Invalid currency code' });
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

        return res.json({
            from,
            to,
            amount,
            result: convertedAmount,
            rate: Number((convertedAmount / amount).toFixed(6)),
            last_updated: ratesCache.last_updated
        });
    }

    // Fallback to database
    db.get(
        'SELECT * FROM exchange_rates WHERE base_currency = ?',
        [BASE_CURRENCY],
        (err, row) => {
            if (err) {
                console.error('Error fetching rates:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (!row) {
                return res.status(404).json({ error: 'Exchange rates not available' });
            }

            try {
                const rates = JSON.parse(row.rates);
                if (!rates[from] || !rates[to]) {
                    return res.status(400).json({ error: 'Invalid currency code' });
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

                return res.json({
                    from,
                    to,
                    amount,
                    result: convertedAmount,
                    rate: Number((convertedAmount / amount).toFixed(6)),
                    last_updated: row.last_updated
                });
            } catch (error) {
                console.error('Error parsing rates:', error);
                return res.status(500).json({ error: 'Conversion failed' });
            }
        }
    );
});

// Schedule update every 24 hours
cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled exchange rate update...');
    updateExchangeRates();
});

// Initial update of exchange rates
updateExchangeRates();

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
