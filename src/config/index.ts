import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");

// Constants
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const BASE_CURRENCY = "EUR";
const API_URL = `${process.env.EXCHNAGE_API_URL}/${EXCHANGE_API_KEY}/latest/${BASE_CURRENCY}`;
const PORT = process.env.PORT || 3000;
const DB_PATH = join(ROOT_DIR, "currency.db");

export { EXCHANGE_API_KEY, BASE_CURRENCY, API_URL, PORT, DB_PATH, __dirname };
