# Contributing to ChainIntel ASP

Thank you for your interest in contributing to **ChainIntel ASP**! We welcome contributions from developers, researchers, and security analysts across the Web3 ecosystem.

---

## 🚀 How to Get Started

### 1. Fork and Clone
```bash
git clone https://github.com/YOUR_USERNAME/chainintel-asp.git
cd chainintel-asp
npm install
```

### 2. Environment Setup
Copy the template configuration and add your local test keys:
```bash
cp .env.example .env
```
Keep `ENABLE_PAYMENT=false` in `.env` while developing locally so API calls run in free mode without requiring x402 payment headers.

### 3. Run Development Server
```bash
npm run dev
```

---

## 🧪 Testing Guidelines

Before opening a Pull Request, run the TypeScript compiler check to verify zero type errors:

```bash
npx tsc --noEmit
```

Make sure any new module or adapter:
- Handles missing API keys gracefully (never crashes the server process).
- Returns structured `Finding`, `Evidence`, `RiskScore`, and `Summary` objects.
- Does not expose secret credentials or sensitive tokens in logs or responses.

---

## 📬 Submitting a Pull Request

1. **Create a topic branch**: `git checkout -b feat/my-new-feature` or `fix/issue-description`
2. **Commit your changes**: Follow clean commit message conventions (`feat: ...`, `fix: ...`, `docs: ...`)
3. **Push to your fork**: `git push origin feat/my-new-feature`
4. **Open a Pull Request**: Provide a description of what changed, why, and how you tested it.

---

## 📜 Code Style

- Use **TypeScript** with strict mode enabled.
- Prefer `async/await` and handle errors cleanly with custom error classes in `src/lib/errors.ts`.
- Log warnings and errors via `src/lib/logger.ts` instead of raw `console.log`.

Thank you for helping build the intelligence layer for AI agents! 🤖⚡
