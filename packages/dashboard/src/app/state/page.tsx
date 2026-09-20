import Link from "next/link";

const BASE = "https://raw.githubusercontent.com/Udene1/Uden/main";

const documents = [
  ["Operating mode", "/operating-state/MODE.md"],
  ["Current state", "/operating-state/CURRENT_STATE.md"],
  ["Decisions", "/operating-state/DECISIONS.md"],
  ["Next actions", "/operating-state/NEXT_ACTIONS.md"],
  ["Cashflow OS state", "/projects/cashflow-os/STATE.md"],
  ["Compflow state", "/projects/compflow/STATE.md"],
  ["Cognitia state", "/projects/cognitia/STATE.md"],
  ["Commercial leads", "/commercial/LEADS.md"],
  ["Commercial opportunities", "/commercial/OPPORTUNITIES.md"],
  ["Commercial conversations", "/commercial/CONVERSATIONS.md"],
];

async function getDocument(path: string) {
  const res = await fetch(BASE + path, { cache: "no-store" });
  if (!res.ok) return "Unable to load this document.";
  return res.text();
}

export default async function StatePage() {
  const loaded = await Promise.all(
    documents.map(async ([title, path]) => [title, path, await getDocument(path)] as const)
  );

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ marginBottom: 40 }}>
        <p style={{ opacity: 0.65, marginBottom: 8 }}>Uden · Agent State</p>
        <h1 style={{ fontSize: 40, margin: 0 }}>Operating State</h1>
        <p style={{ maxWidth: 720, lineHeight: 1.7, opacity: 0.8 }}>
          Canonical working state for agents collaborating with Kenneth. Read this page
          before substantive work. The source files live in GitHub and this page loads
          them directly, so the displayed state stays aligned with the repository.
        </p>
        <p style={{ marginTop: 20 }}>
          <a href="https://github.com/Udene1/Uden/tree/main/operating-state" target="_blank" rel="noreferrer">
            Open repository state
          </a>
        </p>
      </header>

      <nav style={{ display: "grid", gap: 8, marginBottom: 48 }}>
        {loaded.map(([title, path]) => (
          <a key={path} href={"#"+path.replace(/[^a-zA-Z0-9]+/g, "-")}>
            {title}
          </a>
        ))}
      </nav>

      <section style={{ display: "grid", gap: 32 }}>
        {loaded.map(([title, path, body]) => (
          <article key={path} id={path.replace(/[^a-zA-Z0-9]+/g, "-")} style={{ borderTop: "1px solid rgba(128,128,128,.25)", paddingTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
              <h2 style={{ margin: 0 }}>{title}</h2>
              <a href={BASE + path} target="_blank" rel="noreferrer">raw</a>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, fontFamily: "inherit", opacity: 0.9 }}>
              {body}
            </pre>
          </article>
        ))}
      </section>

      <footer style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid rgba(128,128,128,.25)", opacity: 0.7 }}>
        This is a public bootstrap surface. Do not put secrets, credentials, private customer data,
        or sensitive personal information into the state files.
      </footer>
    </main>
  );
}
