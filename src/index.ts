import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cron from "node-cron";
import type { Request, Response, NextFunction } from "express";

import { PORT } from "./config/index.js";
import { updateExchangeRates } from "./services/exchangeRateService.js";
import {
  getRates,
  getCurrencies,
  convert,
} from "./controllers/currencyController.js";

const app = express();

app.use(morgan("combined"));
app.use(helmet());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: "Too many requests" },
  })
);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86400,
  })
);

app.get("/rates", getRates);
app.get("/currencies", getCurrencies);
app.get("/convert", convert);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

cron.schedule("0 0 * * *", () => {
  console.log("Running scheduled exchange rate update...");
  updateExchangeRates();
});

updateExchangeRates();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
