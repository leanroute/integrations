/**
 * Helpers for the `x-gateway-*` request headers Leanroute understands.
 *
 * These are per-request opt-ins beyond what the OpenAI wire format
 * carries natively. LangChain's `ChatOpenAI` accepts a `defaultHeaders`
 * config option that gets merged into every outbound fetch; we surface
 * the gateway-specific ones through a typed struct so callers do not
 * have to remember the exact header strings.
 *
 * Full header reference: https://leanroute.dev/docs/headers
 */

/**
 * Per-request routing modifiers. All fields are optional; unset means
 * the gateway uses the org's default routing policy (arbitrage on,
 * failover on, no region preference).
 */
export interface GatewayHeaderOptions {
  /**
   * Routing mode override. `"explicit"` disables cheaper-model swap
   * and failover for this request; the caller wants the exact model
   * they named, or a hard error if it is unreachable. Use for
   * benchmarks, compliance-sensitive traffic, and provider-specific
   * tool-call behaviour that only one upstream gets right.
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

/**
 * Convert typed `GatewayHeaderOptions` into the raw header record that
 * `ChatOpenAI`'s `defaultHeaders` config expects. Keys use the
 * `x-gateway-*` convention the API side reads.
 *
 * Absent options produce no header entries — an unset field means
 * "use whatever the org's default is," which is exactly what an
 * absent header signals to the gateway.
 */
export function toHeaderRecord(opts: GatewayHeaderOptions | undefined): Record<string, string> {
  if (!opts) return {};
  const out: Record<string, string> = {};
  if (opts.routing) out["x-gateway-routing"] = opts.routing;
  return out;
}
