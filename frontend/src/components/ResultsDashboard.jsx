import DiscrepancyCard from "./DiscrepancyCard.jsx";

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}

export default function ResultsDashboard({ report }) {
  const discrepancies = report.discrepancies || [];
  const hasIssues = (report.issuesFound || 0) > 0;

  return (
    <section className="results">
      <div className="results__header">
        <div>
          <h2 className="results__title">Alignment Report</h2>
          {report.fileName && (
            <p className="results__file">📄 {report.fileName}</p>
          )}
        </div>
        {report.processingTime && (
          <span className="results__time">⏱ {report.processingTime}</span>
        )}
      </div>

      <div className="stats-grid">
        <StatCard label="Total Sections" value={report.totalSections ?? 0} tone="neutral" />
        <StatCard label="Clean Sections" value={report.cleanSections ?? 0} tone="good" />
        <StatCard label="Issues Found" value={report.issuesFound ?? 0} tone="bad" />
      </div>

      {!hasIssues ? (
        <div className="empty-state empty-state--success">
          <div className="empty-state__icon">✅</div>
          <h3>No discrepancies found</h3>
          <p>The document is aligned with the reference source.</p>
        </div>
      ) : (
        <div className="disc-grid">
          {discrepancies.map((section, i) => (
            <DiscrepancyCard key={section.sectionId ?? i} section={section} />
          ))}
        </div>
      )}
    </section>
  );
}
