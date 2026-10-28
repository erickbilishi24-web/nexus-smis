# NEXUS hostname configuration

## Current production hostname

NEXUS currently uses the working Manus-hosted address:

```text
https://kenyansmis-8jwcu8tn.manus.space
```

The server-side `PUBLIC_APP_URL` setting is validated and falls back to this hostname when no valid value is supplied. School login links are generated as:

```text
https://kenyansmis-8jwcu8tn.manus.space/school/{SCHOOL_CODE}/login
```

The School Registry obtains this base URL from the server administration catalog rather than constructing links from a browser origin.

## Current deployment setting

Keep this value in the deployment environment when an explicit setting is preferred:

```text
PUBLIC_APP_URL=https://kenyansmis-8jwcu8tn.manus.space
```

Do not commit a production `.env` file or any secrets. `PUBLIC_APP_URL` is not a secret, but it should still be configured through the deployment environment.

## Android alignment

The current NEXUS Android Option A package is aligned with this same Manus hostname and accepts school-specific HTTPS paths under `/school/`. Examples:

```text
https://kenyansmis-8jwcu8tn.manus.space/school/SCHOOL-A/login
https://kenyansmis-8jwcu8tn.manus.space/school/SCHOOL-B/login
```

## Future custom-domain migration

When a DNS-compatible custom domain is available:

1. Create the DNS record required by the hosting provider.
2. Wait for DNS propagation and confirm the HTTPS certificate is active.
3. Set `PUBLIC_APP_URL` to the complete HTTPS origin without a trailing slash.
4. Verify the root page and a school login path return HTTP 200.
5. Open the School Registry and copy a newly generated school login link.
6. Rebuild the Android package with the new host in its deep-link intent filter.
7. Verify login, cookies, school membership enforcement, and switching on the new host before distributing the APK.
8. Keep the Manus hostname available during the transition for rollback.

Values containing underscores, such as `https://nexus_smis...`, are rejected by the server configuration instead of producing links that may fail DNS or HTTPS validation. Use a real DNS-compatible hostname such as a hyphenated host or an owned domain.

## Verification status

- Current Manus hostname: verified reachable.
- Current school login route: verified reachable.
- `PUBLIC_APP_URL` validation: implemented.
- Empty/invalid/underscore hostname fallback: covered by regression tests.
- Android deep-link host: aligned to the current Manus hostname.
- Custom DNS/domain: intentionally not configured because the current request selected the Manus hostname.
