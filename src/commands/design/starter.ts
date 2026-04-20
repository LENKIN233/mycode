import type { DesignTemplate } from './helpers.js'

const DEFAULT_TITLE = 'Design Artifact'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildHead(title: string): string {
  return `
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
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
        --density: 1;
      }

      * { box-sizing: border-box; }

      html, body {
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

      body.compact { --density: 0.88; }
      body.cool { --accent: #285c63; --accent-2: #385e96; }
      a { color: inherit; }

      .eyebrow,
      .meta-label,
      .section-label,
      .control,
      .body-copy {
        font-family:
          'IBM Plex Sans',
          'Avenir Next',
          system-ui,
          sans-serif;
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
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .meta-label,
      .section-label {
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .panel,
      .card,
      .surface {
        border: 1px solid var(--line);
        border-radius: var(--card-radius);
        background: var(--surface);
        backdrop-filter: blur(10px);
        box-shadow: 0 14px 30px rgba(26, 18, 13, 0.08);
      }

      .control {
        display: grid;
        gap: 6px;
        margin-top: 14px;
        color: var(--muted);
      }

      .control select,
      .nav button {
        border: 1px solid rgba(31, 25, 20, 0.14);
        border-radius: 12px;
        background: var(--surface-strong);
        color: var(--text);
        padding: 10px 12px;
        font: inherit;
      }

      .nav button[disabled] {
        opacity: 0.45;
      }

      .body-copy {
        color: var(--muted);
        line-height: 1.6;
      }

      @media (max-width: 1100px) {
        .stack-mobile {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  </head>`
}

function buildCanvasBody(title: string, brief: string, createdAt: string): string {
  return `
  <body>
    <div class="shell stack-mobile" style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;min-height:100vh;padding:28px;">
      <main>
        <section class="surface" data-screen-label="Design Canvas" style="position:relative;overflow:hidden;border-radius:28px;padding:32px;">
          <div class="eyebrow">Canvas starter</div>
          <h1 style="margin:18px 0 10px;max-width:12ch;font-size:clamp(42px,6vw,76px);line-height:0.92;letter-spacing:-0.05em;">${title}</h1>
          <p class="body-copy" style="max-width:58ch;margin:0;">This starter is optimized for comparing multiple visual directions side-by-side before converging on one detailed solution.</p>
          <div class="stack-mobile" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:28px;">
            <div class="card" style="padding:16px 18px;"><div class="meta-label">Created</div><div style="margin-top:8px;font-size:18px;">${createdAt}</div></div>
            <div class="card" style="padding:16px 18px;"><div class="meta-label">Template</div><div style="margin-top:8px;font-size:18px;">Canvas</div></div>
            <div class="card" style="padding:16px 18px;"><div class="meta-label">Mode</div><div style="margin-top:8px;font-size:18px;">Three directions</div></div>
          </div>
        </section>

        <section class="stack-mobile" aria-label="Design directions" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:24px;">
          ${['Grounded', 'Editorial', 'Expressive']
            .map(
              label => `
            <article class="card" data-screen-label="${label}" style="padding:18px;">
              <div style="aspect-ratio:4/5;border-radius:18px;overflow:hidden;border:1px solid rgba(31,25,20,0.08);background:linear-gradient(140deg,rgba(255,255,255,0.78),rgba(255,244,231,0.66)),linear-gradient(180deg,rgba(182,90,42,0.18),rgba(40,92,99,0.16));"></div>
              <h2 style="margin:16px 0 8px;font-size:24px;letter-spacing:-0.04em;">${label}</h2>
              <p class="body-copy" style="margin:0;">Replace this placeholder with a real direction that explores composition, hierarchy, and visual tone differently from the others.</p>
            </article>`,
            )
            .join('')}
        </section>
      </main>

      <aside style="position:sticky;top:28px;height:fit-content;display:grid;gap:18px;">
        <section class="panel" style="padding:18px;">
          <div class="section-label">Brief</div>
          <h2 style="margin:10px 0 8px;font-size:22px;letter-spacing:-0.03em;">Working brief</h2>
          <p class="body-copy" style="margin:0;">${brief}</p>
        </section>

        <section class="panel" style="padding:18px;">
          <div class="section-label">Tweaks</div>
          <h2 style="margin:10px 0 8px;font-size:22px;letter-spacing:-0.03em;">Tweaks</h2>
          <label class="control">Palette<select id="palette"><option value="warm">Warm editorial</option><option value="cool">Cool product</option></select></label>
          <label class="control">Density<select id="density"><option value="relaxed">Relaxed</option><option value="compact">Compact</option></select></label>
        </section>
      </aside>
    </div>
    ${buildSharedTweakScript()}
  </body>`
}

function buildPrototypeBody(title: string, brief: string, createdAt: string): string {
  return `
  <body>
    <div class="stack-mobile" style="display:grid;grid-template-columns:minmax(300px,420px) minmax(0,1fr) 320px;gap:24px;min-height:100vh;padding:28px;">
      <section class="surface" data-screen-label="Phone Frame" style="padding:18px;border-radius:34px;">
        <div style="border:1px solid rgba(31,25,20,0.14);border-radius:28px;background:rgba(255,251,245,0.92);padding:16px;min-height:760px;">
          <div class="eyebrow">Prototype starter</div>
          <h1 style="margin:18px 0 10px;font-size:36px;line-height:0.96;letter-spacing:-0.05em;">${title}</h1>
          <p class="body-copy" style="margin:0 0 18px;">Use this structure for flows, onboarding, forms, and interaction-heavy design work.</p>
          <div class="card" data-screen-label="Primary Screen" style="padding:18px;background:rgba(255,255,255,0.72);">
            <div class="meta-label">Current step</div>
            <h2 style="margin:10px 0 8px;font-size:28px;letter-spacing:-0.04em;">Welcome screen</h2>
            <p class="body-copy" style="margin:0 0 18px;">Replace this placeholder with the main interaction for the flow and build additional screens as versioned or toggled states.</p>
            <div style="display:grid;gap:12px;">
              <div class="card" style="padding:14px;">Key action block</div>
              <div class="card" style="padding:14px;">Supporting information block</div>
              <div class="card" style="padding:14px;">Trust / explanation block</div>
            </div>
          </div>
        </div>
      </section>

      <main style="display:grid;gap:24px;align-content:start;">
        <section class="surface" data-screen-label="Flow Notes" style="padding:28px;">
          <div class="section-label">Flow framing</div>
          <h2 style="margin:10px 0 8px;font-size:30px;letter-spacing:-0.04em;">Interaction states to explore</h2>
          <div class="stack-mobile" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;">
            <article class="card" style="padding:16px;"><div class="meta-label">State 01</div><h3 style="margin:10px 0 8px;font-size:22px;">Entry</h3><p class="body-copy" style="margin:0;">What does the user see first, and what makes the value or next step obvious?</p></article>
            <article class="card" style="padding:16px;"><div class="meta-label">State 02</div><h3 style="margin:10px 0 8px;font-size:22px;">Decision</h3><p class="body-copy" style="margin:0;">Where should the design create confidence, reduce friction, or explain tradeoffs?</p></article>
            <article class="card" style="padding:16px;"><div class="meta-label">State 03</div><h3 style="margin:10px 0 8px;font-size:22px;">Confirmation</h3><p class="body-copy" style="margin:0;">How should success, next steps, and follow-through feel once the flow completes?</p></article>
          </div>
        </section>

        <section class="surface" style="padding:20px;">
          <div class="section-label">Brief</div>
          <p class="body-copy" style="margin:10px 0 0;">${brief}</p>
          <p class="body-copy" style="margin:10px 0 0;">Created: ${createdAt}</p>
        </section>
      </main>

      <aside class="panel" style="padding:18px;height:fit-content;position:sticky;top:28px;">
        <div class="section-label">Tweaks</div>
        <h2 style="margin:10px 0 8px;font-size:22px;letter-spacing:-0.03em;">Tweaks</h2>
        <label class="control">Palette<select id="palette"><option value="warm">Warm editorial</option><option value="cool">Cool product</option></select></label>
        <label class="control">Density<select id="density"><option value="relaxed">Relaxed</option><option value="compact">Compact</option></select></label>
      </aside>
    </div>
    ${buildSharedTweakScript()}
  </body>`
}

function buildDeckBody(title: string, brief: string, createdAt: string): string {
  return `
  <body>
    <div class="stack-mobile" style="min-height:100vh;display:grid;grid-template-columns:minmax(0,1fr) 300px;padding:24px;gap:18px;">
      <main class="surface" style="padding:24px;border-radius:30px;display:grid;grid-template-rows:auto 1fr auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
          <div class="eyebrow">Deck starter</div>
          <div class="body-copy" id="slide-counter">1 / 3</div>
        </div>
        <section id="slides" style="position:relative;overflow:hidden;">
          <article class="slide" data-screen-label="01 Title" style="display:grid;align-content:center;min-height:68vh;">
            <div class="section-label">Slide 01</div>
            <h1 style="margin:14px 0 12px;font-size:clamp(52px,7vw,88px);line-height:0.9;letter-spacing:-0.06em;">${title}</h1>
            <p class="body-copy" style="max-width:60ch;font-size:18px;">Use this starter when the brief is really a presentation, pitch, storyboard, or slide sequence instead of a single screen.</p>
          </article>
          <article class="slide" data-screen-label="02 Problem" style="display:none;grid-template-columns:1.1fr .9fr;gap:24px;align-items:center;min-height:68vh;">
            <div>
              <div class="section-label">Slide 02</div>
              <h2 style="margin:14px 0 12px;font-size:clamp(34px,5vw,58px);line-height:0.95;letter-spacing:-0.05em;">Frame the problem</h2>
              <p class="body-copy" style="max-width:54ch;">Replace this slide with the key tension, opportunity, or user shift the deck should communicate.</p>
            </div>
            <div class="card" style="aspect-ratio:4/5;padding:20px;display:grid;place-items:center;">Visual placeholder</div>
          </article>
          <article class="slide" data-screen-label="03 Direction" style="display:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:start;min-height:68vh;">
            <div class="card" style="padding:18px;"><div class="meta-label">Direction A</div><p class="body-copy">Grounded</p></div>
            <div class="card" style="padding:18px;"><div class="meta-label">Direction B</div><p class="body-copy">Editorial</p></div>
            <div class="card" style="padding:18px;"><div class="meta-label">Direction C</div><p class="body-copy">Expressive</p></div>
          </article>
        </section>
        <div class="nav" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div class="body-copy">Brief: ${brief}</div>
          <div style="display:flex;gap:10px;">
            <button id="prev-slide" type="button">Previous</button>
            <button id="next-slide" type="button">Next</button>
          </div>
        </div>
      </main>

      <aside style="display:grid;gap:18px;height:fit-content;position:sticky;top:24px;">
        <section class="panel" style="padding:18px;display:grid;gap:8px;">
          <div class="section-label">Tweaks</div>
          <h2 style="margin:10px 0 8px;font-size:22px;letter-spacing:-0.03em;">Tweaks</h2>
          <label class="control">Palette<select id="palette"><option value="warm">Warm editorial</option><option value="cool">Cool product</option></select></label>
          <label class="control">Density<select id="density"><option value="relaxed">Relaxed</option><option value="compact">Compact</option></select></label>
        </section>
        <section class="panel" style="padding:18px;display:grid;gap:8px;">
        <div class="section-label">Deck meta</div>
        <div class="body-copy">Created: ${createdAt}</div>
        <div class="body-copy">Template: Deck</div>
        </section>
      </aside>
    </div>
    ${buildSharedTweakScript()}
    ${buildDeckScript()}
  </body>`
}

function buildSharedTweakScript(): string {
  return `
    <script>
      const palette = document.getElementById('palette')
      const density = document.getElementById('density')

      function applyTweaks() {
        document.body.classList.toggle('cool', palette.value === 'cool')
        document.body.classList.toggle('compact', density.value === 'compact')
        localStorage.setItem('claude-design:palette', palette.value)
        localStorage.setItem('claude-design:density', density.value)
      }

      if (palette && density) {
        palette.value = localStorage.getItem('claude-design:palette') || 'warm'
        density.value = localStorage.getItem('claude-design:density') || 'relaxed'
        palette.addEventListener('change', applyTweaks)
        density.addEventListener('change', applyTweaks)
        applyTweaks()
      }
    </script>`
}

function buildDeckScript(): string {
  return `
    <script>
      const slides = Array.from(document.querySelectorAll('.slide'))
      const counter = document.getElementById('slide-counter')
      const prev = document.getElementById('prev-slide')
      const next = document.getElementById('next-slide')
      let index = Number(localStorage.getItem('claude-design:deck-index') || '0')
      if (!Number.isFinite(index) || index < 0 || index >= slides.length) index = 0

      function render() {
        slides.forEach((slide, idx) => {
          slide.style.display = idx === index ? (idx === 0 ? 'grid' : slide.getAttribute('data-screen-label') === '03 Direction' ? 'grid' : 'grid') : 'none'
        })
        counter.textContent = (index + 1) + ' / ' + slides.length
        prev.disabled = index === 0
        next.disabled = index === slides.length - 1
        localStorage.setItem('claude-design:deck-index', String(index))
      }

      prev.addEventListener('click', () => {
        if (index > 0) {
          index -= 1
          render()
        }
      })

      next.addEventListener('click', () => {
        if (index < slides.length - 1) {
          index += 1
          render()
        }
      })

      render()
    </script>`
}

export function buildDesignStarterHtml(
  title: string,
  brief: string,
  createdAt: string,
  template: DesignTemplate,
): string {
  const safeTitle = escapeHtml(title || DEFAULT_TITLE)
  const safeBrief = escapeHtml(brief || 'No brief provided yet.')
  const safeCreatedAt = escapeHtml(createdAt)

  const body =
    template === 'deck'
      ? buildDeckBody(safeTitle, safeBrief, safeCreatedAt)
      : template === 'prototype'
        ? buildPrototypeBody(safeTitle, safeBrief, safeCreatedAt)
        : buildCanvasBody(safeTitle, safeBrief, safeCreatedAt)

  return `<!doctype html>
<html lang="en">${buildHead(safeTitle)}${body}
</html>`
}
