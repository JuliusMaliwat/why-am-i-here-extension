import React, { useEffect, useMemo, useState } from "react";
import { normalizeDomain } from "../shared/domains";
import { getConfig, setConfig } from "../shared/storage";

type EditState = {
  index: number;
  value: string;
};

const HELP_EXAMPLE = "youtube.com";

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    let mounted = true;
    getConfig()
      .then((config) => {
        if (!mounted) return;
        setDomains(uniqueDomains(config.targetDomains || []));
        setTheme(config.theme ?? "dark");
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

  async function persist(nextDomains: string[]): Promise<void> {
    const normalized = uniqueDomains(nextDomains);
    setDomains(normalized);
    await setConfig({ targetDomains: normalized, theme });
  }

  async function toggleTheme(): Promise<void> {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    const config = await getConfig();
    const nextDomains = uniqueDomains(config.targetDomains || domains);
    setDomains(nextDomains);
    await setConfig({ targetDomains: nextDomains, theme: nextTheme });
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
        <div className="hero-actions">
          <a className="insights-link" href="/insights.html">
            <span className="insights-label">Insights</span>
          </a>
        </div>
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
      <button
        type="button"
        className="theme-fab"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.3 14.5A8.6 8.6 0 1 1 9.5 3.7a7 7 0 0 0 10.8 10.8z" />
          </svg>
        )}
      </button>
    </main>
  );
}
