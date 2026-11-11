/**
 * Typed helpers for the `x-gateway-*` request headers Leanroute reads.
 *
 * Same shape as the @leanroute/langchain package's version — kept
 * separately to avoid a cross-package dep. If you change the header set
 * on the API side, update both packages.
 */

export interface GatewayHeaderOptions {
  /**
   * `"explicit"` disables cheaper-model swap + failover for the request.
   * Use for benchmarks, compliance, or when a specific model's
   * tool-call behaviour matters.
   */
  routing?: "explicit" | "arbitrage";
  /**
   * @deprecated Has no effect. The gateway never implemented this header;
   * since 0.2.0 it is no longer sent. Kept so existing code compiles.
   */
  region?: "global" | "cn" | "in";
  /**
   * @deprecated Has no effect. The gateway never implemented this header;
   * since 0.2.0 it is no longer sent. Kept so existing code compiles.
   */
  fallbackModel?: string;
  /**
   * @deprecated Has no effect. The gateway never implemented this header;
   * since 0.2.0 it is no longer sent. Kept so existing code compiles.
   */
  tag?: string;
}

export function toHeaderRecord(opts: GatewayHeaderOptions | undefined): Record<string, string> {
  if (!opts) return {};
  const out: Record<string, string> = {};
  if (opts.routing) out["x-gateway-routing"] = opts.routing;
  return out;
}
