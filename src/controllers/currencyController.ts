import { validateCurrencyCode, validateAmount } from "../utils/validation.js";
import {
  getExchangeRates,
  convertCurrency,
  getAvailableCurrencies,
} from "../services/exchangeRateService.js";
import type { Request, Response } from "express";

async function getRates(req: Request, res: Response) {
  try {
    const rates = await getExchangeRates();

    if (!rates) {
      return res.status(404).json({ error: "No exchange rates available" });
    }

    return res.json(rates);
  } catch (error) {
    console.error("Error in getRates controller:", error);
    return res.status(500).json({ error: "Failed to retrieve rates" });
  }
}

async function getCurrencies(req: Request, res: Response) {
  try {
    const currencies = await getAvailableCurrencies();

    if (!currencies) {
      return res.status(404).json({ error: "Currency data not available" });
    }

    return res.json(currencies);
  } catch (error) {
    console.error("Error in getCurrencies controller:", error);
    return res.status(500).json({ error: "Failed to retrieve currencies" });
  }
}

async function convert(req: Request, res: Response) {
  const from =
    typeof req.query.from === "string"
      ? req.query.from.toUpperCase()
      : undefined;
  const to =
    typeof req.query.to === "string" ? req.query.to.toUpperCase() : undefined;
  const amount = Number(req.query.amount);

  if (
    !from ||
    !to ||
    !validateCurrencyCode(from) ||
    !validateCurrencyCode(to)
  ) {
    return res.status(400).json({
      error: "Invalid currency code. Must be 3 uppercase letters.",
    });
  }

  if (!validateAmount(amount)) {
    return res.status(400).json({
      error: "Invalid amount. Must be a positive number less than 1 billion.",
    });
  }

  try {
    const result = await convertCurrency(from, to, amount);

    if (!result) {
      return res
        .status(400)
        .json({ error: "Invalid currency code or rates not available" });
    }

    return res.json(result);
  } catch (error) {
    console.error("Error in convert controller:", error);
    return res.status(500).json({ error: "Conversion failed" });
  }
}

export { getRates, getCurrencies, convert };
