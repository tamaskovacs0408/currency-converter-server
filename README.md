# Currency Converter Server

A Node.js-based currency converter server with security features and caching. Uses the ExchangeRate API for real-time currency conversion rates.

## Features

- Real-time currency conversion
- Memory caching for fast responses
- SQLite backup storage
- Rate limiting and security features
- CORS support
- Input validation
- Error handling

## Prerequisites

- Node.js 20.0.0 or higher
- ExchangeRate API key (get one at [https://www.exchangerate-api.com](https://www.exchangerate-api.com))

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file in the root directory:
```env
EXCHANGE_API_KEY=your_api_key_here
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### Get All Exchange Rates
```
GET /rates
```
Returns all available exchange rates with USD as the base currency.

### Get Available Currencies
```
GET /currencies
```
Returns a list of all available currencies with their codes and names.

### Convert Currency
```
GET /convert?from=USD&to=EUR&amount=100
```
Parameters:
- `from`: Source currency code (3 letters)
- `to`: Target currency code (3 letters)
- `amount`: Amount to convert (positive number less than 1 billion)

## Security Features

- Rate limiting (100 requests per minute)
- SQL injection protection
- XSS protection via Helmet
- CORS configuration
- Input validation
- Secure headers

## Deployment on Render.com

1. Push your code to GitHub
2. Create a new Web Service on Render.com
3. Connect to your GitHub repository
4. Set the following:
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variable:
   - Key: `EXCHANGE_API_KEY`
   - Value: Your ExchangeRate API key

Note: On the free tier of Render.com, the SQLite database will be reset on each deploy. However, the server will continue to function using the memory cache and will re-fetch rates from the API.