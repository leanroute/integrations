/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silences the "using X streaming" build hint for edge routes. The
  // /api/chat route uses Node runtime because it needs `openai` SDK's
  // full feature set (some routing/failover helpers pull in Node APIs).
  // If you want to switch to edge runtime for lower cold-start latency,
  // change the runtime export in app/api/chat/route.ts.
  reactStrictMode: true,
};

export default nextConfig;
