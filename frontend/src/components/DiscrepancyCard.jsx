function severityClass(severity) {
  const s = (severity || "").toLowerCase();
  if (s === "critical") return "sev sev--critical";
  if (s === "medium") return "sev sev--medium";
  return "sev sev--low";
}

export default function DiscrepancyCard({ section }) {
  const confidencePct = Math.round((section.confidence || 0) * 100);

  return (
    <article className="disc-card">
      <header className="disc-card__head">
        <div className="disc-card__title">
          <span className="disc-card__section-id">#{section.sectionId}</span>
          <h3>{section.sectionTitle || "Untitled Section"}</h3>
        </div>
        <span className={severityClass(section.severity)}>{section.severity}</span>
      </header>

      <div className="confidence">
        <div className="confidence__bar">
          <div
            className="confidence__fill"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
        <span className="confidence__label">{confidencePct}% confidence</span>
      </div>

      <ul className="disc-list">
        {section.discrepancies?.map((d, i) => (
          <li key={i} className="disc-item">
            {d.isFromImage && (
              <span className="badge badge--image">
                🖼 Image{d.imageReference ? ` · ${d.imageReference}` : ""}
              </span>
            )}

            <div className="disc-compare">
              <div className="disc-compare__col disc-compare__col--key">
                <span className="disc-compare__label">Source of Truth</span>
                <p>{d.conflictingReference}</p>
              </div>
              <div className="disc-compare__arrow">⚡</div>
              <div className="disc-compare__col disc-compare__col--doc">
                <span className="disc-compare__label">Main Document</span>
                <p>{d.statementInDocument}</p>
              </div>
            </div>

            {d.issueDescription && (
              <p className="disc-issue">{d.issueDescription}</p>
            )}

            {d.isFromImage && d.imageDescription && (
              <p className="disc-image-desc">🔍 {d.imageDescription}</p>
            )}
          </li>
        ))}
      </ul>

      {section.reasoning && (
        <footer className="disc-card__reasoning">
          <strong>Reasoning:</strong> {section.reasoning}
        </footer>
      )}
    </article>
  );
}
