// Thin API helper for talking to the FastAPI backend.

async function postFile(path, file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(path, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) message = data.detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return res.json();
}

// Phase 1: ingest the Source-of-Truth file into the local Verba index.
export function ingestSource(file) {
  return postFile("/api/ingest-source", file);
}

// Phase 2: validate the Main Document against the pre-indexed source.
export function validateDocument(file) {
  return postFile("/api/validate", file);
}

// Phase 2 (streaming): validate while receiving live per-section progress.
// `onProgress` is called with { index, total, title, status } for each section.
// Resolves with the final report object.
export async function validateDocumentStream(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/validate-stream", {
    method: "POST",
    body: formData,
  });

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) message = data.detail;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let report = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by a blank line.
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const dataLine = chunk
        .split("\n")
        .find((l) => l.startsWith("data:"));
      if (!dataLine) continue;

      const msg = JSON.parse(dataLine.slice(5).trim());
      if (msg.type === "progress") {
        onProgress?.(msg);
      } else if (msg.type === "report") {
        report = msg.report;
      } else if (msg.type === "error") {
        throw new Error(msg.message || "Validation failed.");
      }
    }
  }

  if (!report) throw new Error("No report received from the server.");
  return report;
}


