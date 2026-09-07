// public/landing.js
// Interactive client for AUDIT — Binance Agent OS Intelligence Engine

document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Quick Sample Pill Buttons
  document.querySelectorAll('.pill-btn').forEach((pill) => {
    pill.addEventListener('click', () => {
      const target = pill.getAttribute('data-target');
      const inputVal = pill.getAttribute('data-input');
      const chainVal = pill.getAttribute('data-chain');

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
        copyBtn.innerText = 'Copied to Clipboard!';
        setTimeout(() => {
          copyBtn.innerText = 'Copy MCP Config';
        }, 2000);
      });
    });
  }

  // --- API Handlers ---

  // 1. Unified Audit
  document.getElementById('btn-run-unified').addEventListener('click', async () => {
    const input = document.getElementById('unified-input').value.trim();
    const chain = document.getElementById('unified-chain').value;
    const resBox = document.getElementById('unified-result');
    if (!input) return;

    renderLoading(resBox, 'Analyzing with AUDIT Engine & Groq AI...');
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'Unified Asset Analysis');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 2. Token Audit
  document.getElementById('btn-run-token').addEventListener('click', async () => {
    const address = document.getElementById('token-input').value.trim();
    const chain = document.getElementById('token-chain').value;
    const resBox = document.getElementById('token-result');
    if (!address) return;

    renderLoading(resBox, 'Inspecting Token honeypots, taxes, and liquidity...');
    try {
      const res = await fetch('/token/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'Token Risk Audit');
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

    renderLoading(resBox, 'Auditing Bytecode, Proxies, and Access Controls...');
    try {
      const res = await fetch('/contract/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'Smart Contract Audit');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 4. Pre-Trade Transaction Simulator
  document.getElementById('btn-run-tx').addEventListener('click', async () => {
    const txHash = document.getElementById('tx-input').value.trim();
    const chain = document.getElementById('tx-chain').value;
    const resBox = document.getElementById('tx-result');
    if (!txHash) return;

    renderLoading(resBox, 'Simulating Transaction state overrides & drainer risk...');
    try {
      const res = await fetch('/transaction/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, chain }),
      });
      const data = await res.json();
      renderGenericResult(resBox, data, 'Transaction Simulation');
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // 5. Agent Decision Engine
  document.getElementById('btn-run-decision').addEventListener('click', async () => {
    const context = document.getElementById('decision-context').value.trim();
    const riskScore = parseInt(document.getElementById('decision-risk').value, 10) || 50;
    const question = document.getElementById('decision-question').value.trim();
    const resBox = document.getElementById('decision-result');
    if (!context) return;

    renderLoading(resBox, 'Synthesizing Decision with Groq Llama 3.3 70B...');
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

  // 6. Binance Market Alpha
  document.getElementById('btn-run-market').addEventListener('click', async () => {
    const symbol = document.getElementById('market-symbol').value.trim() || 'BNBUSDT';
    const resBox = document.getElementById('market-result');

    renderLoading(resBox, `Fetching Binance Spot & Futures alpha for ${symbol}...`);
    try {
      const res = await fetch(`/market/binance?symbol=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (json.status !== 'success') throw new Error(json.message || 'Market data unavailable');
      renderMarketResult(resBox, json.data);
    } catch (err) {
      renderError(resBox, err.message);
    }
  });

  // --- Render Helpers ---

  function renderLoading(container, text) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--color-primary);">
        <div class="pulse-dot" style="margin: 0 auto 12px; width: 14px; height: 14px;"></div>
        <p style="font-weight: 500;">${text}</p>
      </div>
    `;
  }

  function renderError(container, message) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="background: rgba(246, 70, 93, 0.15); border: 1px solid var(--color-danger); padding: 16px; border-radius: var(--radius-md); color: var(--color-danger);">
        <strong>Error:</strong> ${message}
      </div>
    `;
  }

  function renderGenericResult(container, data, title) {
    container.style.display = 'block';
    const risk = data.risk_score ?? 20;
    let badgeClass = 'verdict-allow';
    let badgeText = 'ALLOW';

    if (risk > 65) {
      badgeClass = 'verdict-block';
      badgeText = 'BLOCK / HIGH RISK';
    } else if (risk > 30) {
      badgeClass = 'verdict-warn';
      badgeText = 'WARN / CAUTION';
    }

    const findingsHtml = Array.isArray(data.findings) && data.findings.length > 0
      ? data.findings.map(f => `<div class="finding-item ${f.severity === 'critical' || f.severity === 'high' ? 'danger' : ''}">⚠️ <strong>${f.title}</strong>: ${f.description || f.source || ''}</div>`).join('')
      : '<div class="finding-item success">✅ No critical security flags detected</div>';

    container.innerHTML = `
      <div class="result-header">
        <div>
          <h4>${title} — ${data.chain?.toUpperCase() || 'BNB CHAIN'}</h4>
          <span style="font-size: 12px; color: var(--text-muted);">Risk Score: ${risk}/100</span>
        </div>
        <span class="verdict-badge ${badgeClass}">${badgeText}</span>
      </div>
      <p class="result-summary"><strong>Summary:</strong> ${data.summary || 'Analysis complete.'}</p>
      <div class="findings-list">${findingsHtml}</div>
      <details style="margin-top: 16px; cursor: pointer;">
        <summary style="font-size: 12px; color: var(--color-primary); margin-bottom: 8px;">View Full JSON Telemetry</summary>
        <pre class="code-block"><code>${JSON.stringify(data, null, 2)}</code></pre>
      </details>
    `;
  }

  function renderDecisionResult(container, data) {
    container.style.display = 'block';
    const rec = data.data?.recommendation || 'ALLOW';
    let badgeClass = 'verdict-allow';
    if (rec.includes('HIGH') || rec.includes('BLOCK')) badgeClass = 'verdict-block';
    else if (rec.includes('CAUTION') || rec.includes('INVESTIGATE')) badgeClass = 'verdict-warn';

    container.innerHTML = `
      <div class="result-header">
        <div>
          <h4>Groq AI Trade Verdict</h4>
          <span style="font-size: 12px; color: var(--text-muted);">Model: ${data.data?.ai_model || 'llama-3.3-70b-versatile'}</span>
        </div>
        <span class="verdict-badge ${badgeClass}">${rec.replace(/_/g, ' ')}</span>
      </div>
      <p class="result-summary"><strong>AI Reasoning:</strong> ${data.data?.tradeoffs || data.summary}</p>
      <div style="margin: 14px 0;">
        <strong style="font-size: 13px; color: var(--color-primary);">Suggested Next Steps:</strong>
        <ul style="margin: 8px 0 0 20px; font-size: 13px; color: var(--text-muted);">
          ${(data.data?.suggested_next_steps || ['Enforce stop-loss', 'Monitor order fill']).map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
      <details style="margin-top: 16px; cursor: pointer;">
        <summary style="font-size: 12px; color: var(--color-primary); margin-bottom: 8px;">View Full Decision Telemetry</summary>
        <pre class="code-block"><code>${JSON.stringify(data, null, 2)}</code></pre>
      </details>
    `;
  }

  function renderMarketResult(container, data) {
    container.style.display = 'block';
    const isUp = data.priceChange24hPercent >= 0;
    const priceColor = isUp ? 'var(--color-success)' : 'var(--color-danger)';

    container.innerHTML = `
      <div class="result-header">
        <div>
          <h4>Binance Market Alpha — ${data.symbol}</h4>
          <span style="font-size: 12px; color: var(--text-muted);">Regime: ${data.marketRegime.toUpperCase()}</span>
        </div>
        <span class="verdict-badge" style="background: rgba(240,185,11,0.15); color: var(--color-primary); border: 1px solid var(--color-primary);">
          $${data.lastPrice.toLocaleString()} (${isUp ? '+' : ''}${data.priceChange24hPercent}%)
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">24h High / Low</div>
          <div style="font-size: 13px; font-weight: 600;">$${data.high24h} / $${data.low24h}</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Orderbook Spread</div>
          <div style="font-size: 13px; font-weight: 600;">${data.orderBook.spreadPercent.toFixed(4)}%</div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Perp Funding Rate</div>
          <div style="font-size: 13px; font-weight: 600; color: ${data.fundingRate?.sentiment === 'bullish_heavy' ? 'var(--color-success)' : 'var(--color-primary)'};">
            ${data.fundingRate ? (parseFloat(data.fundingRate.fundingRate) * 100).toFixed(4) + '%' : 'N/A'}
          </div>
        </div>
      </div>
      <div class="finding-item" style="border-left-color: var(--color-primary);">
        📊 <strong>Order Book Telemetry:</strong> ${data.orderBook.depthImbalance} (Bid: $${Math.round(data.orderBook.bidDepthUSD).toLocaleString()} | Ask: $${Math.round(data.orderBook.askDepthUSD).toLocaleString()})
      </div>
    `;
  }
});
