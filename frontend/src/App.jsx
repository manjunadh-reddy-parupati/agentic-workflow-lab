import { useState } from "react";
import Dropzone from "./components/Dropzone.jsx";
import ResultsDashboard from "./components/ResultsDashboard.jsx";
import { ingestSource, validateDocumentStream } from "./api.js";

// phase: "idle" | "ingesting" | "validating"
export default function App() {
  const [sourceFile, setSourceFile] = useState(null);
  const [mainFile, setMainFile] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [sourceIngested, setSourceIngested] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null); // { index, total, title }

  const busy = phase !== "idle";

  const selectSource = (f) => {
    setSourceFile(f);
    setSourceIngested(false);
    setReport(null);
    setError(null);
  };

  const selectMain = (f) => {
    setMainFile(f);
    setReport(null);
    setError(null);
  };

  const clearSource = () => {
    setSourceFile(null);
    setSourceIngested(false);
  };

  const clearMain = () => setMainFile(null);

  const handleRun = async () => {
    if (!sourceFile || !mainFile) return;
    setError(null);
    setReport(null);
    setProgress(null);

    try {
      // Phase 1 — send the Source of Truth first and await its success.
      setPhase("ingesting");
      await ingestSource(sourceFile);
      setSourceIngested(true);

      // Phase 2 — stream the section-by-section review with live progress.
      setPhase("validating");
      const result = await validateDocumentStream(mainFile, setProgress);
      setReport(result);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setPhase("idle");
      setProgress(null);
    }
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo">🛡️</span>
          <div>
            <h1>DocGovernance.ai</h1>
            <p className="app__tagline">
              AI-Driven Document Alignment &amp; Regulatory Compliance Agent
            </p>
            <p>
              Index an approved Source of Truth, then check a Main Document for
              direct contradictions against it — section by section.
            </p>
          </div>
        </div>
      </header>

      <main className="app__main">
        <section className="upload-card upload-card--dual">
          <Dropzone
            label="① Approved Reference / Source of Truth"
            file={sourceFile}
            onSelect={selectSource}
            onClear={clearSource}
            disabled={busy}
            icon="📚"
            title="Upload the Source of Truth"
            hint="This file is chunked & vectorized into the local index"
            status={sourceIngested ? "✓ indexed" : undefined}
          />

          <Dropzone
            label="② Main Document for Review"
            file={mainFile}
            onSelect={selectMain}
            onClear={clearMain}
            disabled={busy}
            icon="📄"
            title="Upload the Main Document"
            hint="Parsed into sections and checked against the source"
          />

          <button
            className="btn btn--primary upload-card__run"
            disabled={!sourceFile || !mainFile || busy}
            onClick={handleRun}
          >
            {busy ? (
              <>
                <span className="spinner" />
                {phase === "ingesting" ? "Indexing source…" : "Validating…"}
              </>
            ) : (
              <>▶ Run Alignment Check</>
            )}
          </button>
        </section>

        {busy && (
          <div className="loading-banner">
            <span className="spinner spinner--lg" />
            <div>
              {phase === "ingesting" ? (
                <>
                  <strong>Indexing the Source of Truth…</strong>
                  <p>
                    Chunking and vectorizing the reference document into the
                    local Weaviate index. The Main Document is sent next.
                  </p>
                </>
              ) : (
                <>
                  <strong>Running the agentic workflow…</strong>
                  <p>
                    Parsing sections, retrieving reference context from the
                    index, and checking each section for alignment. This can
                    take a few minutes depending on document size.
                  </p>

                  {progress && (
                    <div className="progress">
                      <div className="progress__head">
                        <span className="progress__label">
                          Analyzing section {progress.index} of{" "}
                          {progress.total}
                        </span>
                        <span className="progress__count">
                          {Math.round(
                            (progress.index / progress.total) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="progress__bar">
                        <div
                          className="progress__fill"
                          style={{
                            width: `${(progress.index / progress.total) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="progress__section" title={progress.title}>
                        <span className="progress__dot" />
                        {progress.title}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <span className="error-banner__icon">⚠️</span>
            <div>
              <strong>Alignment check failed</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {report && !busy && <ResultsDashboard report={report} />}
      </main>

      <footer className="app__footer">
        <span>Microsoft Agent Framework · FastAPI · Weaviate-Verba · React</span>
      </footer>
    </div>
  );
}
