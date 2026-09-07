# Contributing to AUDIT

Thank you for your interest in contributing to **AUDIT — Intelligence & Security Layer for Binance Agent OS**!

We welcome all contributions, including bug reports, new MCP tool integrations, adapter enhancements, documentation improvements, and performance optimizations.

---

## 🛠️ Development Setup

### 1. Fork & Clone
```bash
git clone https://github.com/OpeyemiMoses/Audit.git
cd Audit
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 📜 Contribution Guidelines

### 1. Code Standards & Style
- Write clean, well-documented **TypeScript**.
- Ensure all types are strictly defined; avoid using `any` wherever possible.
- Run `npm run lint` or `npx tsc --noEmit` before submitting changes to verify type safety.
- Follow existing patterns for adapters (`src/adapters/`) and module analyzers (`src/modules/`).

### 2. Branch Naming Conventions
- `feat/your-feature-name` (for new features or tools)
- `fix/bug-description` (for bug fixes)
- `docs/what-changed` (for documentation updates)
- `refactor/component-name` (for code refactoring)

### 3. Commit Message Guidelines
Use Conventional Commits:
- `feat: add BNB Greenfield storage adapter`
- `fix: correct honeypot detection on proxy tokens`
- `docs: update MCP client configuration instructions`
- `perf: optimize Groq decision engine latency`

---

## 🔄 Pull Request Process

1. Create your feature branch from `main`.
2. Ensure your changes compile with `npm run build` with **0 errors**.
3. Update relevant documentation in `README.md` if adding or changing MCP tools or endpoints.
4. Open a Pull Request referencing any related issues.
5. Provide a clear summary of what your PR introduces and how you verified it.

---

## 💬 Questions & Support

Feel free to open a [GitHub Discussion](https://github.com/OpeyemiMoses/Audit/discussions) or submit an [Issue](https://github.com/OpeyemiMoses/Audit/issues).
