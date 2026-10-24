# BG Remover (Next.js)

Browser-based image background remover. Images are never uploaded to a server — the AI model
(`@imgly/background-removal`) runs entirely in your browser.

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production build

```bash
npm run build
npm start
```

## Features

- Drag & drop, file picker, or paste with Ctrl+V
- Transparent PNG output
- Change the background color (white, black, blue, red, green, or custom)
- Fast and Best quality modes
- Download as PNG
- Free, no API key required

## Project structure

| File | Purpose |
| --- | --- |
| `app/page.js` | The whole UI and the background-removal logic |
| `app/layout.js` | Page title and root layout |
| `app/globals.css` | All styling |
| `next.config.js` | Webpack setup and headers that enable multi-threaded (faster) processing |
| `scripts/copy-model.js` | Copies the AI model into `public/imgly` after `npm install` |
| `public/imgly/` | The AI model files (generated automatically, not committed) |

## Note

During `npm install` the AI model (~200MB) is copied into `public/imgly`, so the model is served
locally instead of from a CDN.
