/**
 * Query your Leanroute usage over the last 24 hours.
 *
 *   pnpm run usage
 *
 * Hits /platform/v1/usage on the gateway. Requires an ADMIN key
 * (`gw_admin_*`), not the runtime key we use for LLM traffic. Mint
 * admin keys at https://leanroute.dev/dashboard/admin-keys.
 *
 * Put the admin key in .env as LEANROUTE_ADMIN_KEY. If it's missing,
 * this script prints a helpful message and exits — it does NOT fall
 * back to the runtime key, since runtime keys aren't authorized on
 * /platform/v1/* by design (two key classes).
 */

const adminKey = process.env.LEANROUTE_ADMIN_KEY;
if (!adminKey) {
  console.error(
    "LEANROUTE_ADMIN_KEY is not set. Admin keys are separate from runtime keys — mint one at:",
  );
  console.error("  https://leanroute.dev/dashboard/admin-keys");
  console.error("Then add LEANROUTE_ADMIN_KEY=gw_admin_... to your .env");
  process.exit(1);
}

const base = process.env.LEANROUTE_BASE_URL?.replace(/\/v1$/, "") ?? "https://api.leanroute.dev";

async function main() {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const url = new URL(`${base}/platform/v1/usage`);
  url.searchParams.set("from", from.toISOString());
  url.searchParams.set("to", to.toISOString());
  url.searchParams.set("group_by", "model");

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${adminKey}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`GET ${url.pathname} → ${res.status}: ${body.slice(0, 300)}`);
    process.exit(1);
  }

  const body = (await res.json()) as {
    rows: { model: string; requests: number; tokens_in: number; tokens_out: number; cost_usd: number }[];
  };

  if (body.rows.length === 0) {
    console.log("No usage in the last 24 hours.");
    return;
  }

  console.log("Usage (last 24h), by model:\n");
  console.log("  model                                          reqs    in      out     cost");
  console.log("  ─────────────────────────────────────────────  ────  ──────  ──────  ────────");
  let totalCost = 0;
  for (const r of body.rows) {
    totalCost += r.cost_usd;
    console.log(
      "  " +
        r.model.padEnd(45) +
        "  " +
        String(r.requests).padStart(4) +
        "  " +
        formatK(r.tokens_in).padStart(6) +
        "  " +
        formatK(r.tokens_out).padStart(6) +
        "  " +
        `$${r.cost_usd.toFixed(4)}`.padStart(8),
    );
  }
  console.log(`\nTotal: $${totalCost.toFixed(4)}`);
}

function formatK(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
