import type { Coin, Verdict } from "./types";

/** Escape user-controlled strings before injecting into the report HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMoney(n: number, sym: string): string {
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
  return `${sym}${n.toLocaleString("en-US")}`;
}

const STATUS_COLOR: Record<string, string> = {
  PASS: "#15803d",
  WARN: "#b45309",
  FAIL: "#b91c1c",
};

/** Build a fully self-contained, print-ready HKMA supervision report. */
export function buildHkmaReportHtml(coin: Coin, verdict: Verdict): string {
  const issued = new Date(verdict.timestamp);
  const attestationHours = (coin.attestationAgeSeconds / 3600).toFixed(1);

  const rows = verdict.rules
    .map((r) => {
      const color = STATUS_COLOR[r.status] ?? "#444";
      return `
        <tr>
          <td class="clause">${esc(r.clause)}</td>
          <td>${esc(r.label)}</td>
          <td class="mono">${esc(r.value)}</td>
          <td class="mono muted">${esc(r.threshold)}</td>
          <td><span class="pill" style="color:${color};border-color:${color}33;background:${color}11">${r.status}</span></td>
        </tr>`;
    })
    .join("");

  const penalties = verdict.penalties.length
    ? verdict.penalties
        .map(
          (p) =>
            `<li><span>${esc(p.label)}</span><span class="mono">−${p.points} pts</span></li>`,
        )
        .join("")
    : `<li><span class="muted">No deductions — base score retained.</span><span class="mono">−0 pts</span></li>`;

  const statusColor = STATUS_COLOR[verdict.status] ?? "#444";
  const confidencePct = Math.round(verdict.confidence * 100);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>HKMA Supervision Report · ${esc(coin.symbol)}</title>
<style>
  :root { --ink:#111827; --muted:#6b7280; --line:#e5e7eb; }
  * { box-sizing: border-box; }
  body {
    font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--ink); margin: 0; padding: 40px 48px; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .mono { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 12px; }
  .muted { color: var(--muted); }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--ink); padding-bottom:16px; }
  h1 { font-size: 20px; margin: 0; letter-spacing: -0.01em; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 28px 0 10px; }
  .sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .badge { text-align:right; }
  .rating { font-size: 34px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
  .score { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .verdict-pill { display:inline-block; margin-top:6px; padding:3px 10px; border:1px solid; border-radius:999px; font-size:11px; font-weight:600; }
  .grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-top:8px; }
  .cell { border:1px solid var(--line); border-radius:8px; padding:10px 12px; }
  .cell .k { font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); }
  .cell .v { font-size:15px; font-weight:600; margin-top:3px; }
  table { width:100%; border-collapse:collapse; margin-top:4px; font-size:12px; }
  th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); border-bottom:1px solid var(--line); padding:6px 8px; }
  td { padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
  td.clause { font-weight:600; white-space:nowrap; }
  .pill { display:inline-block; padding:1px 8px; border:1px solid; border-radius:999px; font-size:10px; font-weight:700; }
  ul.pen { list-style:none; padding:0; margin:0; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  ul.pen li { display:flex; justify-content:space-between; padding:8px 12px; font-size:12px; border-bottom:1px solid var(--line); }
  ul.pen li:last-child { border-bottom:0; }
  .hashbox { margin-top:8px; border:1px solid var(--line); border-radius:8px; padding:12px 14px; background:#f9fafb; }
  footer { margin-top:32px; padding-top:14px; border-top:1px solid var(--line); font-size:10px; color:var(--muted); display:flex; justify-content:space-between; }
  @media print { body { padding: 24px 28px; } @page { margin: 14mm; } }
</style>
</head>
<body>
  <header>
    <div>
      <h1>HKMA Stablecoin Supervision Report</h1>
      <div class="sub">${esc(coin.name)} · ${esc(coin.symbol)} · ${esc(coin.issuer)}</div>
      <div class="sub">Stablecoins Ordinance (Cap. 656) — machine-checkable verdict</div>
    </div>
    <div class="badge">
      <div class="rating" style="color:${statusColor}">${verdict.rating}</div>
      <div class="score">${verdict.score} / 100</div>
      <span class="verdict-pill" style="color:${statusColor};border-color:${statusColor}55;background:${statusColor}11">${verdict.status}</span>
    </div>
  </header>

  <h2>Issuer &amp; reserve snapshot</h2>
  <div class="grid">
    <div class="cell"><div class="k">Peg</div><div class="v">${esc(coin.pegSymbol)} ${esc(coin.peg)}</div></div>
    <div class="cell"><div class="k">Supply</div><div class="v">${fmtMoney(coin.supply, coin.pegSymbol)}</div></div>
    <div class="cell"><div class="k">Reserves</div><div class="v">${fmtMoney(coin.reserves, coin.pegSymbol)}</div></div>
    <div class="cell"><div class="k">Coverage (R/S)</div><div class="v">${(verdict.reserveRatio * 100).toFixed(2)}%</div></div>
    <div class="cell"><div class="k">Stress LSR</div><div class="v">${(verdict.projectedRatio * 100).toFixed(2)}%</div></div>
    <div class="cell"><div class="k">Peg deviation</div><div class="v">${verdict.depegBps > 0 ? "+" : ""}${verdict.depegBps} bps</div></div>
    <div class="cell"><div class="k">Redemption p95</div><div class="v">${coin.redemptionP95h.toFixed(1)} h</div></div>
    <div class="cell"><div class="k">AML flags</div><div class="v">${coin.amlFlags}</div></div>
  </div>

  <h2>Regulatory clause checklist</h2>
  <table>
    <thead>
      <tr><th>Clause</th><th>Requirement</th><th>Observed</th><th>Threshold</th><th>State</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Rating deductions (base 100)</h2>
  <ul class="pen">${penalties}</ul>

  <h2>Data confidence &amp; provenance</h2>
  <div class="grid">
    <div class="cell"><div class="k">Confidence score</div><div class="v">${confidencePct}%</div></div>
    <div class="cell"><div class="k">Attestation age</div><div class="v">${attestationHours} h</div></div>
    <div class="cell"><div class="k">Chain</div><div class="v">${esc(coin.chain)}</div></div>
    <div class="cell"><div class="k">Rule pack</div><div class="v">${esc((coin.rulePack ?? "hkma").toUpperCase())}</div></div>
  </div>

  <div class="hashbox">
    <div class="mono"><strong>Contract:</strong> ${esc(coin.contract)}</div>
    ${coin.reserveSource ? `<div class="mono"><strong>Reserve feed:</strong> ${esc(coin.reserveSource)}</div>` : ""}
    <div class="mono"><strong>Verdict hash:</strong> ${esc(verdict.hash)}</div>
    <div class="mono"><strong>Issued:</strong> ${esc(issued.toISOString())}</div>
  </div>

  <footer>
    <span>StableSuite · deterministic supervision engine</span>
    <span>Generated ${esc(issued.toLocaleString("en-GB"))}</span>
  </footer>
</body>
</html>`;
}

/** Render the report into a hidden iframe and trigger the browser print / save-as-PDF
 *  dialog. An iframe avoids popup blockers and works inside embedded browsers. */
export function exportHkmaReport(coin: Coin, verdict: Verdict): void {
  const html = buildHkmaReportHtml(coin, verdict);

  try {
    // Remove any previous report frame.
    document.getElementById("hkma-report-frame")?.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "hkma-report-frame";
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    iframe.srcdoc = html;

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) return;
      win.focus();
      win.print();
      // Clean up after the print dialog is dismissed.
      const cleanup = () => iframe.remove();
      win.addEventListener?.("afterprint", cleanup);
      setTimeout(cleanup, 60_000);
    };

    document.body.appendChild(iframe);
  } catch {
    // Fallback — download the report as a standalone HTML file.
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HKMA-report-${coin.symbol}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
