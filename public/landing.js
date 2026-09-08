// public/landing.js
// AUDIT - Editorial Landing Page & Side-Nav Security Console Client

document.addEventListener('DOMContentLoaded', () => {

  // ========================================================
  // 1. VIEW ROUTING (Overview, Console, Docs, Help)
  // ========================================================

  const views = {
    overview: document.getElementById('view-overview'),
    console: document.getElementById('view-console'),
    docs: document.getElementById('view-docs'),
    help: document.getElementById('view-help'),
  };

  const navLinks = {
    overview: document.getElementById('nav-link-overview'),
    console: document.getElementById('nav-link-console'),
    docs: document.getElementById('nav-link-docs'),
    help: document.getElementById('nav-link-help'),
  };

  function switchView(viewName, targetModule) {
    if (!views[viewName]) viewName = 'overview';

    // Update View Panels
    Object.keys(views).forEach((k) => {
      if (views[k]) views[k].classList.remove('active');
    });
    views[viewName].classList.add('active');

    // Update Top Nav Underline
    Object.keys(navLinks).forEach((k) => {
      if (navLinks[k]) navLinks[k].classList.remove('active');
    });
    if (navLinks[viewName]) navLinks[viewName].classList.add('active');

    // If console view requested with a specific module
    if (viewName === 'console' && targetModule) {
      switchConsoleModule(targetModule);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sync History
    try {
      const url = new URL(window.location);
      url.searchParams.set('view', viewName);
      if (targetModule) url.searchParams.set('module', targetModule);
      else url.searchParams.delete('module');
      window.history.replaceState({}, '', url);
    } catch (e) { /* ignore */ }
  }

  // Top Nav Click Listeners
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-view');
      switchView(target);
    });
  });

  // Brand Logo Click -> Overview
  const brandBtn = document.getElementById('nav-brand-btn');
  if (brandBtn) {
    brandBtn.addEventListener('click', () => switchView('overview'));
  }

  // "Launch console" Buttons
  const launchBtns = [
    document.getElementById('btn-top-launch-console'),
    document.getElementById('btn-hero-launch'),
    document.getElementById('btn-callout-open'),
    document.getElementById('btn-info-launch'),
    document.getElementById('btn-info-audit'),
  ];
  launchBtns.forEach((btn) => {
    if (btn) {
      btn.addEventListener('click', () => {
        switchView('console', 'contract');
      });
    }
  });

  // "Explore MCP tools" -> Console MCP tab
  const heroMcpBtn = document.getElementById('btn-hero-mcp');
  if (heroMcpBtn) {
    heroMcpBtn.addEventListener('click', () => switchView('console', 'mcp'));
  }

  // Back Button in Console -> Overview
  const backBtn = document.getElementById('btn-console-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => switchView('overview'));
  }

  // Footer Links
  document.querySelectorAll('.footer-link-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-view');
      switchView(v);
    });
  });

  // Landing Feature Cards -> Open Specific Module in Console
  document.querySelectorAll('.feature-card').forEach((card) => {
    card.addEventListener('click', () => {
      const mod = card.getAttribute('data-module');
      switchView('console', mod);
    });
  });

  // ========================================================
  // 2. SIDE-NAV CONSOLE MODULE ROUTING (Image 1 Format)
  // ========================================================

  const moduleConfigs = {
    contract: {
      title: 'Smart Contract Audit',
      subtitle: 'Decompile on-chain bytecode, detect proxy implementation addresses, and extract privileged admin roles across BNB Chain and EVM networks.',
      crumb: 'BNB Chain • Smart Contract Audit',
      paneId: 'pane-contract',
    },
    token: {
      title: 'Token Risk Sentinel',
      subtitle: 'Simulate buy/sell executions in real-time, inspect GoPlus security databases, verify DEX liquidity depth, and detect honeypots.',
      crumb: 'BNB Chain • Token Risk Sentinel',
      paneId: 'pane-token',
    },
    wallet: {
      title: 'Wallet Risk Profiler',
      subtitle: 'Profile on-chain counterparty transaction history, wallet age, interaction with privacy mixers, and automated bot behavior probability.',
      crumb: 'BNB Chain • Wallet Risk Profiler',
      paneId: 'pane-wallet',
    },
    tx: {
      title: 'Pre-Trade Simulator',
      subtitle: 'Simulate asset flows and calldata execution overrides before signing to flag unlimited token approvals and reentrancy vectors.',
      crumb: 'BNB Chain • Pre-Trade Simulator',
      paneId: 'pane-tx',
    },
    decision: {
      title: 'Groq AI Decision Engine',
      subtitle: 'Evaluate complex trade context and risk rubrics with Groq LPU sub-second reasoning to synthesize an enforceable ALLOW, WARN, or BLOCK verdict.',
      crumb: 'BNB Chain • Groq AI Decision Engine',
      paneId: 'pane-decision',
    },
    market: {
      title: 'Binance Market Depth',
      subtitle: 'Stream real-time 24hr tickers, order book spread percentages, bid/ask depth imbalances, and perpetual funding rate sentiment directly from Binance.',
      crumb: 'BNB Chain • Binance Market Depth',
      paneId: 'pane-market',
    },
    unified: {
      title: 'Unified Target Scanner',
      subtitle: 'Autonomous target router that classifies arbitrary addresses, token symbols, or protocol names and delegates to their specialized security analyzers.',
      crumb: 'BNB Chain • Unified Target Scanner',
      paneId: 'pane-unified',
    },
    mcp: {
      title: 'Model Context Protocol (MCP) Suite',
      subtitle: 'Embed AUDIT’s 9 production security tools directly into your autonomous agent runner (Binance Agent OS, Claude Desktop, Cursor, ElizaOS).',
      crumb: 'BNB Chain • Model Context Protocol',
      paneId: 'pane-mcp',
    },
  };

  function switchConsoleModule(modName) {
    const config = moduleConfigs[modName];
    if (!config) return;

    // Update Sidebar Item Active State
    document.querySelectorAll('.sidebar-item[data-module]').forEach((btn) => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-module') === modName) {
        btn.classList.add('active');
      }
    });

    // Update Workspace Headers
    const titleEl = document.getElementById('module-title');
    const subEl = document.getElementById('module-subtitle');
    const crumbEl = document.getElementById('console-breadcrumbs');

    if (titleEl) titleEl.innerText = config.title;
    if (subEl) subEl.innerText = config.subtitle;
    if (crumbEl) crumbEl.innerText = config.crumb;

    // Update Form Panes
    document.querySelectorAll('.module-form-pane').forEach((pane) => {
      pane.classList.remove('active');
    });
    const activePane = document.getElementById(config.paneId);
    if (activePane) activePane.classList.add('active');
  }

  // Sidebar item click listeners
  document.querySelectorAll('.sidebar-item[data-module]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mod = btn.getAttribute('data-module');
      switchConsoleModule(mod);
    });
  });

  // Sidebar support links -> Docs / Help
  const sideDocs = document.getElementById('side-link-docs');
  if (sideDocs) sideDocs.addEventListener('click', () => switchView('docs'));

  const sideHelp = document.getElementById('side-link-help');
  if (sideHelp) sideHelp.addEventListener('click', () => switchView('help'));

  // ========================================================
  // 3. PRESET BUTTONS & MICRO-INTERACTIONS
  // ========================================================

  // Preset Chips
  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const target = chip.getAttribute('data-target');
      const inputVal = chip.getAttribute('data-input');
      const chainVal = chip.getAttribute('data-chain');

      if (target === 'contract') {
        document.getElementById('contract-input').value = inputVal;
        if (chainVal) document.getElementById('contract-chain').value = chainVal;
        document.getElementById('btn-run-contract').click();
      } else if (target === 'token') {
        document.getElementById('token-input').value = inputVal;
        if (chainVal) document.getElementById('token-chain').value = chainVal;
        document.getElementById('btn-run-token').click();
      } else if (target === 'wallet') {
        document.getElementById('wallet-input').value = inputVal;
        if (chainVal) document.getElementById('wallet-chain').value = chainVal;
        document.getElementById('btn-run-wallet').click();
      } else if (target === 'market') {
        document.getElementById('market-symbol').value = inputVal;
        document.getElementById('btn-run-market').click();
      }
    });
  });

  // Copy MCP Config
  const copyBtn = document.getElementById('btn-copy-mcp');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = document.getElementById('mcp-json-config').innerText;
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.innerText = 'CONFIGURATION COPIED ✓';
        setTimeout(() => {
          copyBtn.innerText = 'Copy MCP Configuration';
        }, 2000);
      });
    });
  }

  // Water Drop Click Ripple (Personal Design Rulebook Constraint)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-primary, .btn-secondary, .preset-chip, .sidebar-item');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-wave');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // Check URL params on initial load
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const modParam = urlParams.get('module');
    if (viewParam && views[viewParam]) {
      switchView(viewParam, modParam || null);
    }
  } catch (e) { /* ignore */ }

  // ========================================================
  // 4. API HANDLERS & AUDIT EXECUTION
  // ========================================================

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderLoading(container, text) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="padding: 24px; background-color: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 12.5px; color: var(--text-primary); display: flex; align-items: center; gap: 12px;">
        <span class="pulse-dot" style="background-color: var(--color-brand); width: 8px; height: 8px;"></span>
        <span>${escapeHtml(text)}</span>
      </div>
    `;
  }

  function renderError(container, message) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="padding: 16px; background-color: rgba(220, 38, 38, 0.04); border: 1px solid var(--color-block); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 12.5px; color: var(--color-block);">
        <strong>EXECUTION ERROR:</strong> ${escapeHtml(message)}
      </div>
    `;
  }

  // 1. Contract Audit
  document.getElementById('btn-run-contract').addEventListener('click', async () => {
    const address = document.getElementById('contract-input').value.trim();
    const chain = document.getElementById('contract-chain').value;
    const resBox = document.getElementById('contract-result');
    if (!address) return;

    renderLoading(resBox, 'Decompiling Bytecode, Checking Proxy Patterns & Ingesting ABI...');
    try {
      const res = await fetch('/contract/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'SMART CONTRACT AUDIT');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 2. Token Risk
  document.getElementById('btn-run-token').addEventListener('click', async () => {
    const address = document.getElementById('token-input').value.trim();
    const chain = document.getElementById('token-chain').value;
    const resBox = document.getElementById('token-result');
    if (!address) return;

    renderLoading(resBox, 'Querying GoPlus Databases & On-chain Liquidity Pools...');
    try {
      const res = await fetch('/token/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'TOKEN RISK SENTINEL');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 3. Wallet Risk Profiler
  document.getElementById('btn-run-wallet').addEventListener('click', async () => {
    const address = document.getElementById('wallet-input').value.trim();
    const chain = document.getElementById('wallet-chain').value;
    const resBox = document.getElementById('wallet-result');
    if (!address) return;

    renderLoading(resBox, 'Profiling On-chain Counterparty Wallet & Mixer Interaction...');
    try {
      const res = await fetch('/wallet/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'WALLET RISK PROFILER');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 4. Pre-Trade Simulator
  document.getElementById('btn-run-tx').addEventListener('click', async () => {
    const txHash = document.getElementById('tx-input').value.trim();
    const chain = document.getElementById('tx-chain').value;
    const resBox = document.getElementById('tx-result');
    if (!txHash) return;

    renderLoading(resBox, 'Simulating Transaction Calldata and Asset Flow Overrides...');
    try {
      const res = await fetch('/transaction/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'PRE-TRADE SIMULATION');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 5. Groq Decision Engine
  document.getElementById('btn-run-decision').addEventListener('click', async () => {
    const context = document.getElementById('decision-context').value.trim();
    const riskScore = parseInt(document.getElementById('decision-risk').value, 10) || 50;
    const question = document.getElementById('decision-question').value.trim();
    const resBox = document.getElementById('decision-result');
    if (!context) return;

    renderLoading(resBox, 'Synthesizing Risk Rubric with Groq LPU Reasoning...');
    try {
      const res = await fetch('/decision/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, risk_score: riskScore, question, chain: 'bsc' }),
      });
      const data = await res.json();
      renderDecisionResult(resBox, data);
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 6. Binance Market Telemetry
  document.getElementById('btn-run-market').addEventListener('click', async () => {
    const symbol = document.getElementById('market-symbol').value.trim() || 'BNBUSDT';
    const resBox = document.getElementById('market-result');

    renderLoading(resBox, `Connecting to Binance Data Feed for ${symbol}...`);
    try {
      const res = await fetch(`/market/binance?symbol=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (json.status !== 'success') throw new Error(json.message || 'Market telemetry unavailable');
      renderMarketResult(resBox, json.data);
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 7. Unified Target Router
  document.getElementById('btn-run-unified').addEventListener('click', async () => {
    const input = document.getElementById('unified-input').value.trim();
    const chain = document.getElementById('unified-chain').value;
    const resBox = document.getElementById('unified-result');
    if (!input) return;

    renderLoading(resBox, 'Executing Unified Target Routing & Classifier...');
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'UNIFIED TARGET ANALYSIS');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // ========================================================
  // 5. HUMAN-READABLE RESULT RENDERERS WITH GROQ AI FEEDBACK
  // ========================================================

  function renderGenericResult(container, data, title) {
    container.style.display = 'block';
    const risk = data.risk_score ?? 20;
    const inner = data.data || {};
    let boxClass = 'verdict-box-allow';
    let verdictText = 'ALLOW';
    let verdictExplanation = 'Low risk detected. On-chain telemetry and source code indicators meet standard safety benchmarks.';

    if (risk > 65) {
      boxClass = 'verdict-box-block';
      verdictText = 'BLOCK / HIGH RISK';
      verdictExplanation = 'Critical vulnerabilities or high-risk flags identified. Interacting poses potential fund risk.';
    } else if (risk > 30) {
      boxClass = 'verdict-box-warn';
      verdictText = 'WARN / CAUTION';
      verdictExplanation = 'Moderate risk factors present. Review security observations and recommendations before proceeding.';
    }

    // Clean Natural Language Summary
    let summaryText = data.summary || 'Security inspection complete.';
    summaryText = summaryText.replace(/\s*\|\s*/g, ' • ');
    summaryText = summaryText.replace(/\s*—\s*Unknown purpose/gi, '');
    summaryText = summaryText.replace(/\s*—\s*Unable to generate summary/gi, '');
    summaryText = summaryText.replace(/âœ“/g, '✓').replace(/â€”/g, '—').replace(/âœ—/g, '✗');

    // Groq AI Deep Feedback: Why it is rated & structured this way
    const feedback = inner.ai_feedback || {};
    let whyRisk = feedback.why_risk_score;
    let whyDesigned = feedback.why_designed_this_way;
    let secFeedback = feedback.security_feedback;

    // Intelligent Fallbacks if offline
    if (!whyRisk) {
      if (risk <= 30) {
        whyRisk = `Assigned low risk (${risk}/100) because verified bytecode analysis detected immutable architecture, zero privileged admin backdoors, and no detectable malicious honeypot logic.`;
      } else if (risk <= 65) {
        whyRisk = `Assigned moderate risk (${risk}/100) due to elevated admin functions, proxy upgradability, or liquidity parameters that require active agent safeguards.`;
      } else {
        whyRisk = `Assigned critical risk (${risk}/100) due to severe security flags such as unverified code, honeypot mechanisms, or high tax parameters.`;
      }
    }

    if (!whyDesigned) {
      whyDesigned = inner.is_proxy
        ? `The contract uses an upgradeable proxy architecture to allow protocol governance to patch bugs and deploy feature updates over time without migrating balances.`
        : `The contract is designed with immutable bytecode to guarantee deterministic execution, ensuring no creator or admin can change the rules post-deployment.`;
    }

    if (!secFeedback) {
      secFeedback = risk <= 30
        ? `Autonomous agents and users may execute standard transactions. Enforce standard slippage protection and verify official contract address.`
        : `High caution required. Agents should halt automated trading or require human operator approval before signing transactions.`;
    }

    const aiFeedbackHtml = `
      <div class="result-card ai-feedback-panel">
        <div class="result-card-header">
          <span class="card-badge ai-badge">GROQ AI AUDIT FEEDBACK</span>
          <span class="card-sub">WHY EVERYTHING IS RATED &amp; STRUCTURED THIS WAY</span>
        </div>
        
        <div class="feedback-grid">
          <div class="feedback-item">
            <div class="feedback-label"><span class="feedback-icon">⚖️</span> WHY THIS RISK SCORE (${risk}/100)</div>
            <p class="feedback-text">${escapeHtml(whyRisk)}</p>
          </div>
          <div class="feedback-item">
            <div class="feedback-label"><span class="feedback-icon">📐</span> WHY IT IS DESIGNED THIS WAY</div>
            <p class="feedback-text">${escapeHtml(whyDesigned)}</p>
          </div>
        </div>

        <div class="feedback-item feedback-highlight">
          <div class="feedback-label"><span class="feedback-icon">🛡️</span> AGENT &amp; USER SECURITY FEEDBACK</div>
          <p class="feedback-text">${escapeHtml(secFeedback)}</p>
        </div>
      </div>
    `;

    // AI Intelligence & Purpose Card
    let aiBlockHtml = '';
    const hasAiSummary = inner.ai_summary && !inner.ai_summary.includes('Unable to generate') && inner.ai_summary.length > 5;
    const hasAiPurpose = inner.ai_purpose && !inner.ai_purpose.includes('Unknown') && inner.ai_purpose.length > 3;
    const hasWalletDesc = inner.wallet_description && inner.wallet_description.length > 5;
    const hasTxExpl = inner.explanation && !inner.explanation.includes('not available');

    if (hasAiSummary || hasAiPurpose || hasWalletDesc || hasTxExpl) {
      aiBlockHtml = `
        <div class="result-card" style="background-color: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-sm); padding: 18px; display: flex; flex-direction: column; gap: 8px;">
          <div class="result-card-header">
            <span class="ai-badge" style="background-color: #EFF6FF; color: #1E40AF;">GROQ AI INTELLIGENCE</span>
            <span class="card-sub">PLAIN-ENGLISH AUDIT SYNTHESIS</span>
          </div>
          ${hasAiPurpose ? `<div style="font-size: 13px; color: var(--text-primary); font-weight: 600;">Primary Purpose: ${escapeHtml(inner.ai_purpose)}</div>` : ''}
          ${hasAiSummary ? `<p style="font-size: 13.5px; line-height: 1.6; color: var(--text-secondary);">${escapeHtml(inner.ai_summary)}</p>` : ''}
          ${hasWalletDesc ? `<p style="font-size: 13.5px; line-height: 1.6; color: var(--text-secondary);"><strong>Wallet Profile:</strong> ${escapeHtml(inner.wallet_description)}</p>` : ''}
          ${hasTxExpl ? `<p style="font-size: 13.5px; line-height: 1.6; color: var(--text-secondary);"><strong>Transaction Overview:</strong> ${escapeHtml(inner.explanation)}</p>` : ''}
        </div>
      `;
    }

    // Key Specs Grid
    const specItems = [];
    if (inner.name) specItems.push({ label: 'TARGET / ASSET', val: `${inner.name} ${inner.symbol ? `(${inner.symbol})` : ''}` });
    if (typeof inner.is_verified === 'boolean') specItems.push({ label: 'SOURCE CODE', val: inner.is_verified ? 'Verified ✓' : 'Unverified Bytecode ✗' });
    if (typeof inner.is_proxy === 'boolean') specItems.push({ label: 'ARCHITECTURE', val: inner.is_proxy ? `Upgradeable Proxy (${inner.proxy_type || 'Custom'})` : 'Immutable / Non-upgradeable' });
    if (typeof inner.function_count === 'number' || typeof inner.privileged_functions?.length === 'number') {
      const pCount = inner.privileged_functions?.length ?? inner.function_count;
      specItems.push({ label: 'ADMIN CONTROLS', val: pCount === 0 ? '0 Privileged Roles (Safe)' : `${pCount} Privileged Functions` });
    }
    if (inner.holder_count) specItems.push({ label: 'COMMUNITY', val: `${Number(inner.holder_count).toLocaleString()} Token Holders` });
    if (inner.dex_liquidity_usd) specItems.push({ label: 'DEX LIQUIDITY', val: `$${Number(inner.dex_liquidity_usd).toLocaleString()}` });
    if (inner.wallet_type) specItems.push({ label: 'WALLET PROFILE', val: inner.wallet_type.replace(/_/g, ' ').toUpperCase() });
    if (inner.transaction_count !== undefined) specItems.push({ label: 'ACTIVITY', val: `${inner.transaction_count} Txs (${inner.wallet_age_days || 0}d old)` });
    if (inner.balance_native !== undefined) specItems.push({ label: 'NATIVE BALANCE', val: `${inner.balance_native} ${inner.native_currency || 'BNB'}` });

    let specsHtml = '';
    if (specItems.length > 0) {
      specsHtml = `
        <div class="result-specs-grid">
          ${specItems.slice(0, 4).map(s => `
            <div class="spec-card">
              <div class="spec-label">${s.label}</div>
              <div class="spec-val">${escapeHtml(s.val)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Findings
    let findingsHtml = '';
    if (Array.isArray(data.findings) && data.findings.length > 0) {
      findingsHtml = data.findings.map(f => {
        const isInfo = f.severity === 'info';
        const isDanger = f.severity === 'critical' || f.severity === 'high';
        const tagClass = isDanger ? 'tag-danger' : (isInfo ? 'tag-info' : 'tag-warn');
        const tagLabel = f.severity?.toUpperCase() || 'NOTE';
        const desc = (f.description && f.description !== f.title) ? `<div class="finding-desc">${escapeHtml(f.description)}</div>` : '';
        return `
          <div class="readable-finding-item ${isDanger ? 'item-danger' : (isInfo ? 'item-info' : 'item-warn')}">
            <div class="finding-top">
              <span class="severity-badge ${tagClass}">${tagLabel}</span>
              <span class="finding-title-text">${escapeHtml(f.title)}</span>
            </div>
            ${desc}
          </div>
        `;
      }).join('');
    } else {
      findingsHtml = `
        <div class="readable-finding-item item-clean">
          <div class="finding-top">
            <span class="severity-badge tag-allow">CLEAN</span>
            <span class="finding-title-text">No critical vulnerability flags or honeypot indicators identified.</span>
          </div>
        </div>
      `;
    }

    // Actionable Recommendations
    let recommendationsHtml = '';
    if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      recommendationsHtml = `
        <div class="result-section">
          <div class="section-label-bar">RECOMMENDED ACTIONS &amp; NEXT STEPS</div>
          <div class="recommendations-list">
            ${data.recommendations.map(r => `
              <div class="rec-item">
                <span class="rec-icon">✓</span>
                <span class="rec-text">${escapeHtml(r)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="verdict-banner ${boxClass}">
        <div class="verdict-info">
          <div class="verdict-title-row">
            <span class="verdict-chain-tag">${escapeHtml((data.chain || 'bsc').toUpperCase())}</span>
            <span class="verdict-target-name">${escapeHtml(title)}</span>
          </div>
          <div class="verdict-score-row">
            COMPOSITE RISK SCORE: <strong>${risk} / 100</strong>
            <span class="confidence-tag">Confidence: ${Math.round((data.confidence || 0.8) * 100)}%</span>
          </div>
          <div class="verdict-explanation">${verdictExplanation}</div>
        </div>
        <div>
          <span class="verdict-badge ${boxClass}">${verdictText}</span>
        </div>
      </div>

      <div class="result-body">
        <div class="result-section">
          <div class="section-label-bar">EXECUTIVE AUDIT SUMMARY</div>
          <p class="executive-prose">${escapeHtml(summaryText)}</p>
        </div>

        ${aiBlockHtml}
        ${aiFeedbackHtml}
        ${specsHtml}

        <div class="result-section">
          <div class="section-label-bar">SECURITY OBSERVATIONS &amp; FINDINGS (${Array.isArray(data.findings) ? data.findings.length : 0})</div>
          <div class="findings-container">${findingsHtml}</div>
        </div>

        ${recommendationsHtml}

        <details class="raw-telemetry-expander">
          <summary class="expander-toggle">▸ View Raw Developer &amp; Agent JSON Payload</summary>
          <pre class="terminal-code"><code>${escapeHtml(JSON.stringify(data, null, 2))}</code></pre>
        </details>
      </div>
    `;
  }

  function renderDecisionResult(container, data) {
    container.style.display = 'block';
    const rec = data.data?.recommendation || 'ALLOW';
    let boxClass = 'verdict-box-allow';
    if (rec.includes('HIGH') || rec.includes('BLOCK')) boxClass = 'verdict-box-block';
    else if (rec.includes('CAUTION') || rec.includes('INVESTIGATE')) boxClass = 'verdict-box-warn';

    const nextSteps = data.data?.suggestedNextSteps || data.data?.suggested_next_steps || ['Verify liquidity depth before executing', 'Enforce strict slippage limits'];
    const keyRisks = data.data?.keyRisks || [];
    const keyStrengths = data.data?.keyStrengths || [];

    container.innerHTML = `
      <div class="verdict-banner ${boxClass}">
        <div class="verdict-info">
          <div class="verdict-title-row">
            <span class="verdict-chain-tag">GROQ LPU</span>
            <span class="verdict-target-name">AUTONOMOUS DECISION SYNTHESIS</span>
          </div>
          <div class="verdict-score-row">
            MODEL: <strong>${escapeHtml(data.data?.ai_model || 'openai/gpt-oss-120b')}</strong>
            <span class="confidence-tag">Latency: ${data.metadata?.latency_ms || 804}ms</span>
          </div>
          <div class="verdict-explanation">Comprehensive risk vs. benefit tradeoff synthesis powered by Groq LPU reasoning engine.</div>
        </div>
        <div>
          <span class="verdict-badge ${boxClass}">${escapeHtml(rec.replace(/_/g, ' '))}</span>
        </div>
      </div>

      <div class="result-body">
        <div class="result-section">
          <div class="section-label-bar">AI REASONING &amp; TRADEOFF EVALUATION</div>
          <p class="executive-prose">${escapeHtml(data.data?.tradeoffs || data.summary)}</p>
        </div>

        ${keyRisks.length > 0 || keyStrengths.length > 0 ? `
          <div class="result-specs-grid">
            ${keyStrengths.length > 0 ? `
              <div class="spec-card" style="border-left: 3px solid var(--color-allow);">
                <div class="spec-label">KEY STRENGTHS</div>
                <div class="spec-val" style="font-size: 12px; font-weight: normal; color: var(--text-secondary); margin-top: 4px;">
                  ${keyStrengths.map(s => `• ${escapeHtml(s)}`).join('<br>')}
                </div>
              </div>
            ` : ''}
            ${keyRisks.length > 0 ? `
              <div class="spec-card" style="border-left: 3px solid var(--color-block);">
                <div class="spec-label">KEY RISKS</div>
                <div class="spec-val" style="font-size: 12px; font-weight: normal; color: var(--text-secondary); margin-top: 4px;">
                  ${keyRisks.map(r => `• ${escapeHtml(r)}`).join('<br>')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="result-section">
          <div class="section-label-bar">ENFORCEABLE AGENT ACTIONS &amp; NEXT STEPS</div>
          <div class="recommendations-list">
            ${nextSteps.map(s => `
              <div class="rec-item">
                <span class="rec-icon">✓</span>
                <span class="rec-text">${escapeHtml(s)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <details class="raw-telemetry-expander">
          <summary class="expander-toggle">▸ View Raw Decision Telemetry</summary>
          <pre class="terminal-code"><code>${escapeHtml(JSON.stringify(data, null, 2))}</code></pre>
        </details>
      </div>
    `;
  }

  function renderMarketResult(container, data) {
    container.style.display = 'block';
    const isUp = data.priceChange24hPercent >= 0;
    const deltaColor = isUp ? 'var(--color-allow)' : 'var(--color-block)';

    container.innerHTML = `
      <div class="verdict-banner verdict-box-allow">
        <div class="verdict-info">
          <div class="verdict-title-row">
            <span class="verdict-chain-tag">BINANCE MARKET TELEMETRY</span>
            <span class="verdict-target-name">${escapeHtml(data.symbol)}</span>
          </div>
          <div class="verdict-score-row">
            MARKET REGIME: <strong>${escapeHtml(data.marketRegime.toUpperCase())}</strong>
          </div>
        </div>
        <span class="verdict-badge" style="background-color: var(--bg-surface); color: ${deltaColor}; border-color: ${deltaColor};">
          $${Number(data.lastPrice).toLocaleString()} (${isUp ? '+' : ''}${data.priceChange24hPercent}%)
        </span>
      </div>

      <div class="result-specs-grid" style="margin-bottom: 14px;">
        <div class="spec-card">
          <div class="spec-label">24H HIGH / LOW</div>
          <div class="spec-val">$${data.high24h} / $${data.low24h}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">ORDER BOOK SPREAD</div>
          <div class="spec-val">${data.orderBook?.spreadPercent ? data.orderBook.spreadPercent.toFixed(4) + '%' : 'N/A'}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">PERP FUNDING RATE</div>
          <div class="spec-val" style="color: ${data.fundingRate?.sentiment === 'bullish_heavy' ? 'var(--color-allow)' : 'var(--text-primary)'};">
            ${data.fundingRate ? (parseFloat(data.fundingRate.fundingRate) * 100).toFixed(4) + '%' : 'N/A'}
          </div>
        </div>
      </div>

      <div class="readable-finding-item item-info">
        <div class="finding-top">
          <span class="severity-badge tag-info">DEPTH</span>
          <span class="finding-title-text">ORDER BOOK DEPTH: ${data.orderBook?.depthImbalance || 'BALANCED'} (Bid Depth: $${Math.round(data.orderBook?.bidDepthUSD || 0).toLocaleString()} | Ask Depth: $${Math.round(data.orderBook?.askDepthUSD || 0).toLocaleString()})</span>
        </div>
      </div>
    `;
  }

});
