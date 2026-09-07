// public/landing.js
// High-Precision Telemetry Client for AUDIT — Binance Agent OS

document.addEventListener('DOMContentLoaded', () => {
  // Tab Trigger Handling
  const tabTriggers = document.querySelectorAll('.tab-trigger');
  const tabPanels = document.querySelectorAll('.terminal-panel');

  tabTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      tabTriggers.forEach((t) => t.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));

      trigger.classList.add('active');
      const targetId = trigger.getAttribute('data-tab');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Water Drop Click Ripple Effect
  document.querySelectorAll('.btn, .preset-btn, .tab-trigger').forEach((el) => {
    el.addEventListener('click', function (e) {
      const ripple = document.createElement('span');
      ripple.classList.add('ripple-wave');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  // Test Preset Buttons
  document.querySelectorAll('.preset-btn').forEach((preset) => {
    preset.addEventListener('click', () => {
      const target = preset.getAttribute('data-target');
      const inputVal = preset.getAttribute('data-input');
      const chainVal = preset.getAttribute('data-chain');

      if (target === 'unified') {
        document.getElementById('unified-input').value = inputVal;
        if (chainVal) document.getElementById('unified-chain').value = chainVal;
        document.getElementById('btn-run-unified').click();
      } else if (target === 'token') {
        document.getElementById('token-input').value = inputVal;
        if (chainVal) document.getElementById('token-chain').value = chainVal;
        document.getElementById('btn-run-token').click();
      } else if (target === 'contract') {
        document.getElementById('contract-input').value = inputVal;
        if (chainVal) document.getElementById('contract-chain').value = chainVal;
        document.getElementById('btn-run-contract').click();
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
        copyBtn.innerText = 'CONFIGURATION COPIED';
        setTimeout(() => {
          copyBtn.innerText = 'Copy MCP Configuration';
        }, 2000);
      });
    });
  }

  // --- API Handlers ---

  // 1. Unified Router
  document.getElementById('btn-run-unified').addEventListener('click', async () => {
    const input = document.getElementById('unified-input').value.trim();
    const chain = document.getElementById('unified-chain').value;
    const resBox = document.getElementById('unified-result');
    if (!input) return;

    renderLoading(resBox, 'Executing Unified Target Routing...');
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

  // 2. Token Risk
  document.getElementById('btn-run-token').addEventListener('click', async () => {
    const address = document.getElementById('token-input').value.trim();
    const chain = document.getElementById('token-chain').value;
    const resBox = document.getElementById('token-result');
    if (!address) return;

    renderLoading(resBox, 'Querying GoPlus & On-chain Liquidity Pools...');
    try {
      const res = await fetch('/token/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'TOKEN RISK TELEMETRY');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 3. Contract Audit
  document.getElementById('btn-run-contract').addEventListener('click', async () => {
    const address = document.getElementById('contract-input').value.trim();
    const chain = document.getElementById('contract-chain').value;
    const resBox = document.getElementById('contract-result');
    if (!address) return;

    renderLoading(resBox, 'Decompiling Bytecode and Ingesting ABI...');
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

  // 4. Pre-Trade Simulator
  document.getElementById('btn-run-tx').addEventListener('click', async () => {
    const txHash = document.getElementById('tx-input').value.trim();
    const chain = document.getElementById('tx-chain').value;
    const resBox = document.getElementById('tx-result');
    if (!txHash) return;

    renderLoading(resBox, 'Simulating Calldata and Asset Flow Overrides...');
    try {
      const res = await fetch('/transaction/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'TRANSACTION PRE-FLIGHT SIMULATION');
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

    renderLoading(resBox, 'Synthesizing Risk Rubric with Groq LLM...');
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

  // --- Render Helpers ---

  function renderLoading(container, text) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="padding: 20px; font-family: var(--font-mono); font-size: 12px; color: var(--color-brand);">
        <span style="color: var(--text-muted);">[SYS_EXEC]</span> ${text}
      </div>
    `;
  }

  function renderError(container, message) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="background-color: rgba(246, 70, 93, 0.1); border: 1px solid var(--color-block); padding: 14px; font-family: var(--font-mono); font-size: 12px; color: var(--color-block);">
        <strong>EXECUTION ERROR:</strong> ${message}
      </div>
    `;
  }

  function renderGenericResult(container, data, title) {
    container.style.display = 'block';
    const risk = data.risk_score ?? 20;
    let boxClass = 'verdict-box-allow';
    let verdictText = 'ALLOW';

    if (risk > 65) {
      boxClass = 'verdict-box-block';
      verdictText = 'BLOCK / HIGH RISK';
    } else if (risk > 30) {
      boxClass = 'verdict-box-warn';
      verdictText = 'WARN / CAUTION';
    }

    const findingsHtml = Array.isArray(data.findings) && data.findings.length > 0
      ? data.findings.map(f => {
        const detail = (f.description && f.description !== f.title) ? ` — ${f.description}` : '';
        const cssClass = f.severity === 'info' ? 'info' : (f.severity === 'critical' || f.severity === 'high' ? 'danger' : '');
        const prefix = f.severity === 'info' ? 'INFO' : 'FLAG';
        return `<div class="finding-line ${cssClass}">${prefix}: [${f.severity?.toUpperCase() || 'WARN'}] ${f.title}${detail}</div>`;
      }).join('')
      : '<div class="finding-line success">STATUS: No critical vulnerability flags identified on-chain.</div>';

    container.innerHTML = `
      <div class="verdict-header">
        <div>
          <div class="verdict-title">${title} // ${data.chain?.toUpperCase() || 'BNB CHAIN'}</div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 4px;">COMPOSITE RISK INDEX: ${risk} / 100</div>
        </div>
        <span class="verdict-box ${boxClass}">${verdictText}</span>
      </div>
      <p class="telemetry-summary"><strong>Executive Telemetry:</strong> ${data.summary || 'Inspection complete.'}</p>
      <div class="telemetry-findings">${findingsHtml}</div>
      <details style="margin-top: 14px; cursor: pointer;">
        <summary style="font-family: var(--font-mono); font-size: 11px; color: var(--color-brand); margin-bottom: 8px;">[+] EXPAND RAW JSON TELEMETRY</summary>
        <pre class="terminal-code"><code>${JSON.stringify(data, null, 2)}</code></pre>
      </details>
    `;
  }

  function renderDecisionResult(container, data) {
    container.style.display = 'block';
    const rec = data.data?.recommendation || 'ALLOW';
    let boxClass = 'verdict-box-allow';
    if (rec.includes('HIGH') || rec.includes('BLOCK')) boxClass = 'verdict-box-block';
    else if (rec.includes('CAUTION') || rec.includes('INVESTIGATE')) boxClass = 'verdict-box-warn';

    container.innerHTML = `
      <div class="verdict-header">
        <div>
          <div class="verdict-title">GROQ AI DECISION SYNTHESIS</div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 4px;">MODEL: ${data.data?.ai_model || 'openai/gpt-oss-120b'} // LATENCY: ${data.metadata?.latency_ms || 804}ms</div>
        </div>
        <span class="verdict-box ${boxClass}">${rec.replace(/_/g, ' ')}</span>
      </div>
      <p class="telemetry-summary"><strong>AI Reasoning & Tradeoff Evaluation:</strong> ${data.data?.tradeoffs || data.summary}</p>
      <div style="margin: 14px 0;">
        <div style="font-family: var(--font-mono); font-size: 11px; color: var(--color-brand); margin-bottom: 6px;">ENFORCEABLE NEXT STEPS:</div>
        <div class="telemetry-findings">
          ${(data.data?.suggested_next_steps || ['Enforce max slippage limit', 'Verify liquidity before executing']).map(s => `<div class="finding-line">ACTION: ${s}</div>`).join('')}
        </div>
      </div>
      <details style="margin-top: 14px; cursor: pointer;">
        <summary style="font-family: var(--font-mono); font-size: 11px; color: var(--color-brand); margin-bottom: 8px;">[+] EXPAND DECISION TELEMETRY</summary>
        <pre class="terminal-code"><code>${JSON.stringify(data, null, 2)}</code></pre>
      </details>
    `;
  }

  function renderMarketResult(container, data) {
    container.style.display = 'block';
    const isUp = data.priceChange24hPercent >= 0;
    const deltaColor = isUp ? 'var(--color-allow)' : 'var(--color-block)';

    container.innerHTML = `
      <div class="verdict-header">
        <div>
          <div class="verdict-title">BINANCE TELEMETRY // ${data.symbol}</div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 4px;">MARKET REGIME: ${data.marketRegime.toUpperCase()}</div>
        </div>
        <span class="verdict-box" style="background-color: var(--bg-surface); color: ${deltaColor}; border-color: ${deltaColor};">
          $${data.lastPrice.toLocaleString()} (${isUp ? '+' : ''}${data.priceChange24hPercent}%)
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;">
        <div style="background-color: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 10px; font-family: var(--font-mono);">
          <div style="font-size: 10px; color: var(--text-muted);">24H HIGH / LOW</div>
          <div style="font-size: 12px; font-weight: 700; color: var(--text-bright);">$${data.high24h} / $${data.low24h}</div>
        </div>
        <div style="background-color: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 10px; font-family: var(--font-mono);">
          <div style="font-size: 10px; color: var(--text-muted);">SPREAD</div>
          <div style="font-size: 12px; font-weight: 700; color: var(--text-bright);">${data.orderBook.spreadPercent.toFixed(4)}%</div>
        </div>
        <div style="background-color: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 10px; font-family: var(--font-mono);">
          <div style="font-size: 10px; color: var(--text-muted);">PERP FUNDING RATE</div>
          <div style="font-size: 12px; font-weight: 700; color: ${data.fundingRate?.sentiment === 'bullish_heavy' ? 'var(--color-allow)' : 'var(--color-brand)'};">
            ${data.fundingRate ? (parseFloat(data.fundingRate.fundingRate) * 100).toFixed(4) + '%' : 'N/A'}
          </div>
        </div>
      </div>
      <div class="finding-line">
        ORDER BOOK DEPTH: ${data.orderBook.depthImbalance} (Bid Depth: $${Math.round(data.orderBook.bidDepthUSD).toLocaleString()} | Ask Depth: $${Math.round(data.orderBook.askDepthUSD).toLocaleString()})
      </div>
    `;
  }
});
