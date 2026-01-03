const HELP_EXAMPLE = "youtube.com";

export type NormalizedDomainResult = {
  value?: string;
  error?: string;
};

export function normalizeDomain(raw: string): NormalizedDomainResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Enter a domain to add." };
  }

  const withScheme = trimmed.match(/^https?:\/\//i)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    const hostname = url.hostname.toLowerCase();
    const isAllowedHost =
      hostname === "localhost" || hostname.includes(".");
    const isValidChars = /^[a-z0-9.-]+$/.test(hostname);

    if (!hostname || !isAllowedHost || !isValidChars) {
      return { error: `Use a valid domain like ${HELP_EXAMPLE}.` };
    }

    return { value: hostname };
  } catch {
    return { error: `Use a valid domain like ${HELP_EXAMPLE}.` };
  }
}

export function normalizeHostname(hostname: string): string | null {
  const result = normalizeDomain(hostname);
  return result.value ?? null;
}

export function matchesTargetDomain(
  hostname: string,
  targetDomains: string[]
): boolean {
  const normalizedHost = normalizeHostname(hostname);
  if (!normalizedHost) {
    return false;
  }

  return targetDomains.some((target) => {
    const normalizedTarget = normalizeHostname(target);
    if (!normalizedTarget) {
      return false;
    }

    if (normalizedHost === normalizedTarget) {
      return true;
    }

    return normalizedHost.endsWith(`.${normalizedTarget}`);
  });
}
