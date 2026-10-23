import Script from "next/script";

// Privacy-friendly analytics, off by default. Either (or both) can be enabled:
//   NEXT_PUBLIC_CF_BEACON_TOKEN  — Cloudflare Web Analytics (cookieless; stats are
//                                  private to the Cloudflare account owner)
//   NEXT_PUBLIC_PLAUSIBLE_DOMAIN — Plausible (and optionally NEXT_PUBLIC_PLAUSIBLE_SRC
//                                  for self-hosted Umami/Plausible)
export default function Analytics() {
  const cfToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
  return (
    <>
      {cfToken && (
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={JSON.stringify({ token: cfToken, spa: true })}
          strategy="afterInteractive"
        />
      )}
      {domain && <Script defer data-domain={domain} src={src} strategy="afterInteractive" />}
    </>
  );
}
