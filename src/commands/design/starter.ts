const DEFAULT_TITLE = 'Design Artifact'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildDesignStarterHtml(
  title: string,
  brief: string,
  createdAt: string,
): string {
  const safeTitle = escapeHtml(title || DEFAULT_TITLE)
  const safeBrief = escapeHtml(brief || 'No brief provided yet.')
  const safeCreatedAt = escapeHtml(createdAt)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      :root {
        --bg: #f4efe7;
        --surface: rgba(255, 252, 247, 0.82);
        --surface-strong: rgba(255, 249, 240, 0.96);
        --text: #1f1914;
        --muted: #6f6256;
        --accent: #b65a2a;
        --accent-2: #285c63;
        --line: rgba(31, 25, 20, 0.12);
        --shadow: 0 24px 60px rgba(41, 27, 18, 0.14);
        --radius: 28px;
        --card-radius: 22px;
        --canvas-gap: 24px;
        --density: 1;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        background:
          radial-gradient(circle at top left, rgba(182, 90, 42, 0.16), transparent 28%),
          radial-gradient(circle at top right, rgba(40, 92, 99, 0.14), transparent 30%),
          linear-gradient(180deg, #f8f3eb 0%, var(--bg) 48%, #eee4d6 100%);
        color: var(--text);
        font-family:
          'Iowan Old Style',
          'Palatino Linotype',
          'Book Antiqua',
          Georgia,
          serif;
      }

      body.compact {
        --density: 0.88;
      }

      body.cool {
        --accent: #285c63;
        --accent-2: #385e96;
      }

      a {
        color: inherit;
      }

      .shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 24px;
        min-height: 100vh;
        padding: 28px;
      }

      .workspace {
        min-width: 0;
      }

      .hero {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: linear-gradient(145deg, rgba(255, 251, 245, 0.92), rgba(250, 242, 232, 0.78));
        box-shadow: var(--shadow);
        padding: calc(32px * var(--density));
      }

      .hero::after {
        content: '';
        position: absolute;
        inset: auto -8% -28% 38%;
        height: 240px;
        background: radial-gradient(circle, rgba(182, 90, 42, 0.18), transparent 64%);
        pointer-events: none;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(31, 25, 20, 0.08);
        color: var(--muted);
        font-family:
          'IBM Plex Sans',
          'Avenir Next',
          system-ui,
          sans-serif;
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 18px 0 10px;
        max-width: 12ch;
        font-size: clamp(42px, 6vw, 76px);
        line-height: 0.92;
        letter-spacing: -0.05em;
      }

      .lede {
        max-width: 58ch;
        margin: 0;
        color: var(--muted);
        font-family:
          'IBM Plex Sans',
          'Avenir Next',
          system-ui,
          sans-serif;
        font-size: 16px;
        line-height: 1.65;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 28px;
      }

      .meta-card,
      .panel,
      .concept-card {
        border: 1px solid var(--line);
        border-radius: var(--card-radius);
        background: var(--surface);
        backdrop-filter: blur(10px);
      }

      .meta-card {
        padding: 16px 18px;
      }

      .meta-label,
      .section-label {
        font-family:
          'IBM Plex Sans',
          'Avenir Next',
          system-ui,
          sans-serif;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .meta-value {
        margin-top: 8px;
        font-size: 18px;
      }

      .canvas {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--canvas-gap);
        margin-top: 24px;
      }

      .concept-card {
        padding: 18px;
        box-shadow: 0 14px 30px rgba(26, 18, 13, 0.08);
      }

      .concept-preview {
        aspect-ratio: 4 / 5;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid rgba(31, 25, 20, 0.08);
        background:
          linear-gradient(140deg, rgba(255, 255, 255, 0.78), rgba(255, 244, 231, 0.66)),
          linear-gradient(180deg, rgba(182, 90, 42, 0.18), rgba(40, 92, 99, 0.16));
        position: relative;
      }

      .concept-preview::before,
      .concept-preview::after {
        content: '';
        position: absolute;
        border-radius: 999px;
        filter: blur(8px);
      }

      .concept-preview::before {
        inset: 18px auto auto 18px;
        width: 48%;
        height: 16px;
        background: rgba(255, 255, 255, 0.86);
      }

      .concept-preview::after {
        inset: auto 20px 20px auto;
        width: 52%;
        height: 38%;
        background: rgba(255, 255, 255, 0.36);
      }

      .concept-card h2 {
        margin: 16px 0 8px;
        font-size: 24px;
        letter-spacing: -0.04em;
      }

      .concept-card p {
        margin: 0;
        color: var(--muted);
        font-family:
          'IBM Plex Sans',
          'Avenir Next',
          system-ui,
          sans-serif;
        line-height: 1.6;
      }

      .sidebar {
        position: sticky;
        top: 28px;
        height: fit-content;
        display: grid;
        gap: 18px;
      }

      .panel {
        padding: 18px;
      }

      .panel h2 {
        margin: 10px 0 8px;
        font-size: 22px;
        letter-spacing: -0.03em;
      }

      .panel p,
      .panel li,
      .control {
        font-family:
          'IBM Plex Sans',
          'Avenir Next',
          system-ui,
          sans-serif;
        color: var(--muted);
        line-height: 1.55;
      }

      .panel ul {
        margin: 10px 0 0;
        padding-left: 18px;
      }

      .control {
        display: grid;
        gap: 6px;
        margin-top: 14px;
      }

      .control select {
        border: 1px solid rgba(31, 25, 20, 0.14);
        border-radius: 12px;
        background: var(--surface-strong);
        color: var(--text);
        padding: 10px 12px;
        font: inherit;
      }

      .footer-note {
        margin-top: 22px;
        font-family:
          'IBM Plex Sans',
          'Avenir Next',
          system-ui,
          sans-serif;
        font-size: 13px;
        color: var(--muted);
      }

      @media (max-width: 1100px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .sidebar {
          position: static;
        }

        .canvas,
        .meta {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <main class="workspace">
        <section class="hero" data-screen-label="Design Canvas">
          <div class="eyebrow">Claude Design Starter</div>
          <h1>${safeTitle}</h1>
          <p class="lede">
            This starter is the first pass artifact for the local design workflow.
            It is meant to be iterated, versioned, and replaced with a more specific
            exploration once the design brief is clarified.
          </p>
          <div class="meta">
            <div class="meta-card">
              <div class="meta-label">Created</div>
              <div class="meta-value">${safeCreatedAt}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Brief</div>
              <div class="meta-value">Embedded locally</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Output</div>
              <div class="meta-value">Versioned HTML artifact</div>
            </div>
          </div>
        </section>

        <section class="canvas" aria-label="Design directions">
          <article class="concept-card">
            <div class="concept-preview"></div>
            <h2>Grounded</h2>
            <p>
              Closest to existing product language. Use this direction when the
              user wants safe extension of current patterns and low interaction risk.
            </p>
          </article>
          <article class="concept-card">
            <div class="concept-preview"></div>
            <h2>Editorial</h2>
            <p>
              Strong type, richer contrast, and more visual rhythm. Use this
              when the work should feel more intentional without becoming novelty-first.
            </p>
          </article>
          <article class="concept-card">
            <div class="concept-preview"></div>
            <h2>Expressive</h2>
            <p>
              Bolder composition, stronger accent treatment, and more motion-friendly
              layout. Use this when the user explicitly wants variation and surprise.
            </p>
          </article>
        </section>
      </main>

      <aside class="sidebar">
        <section class="panel">
          <div class="section-label">Brief</div>
          <h2>Working brief</h2>
          <p id="brief-text">${safeBrief}</p>
        </section>

        <section class="panel">
          <div class="section-label">Tweaks</div>
          <h2>Tweaks</h2>
          <label class="control">
            Palette
            <select id="palette">
              <option value="warm">Warm editorial</option>
              <option value="cool">Cool product</option>
            </select>
          </label>
          <label class="control">
            Density
            <select id="density">
              <option value="relaxed">Relaxed</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <p class="footer-note">
            The local workflow can keep iterating this file or fork it into
            versioned revisions as the design direction becomes clearer.
          </p>
        </section>
      </aside>
    </div>

    <script>
      const palette = document.getElementById('palette')
      const density = document.getElementById('density')

      function applyTweaks() {
        document.body.classList.toggle('cool', palette.value === 'cool')
        document.body.classList.toggle('compact', density.value === 'compact')
        localStorage.setItem('claude-design:palette', palette.value)
        localStorage.setItem('claude-design:density', density.value)
      }

      palette.value = localStorage.getItem('claude-design:palette') || 'warm'
      density.value = localStorage.getItem('claude-design:density') || 'relaxed'

      palette.addEventListener('change', applyTweaks)
      density.addEventListener('change', applyTweaks)

      applyTweaks()
    </script>
  </body>
</html>
`
}
