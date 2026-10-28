export const DEFAULT_PUBLIC_APP_URL = "https://kenyansmis-8jwcu8tn.manus.space";

/**
 * Resolve the public URL used in generated school login links.
 *
 * A public web hostname must be a real DNS/HTTPS hostname. Underscores are
 * rejected so a typo such as `nexus_smis` cannot silently generate dead links.
 * Configure PUBLIC_APP_URL with a deployed custom domain when one exists.
 */
export function resolvePublicAppUrl(raw = process.env.PUBLIC_APP_URL ?? "") {
  const value = raw.trim();
  if (!value) return DEFAULT_PUBLIC_APP_URL;
  try {
    const parsed = new URL(value);
    if (!(["http:", "https:"] as string[]).includes(parsed.protocol) || parsed.hostname.includes("_")) {
      return DEFAULT_PUBLIC_APP_URL;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_PUBLIC_APP_URL;
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  publicAppUrl: resolvePublicAppUrl(),
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
