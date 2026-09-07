# Security Policy

ChainIntel ASP takes security seriously, as it serves as a critical intelligence and risk-evaluation layer for Web3 AI agents and smart contracts.

---

## 🔒 Reporting a Vulnerability

If you discover a security vulnerability or potential exploit within ChainIntel ASP, **please do not open a public GitHub issue**.

Instead, report the issue directly to our security team:

- **Email**: `security@chainintel-asp.org`
- **Response Time**: We acknowledge reports within 24 hours and aim to provide a resolution or patch within 72 hours.

---

## 🛡️ Key Security Guidelines

### Secret Management
- **Never commit `.env` files** containing live API keys, private keys, or wallet seed phrases.
- Ensure `OKX_SECRET_KEY` and `OKX_PASSPHRASE` are managed via secure environment variables in production environments (e.g. Railway, AWS Secrets Manager, Vercel).

### Payment Verification
- When `ENABLE_PAYMENT=true`, OKX x402 payment headers are verified via the official `@okxweb3/x402-express` SDK.
- Do not bypass payment verification logic in production builds.

### Data Sanitization
- All user inputs passed into endpoints are validated against Zod schemas (`src/modules/*/analyze.ts`) to prevent injection attacks and malformed requests.
