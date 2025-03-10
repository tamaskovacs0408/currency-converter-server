import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cron from "node-cron";

import { PORT } from "./config/index.js";
import { updateExchangeRates } from "./services/exchangeRateService.js";
import {
  getRates,
  getCurrencies,
  convert,
} from "./controllers/currencyController.js";

const app = express();

// Middleware
app.use(morgan("combined")); // Logging
app.use(helmet()); // Security headers
app.use(express.json());

// Rate limiting - 100 requests per minute
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: "Too many requests" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: "*", // Modify in production
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86400,
  })
);

// Define routes directly in main file as in original implementation
app.get("/rates", getRates);
app.get("/currencies", getCurrencies);
app.get("/convert", convert);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

// Schedule update every 24 hours
cron.schedule("0 0 * * *", () => {
  console.log("Running scheduled exchange rate update...");
  updateExchangeRates();
});

// Initial update of exchange rates
updateExchangeRates();

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
