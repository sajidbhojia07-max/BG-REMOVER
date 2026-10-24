"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BACKGROUNDS = [
  { id: "transparent", label: "Transparent", value: null },
  { id: "white", label: "White", value: "#ffffff" },
  { id: "black", label: "Black", value: "#000000" },
  { id: "blue", label: "Blue", value: "#2563eb" },
  { id: "red", label: "Red", value: "#dc2626" },
  { id: "green", label: "Green", value: "#16a34a" },
];

const MAX_SIZE_MB = 15;
const MAX_DIMENSION = 2048; // bigger images are downscaled first for speed

const MODELS = [
  { id: "small", label: "Fast" },
  { id: "medium", label: "Best quality" },
];

const publicPath = () => `${window.location.origin}/imgly/`;

// Downscale very large images before processing (much faster, no visible loss)
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_DIMENSION) {
    bitmap.close?.();
    return file;
  }
  const scale = MAX_DIMENSION / longest;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return await new Promise((res) => canvas.toBlob(res, "image/png"));
}

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [fileName, setFileName] = useState("image");
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(null);
  const [model, setModel] = useState(MODELS[0]);
  const [bg, setBg] = useState(BACKGROUNDS[0]);
  const [customColor, setCustomColor] = useState("#f59e0b");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  // Free old object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  // Warm up the AI model in the background so the first image is fast
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { preload } = await import("@imgly/background-removal");
        if (!cancelled) await preload({ publicPath: publicPath(), model: model.id });
      } catch {
        /* preloading is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [model]);

  const processFile = useCallback(
    async (file) => {
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (PNG, JPG or WEBP).");
        setStatus("error");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File is too large. The maximum size is ${MAX_SIZE_MB}MB.`);
        setStatus("error");
        return;
      }

      setError("");
      setStatus("processing");
      setProgress(0);
      setProgressLabel("Loading AI model...");
      setResultBlob(null);
      setResultUrl(null);
      setElapsed(null);
      setFileName(file.name.replace(/\.[^/.]+$/, ""));
      setOriginalUrl(URL.createObjectURL(file));

      const started = performance.now();

      try {
        const input = await prepareImage(file);

        // Loaded dynamically so it only runs in the browser (not during SSR)
        const { removeBackground } = await import("@imgly/background-removal");

        const blob = await removeBackground(input, {
          publicPath: publicPath(),
          model: model.id,
          debug: false,
          output: { format: "image/png", quality: 1 },
          progress: (key, current, total) => {
            if (total > 0) setProgress(Math.round((current / total) * 100));
            setProgressLabel(
              key.startsWith("fetch") ? "Loading AI model..." : "Removing background..."
            );
          },
        });

        setResultBlob(blob);
        setResultUrl(URL.createObjectURL(blob));
        setElapsed(((performance.now() - started) / 1000).toFixed(1));
        setStatus("done");
      } catch (e) {
        console.error("Background removal error:", e);
        setError(`Something went wrong: ${e?.message || e}`);
        setStatus("error");
      }
    },
    [model]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const onPaste = useCallback(
    (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (item) processFile(item.getAsFile());
    },
    [processFile]
  );

  // Paste an image with Ctrl+V
  useEffect(() => {
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onPaste]);

  const reset = () => {
    setOriginalUrl(null);
    setResultBlob(null);
    setResultUrl(null);
    setStatus("idle");
    setError("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const activeColor = bg.id === "custom" ? customColor : bg.value;

  // If a color is selected, compose it behind the cutout on a canvas before downloading
  const download = async () => {
    if (!resultBlob) return;

    let finalBlob = resultBlob;

    if (activeColor) {
      const img = await createImageBitmap(resultBlob);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = activeColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      finalBlob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    }

    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}-no-bg.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="container">
      <header className="header">
        <span className="badge">100% Free · Private</span>
        <h1>Background Remover</h1>
        <p>
          Upload an image and remove its background in seconds with AI. Your image never leaves your
          device — everything runs in your browser.
        </p>
      </header>

      {status === "idle" || status === "error" ? (
        <>
          <div className="model-picker">
            <span className="label">Mode:</span>
            {MODELS.map((m) => (
              <button
                key={m.id}
                className={`chip ${model.id === m.id ? "active" : ""}`}
                onClick={() => setModel(m)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <section
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          >
            <div className="dz-icon">🖼️</div>
            <h2>Drag &amp; drop an image here</h2>
            <p>or click to browse — or paste with Ctrl+V</p>
            <small>PNG, JPG, WEBP · Max {MAX_SIZE_MB}MB</small>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => processFile(e.target.files?.[0])}
            />
            {error && <div className="error">{error}</div>}
          </section>
        </>
      ) : (
        <section className="workspace">
          <div className="panels">
            <div className="panel">
              <div className="panel-title">Original</div>
              <div className="img-box checker">
                {originalUrl && <img src={originalUrl} alt="Original" />}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">
                Result{elapsed ? ` · done in ${elapsed}s` : ""}
              </div>
              <div
                className={`img-box ${activeColor ? "" : "checker"}`}
                style={activeColor ? { background: activeColor } : undefined}
              >
                {status === "processing" && (
                  <div className="loader">
                    <div className="spinner" />
                    <div className="loader-text">{progressLabel}</div>
                    <div className="bar">
                      <div className="bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <small>{progress}%</small>
                  </div>
                )}
                {status === "done" && resultUrl && <img src={resultUrl} alt="Background removed" />}
              </div>
            </div>
          </div>

          {status === "done" && (
            <div className="controls">
              <div className="bg-picker">
                <span className="label">Background:</span>
                {BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    className={`swatch ${bg.id === b.id ? "active" : ""}`}
                    title={b.label}
                    onClick={() => setBg(b)}
                    style={
                      b.value
                        ? { background: b.value }
                        : {
                            backgroundImage:
                              "conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)",
                            backgroundSize: "10px 10px",
                          }
                    }
                  />
                ))}
                <label
                  className={`swatch custom ${bg.id === "custom" ? "active" : ""}`}
                  title="Custom color"
                  style={{ background: customColor }}
                >
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setBg({ id: "custom", label: "Custom", value: e.target.value });
                    }}
                  />
                </label>
              </div>

              <div className="actions">
                <button className="btn primary" onClick={download}>
                  ⬇ Download PNG
                </button>
                <button className="btn" onClick={reset}>
                  New image
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        The AI model is stored locally in this project, so there is nothing to download from the internet.
      </footer>
    </main>
  );
}
