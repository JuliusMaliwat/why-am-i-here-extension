import React, { useEffect, useMemo, useState } from "react";
import { getConfig, setConfig } from "../shared/storage";

type EditState = {
  index: number;
  value: string;
};

const HELP_EXAMPLE = "youtube.com";

function normalizeDomain(raw: string): { value?: string; error?: string } {
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

function uniqueDomains(domains: string[]): string[] {
  const seen = new Set<string>();
  return domains.filter((domain) => {
    const key = domain.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function App(): JSX.Element {
  const [domains, setDomains] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getConfig()
      .then((config) => {
        if (!mounted) return;
        setDomains(uniqueDomains(config.targetDomains || []));
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("Could not load your domains. Try again.");
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const domainCountLabel = useMemo(() => {
    if (domains.length === 0) return "No domains yet";
    if (domains.length === 1) return "1 domain";
    return `${domains.length} domains`;
  }, [domains.length]);

  async function persist(nextDomains: string[]): Promise<void> {
    const normalized = uniqueDomains(nextDomains);
    setDomains(normalized);
    await setConfig({ targetDomains: normalized });
  }

  async function handleAdd(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus(null);

    const result = normalizeDomain(input);
    if (!result.value) {
      setStatus(result.error ?? "Enter a valid domain.");
      return;
    }

    if (domains.some((domain) => domain === result.value)) {
      setStatus("That domain is already in your list.");
      return;
    }

    try {
      await persist([...domains, result.value]);
      setInput("");
    } catch {
      setStatus("Could not save your domains. Try again.");
    }
  }

  async function handleRemove(index: number): Promise<void> {
    setStatus(null);
    const next = domains.filter((_, i) => i !== index);
    try {
      await persist(next);
    } catch {
      setStatus("Could not save your domains. Try again.");
    }
  }

  function startEdit(index: number): void {
    setStatus(null);
    setEdit({ index, value: domains[index] });
  }

  async function confirmEdit(): Promise<void> {
    if (!edit) return;
    setStatus(null);

    const result = normalizeDomain(edit.value);
    if (!result.value) {
      setStatus(result.error ?? "Enter a valid domain.");
      return;
    }

    const next = domains.map((domain, idx) =>
      idx === edit.index ? result.value! : domain
    );

    if (uniqueDomains(next).length !== next.length) {
      setStatus("That domain is already in your list.");
      return;
    }

    try {
      await persist(next);
      setEdit(null);
    } catch {
      setStatus("Could not save your domains. Try again.");
    }
  }

  function cancelEdit(): void {
    setEdit(null);
  }

  return (
    <main className="app">
      <div className="hero">
        <div>
          <p className="eyebrow">why am i here</p>
          <h1>Target domains</h1>
          <p className="subcopy">
            Pick the places where you want a gentle intention check.
          </p>
        </div>
        <div className="count-pill">{domainCountLabel}</div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Manage websites</h2>
            <p className="panel-copy">
              Add or remove domains where the overlay should appear.
            </p>
          </div>
        </div>

        <form className="add-form" onSubmit={handleAdd}>
          <input
            type="text"
            placeholder={`Add a domain, e.g. ${HELP_EXAMPLE}`}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isLoading}
            aria-label="Add domain"
          />
          <button type="submit" disabled={isLoading}>
            Add
          </button>
        </form>

        {status && <p className="status">{status}</p>}

        <div className="domain-list">
          {isLoading && <p className="empty">Loading your domains...</p>}
          {!isLoading && domains.length === 0 && (
            <p className="empty">No domains yet. Start with one you visit often.</p>
          )}
          {domains.map((domain, index) => {
            const isEditing = edit?.index === index;
            return (
              <div key={`${domain}-${index}`} className="domain-row">
                {isEditing ? (
                  <input
                    className="edit-input"
                    type="text"
                    value={edit.value}
                    onChange={(event) =>
                      setEdit({ index, value: event.target.value })
                    }
                    aria-label="Edit domain"
                  />
                ) : (
                  <span className="domain-text">{domain}</span>
                )}

                <div className="row-actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="ghost"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                      <button type="button" onClick={confirmEdit}>
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => startEdit(index)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleRemove(index)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel-footer">
          <p className="hint">
            Tip: paste a full URL and we will keep only the domain.
          </p>
          <p className="hint">
            Matches apply to subdomains (e.g. {HELP_EXAMPLE} includes
            www.{HELP_EXAMPLE}).
          </p>
        </div>
      </section>
    </main>
  );
}
