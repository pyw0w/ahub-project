const escapeJsonForHtml = (value) =>
  JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("-->", "--\\>");

const buildBootstrapPayload = (config) => ({
  appName: config.appName,
  env: config.env,
  telegramBotName: config.telegramBotName,
  authMode: config.authMode,
  telemetryUrl: config.telemetryUrl,
  endpoints: config.endpoints
});

export const renderAppShell = (config) => {
  const bootstrapPayload = escapeJsonForHtml(buildBootstrapPayload(config));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${config.appName}</title>
    <style>
      :root {
        color-scheme: light;
        --bg-ink: #0d141d;
        --bg-night: #10243b;
        --bg-sun: #f3b25b;
        --surface: rgba(10, 16, 24, 0.76);
        --surface-soft: rgba(255, 255, 255, 0.08);
        --line: rgba(255, 255, 255, 0.12);
        --ink: #f7f1e5;
        --muted: rgba(247, 241, 229, 0.7);
        --accent: #8ff0c1;
        --accent-strong: #3dd691;
        --danger: #ff857a;
        --shadow: 0 30px 80px rgba(2, 8, 18, 0.45);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(243, 178, 91, 0.34), transparent 22%),
          radial-gradient(circle at top right, rgba(61, 214, 145, 0.16), transparent 24%),
          linear-gradient(145deg, var(--bg-ink) 0%, var(--bg-night) 48%, #183757 100%);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
        background-size: 36px 36px;
        mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), transparent 80%);
      }

      .layout {
        width: min(1180px, calc(100% - 28px));
        margin: 0 auto;
        padding: 28px 0 56px;
      }

      .hero {
        position: relative;
        overflow: hidden;
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.02)),
          var(--surface);
        box-shadow: var(--shadow);
        backdrop-filter: blur(16px);
      }

      .hero::after {
        content: "";
        position: absolute;
        width: 280px;
        height: 280px;
        right: -80px;
        top: -90px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(243, 178, 91, 0.65), rgba(243, 178, 91, 0));
        filter: blur(12px);
      }

      .eyebrow,
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(143, 240, 193, 0.26);
        background: rgba(143, 240, 193, 0.08);
        color: var(--accent);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .hero-grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.9fr);
        gap: 24px;
        margin-top: 18px;
      }

      h1 {
        margin: 0 0 16px;
        max-width: 10ch;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(3.1rem, 8vw, 5.6rem);
        line-height: 0.95;
        letter-spacing: -0.05em;
      }

      .lede,
      .panel-copy,
      .hint,
      .kpi-copy,
      .list-item,
      .status-copy {
        color: var(--muted);
      }

      .lede {
        max-width: 54ch;
        margin: 0 0 22px;
        font-size: 1.05rem;
        line-height: 1.7;
      }

      .cta-row,
      .shell-nav,
      .metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .button,
      .nav-button {
        appearance: none;
        border: 0;
        cursor: pointer;
      }

      .button {
        padding: 14px 18px;
        border-radius: 16px;
        font-weight: 700;
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }

      .button:hover,
      .button:focus-visible,
      .nav-button:hover,
      .nav-button:focus-visible {
        transform: translateY(-1px);
      }

      .button.primary {
        color: #092016;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        box-shadow: 0 16px 30px rgba(61, 214, 145, 0.22);
      }

      .button.secondary {
        color: var(--ink);
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--line);
      }

      .hero-card,
      .shell,
      .panel {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: rgba(7, 12, 18, 0.72);
      }

      .hero-card {
        padding: 20px;
      }

      .hero-card h2,
      .panel h2 {
        margin: 0 0 12px;
        font-size: 1rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .metrics {
        margin-top: 18px;
      }

      .metric {
        min-width: 122px;
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-soft);
      }

      .metric strong {
        display: block;
        margin-bottom: 4px;
        font-size: 1.7rem;
      }

      .shell {
        margin-top: 22px;
        padding: 16px;
        box-shadow: var(--shadow);
      }

      .shell-topbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 8px 8px 18px;
      }

      .brand {
        display: grid;
        gap: 4px;
      }

      .brand strong {
        font-size: 1.2rem;
      }

      .shell-nav {
        padding: 8px 0 22px;
      }

      .nav-button {
        padding: 12px 16px;
        border-radius: 14px;
        color: var(--muted);
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid transparent;
        font-weight: 700;
      }

      .nav-button.is-active {
        color: #092016;
        background: linear-gradient(135deg, rgba(143, 240, 193, 0.98), rgba(243, 178, 91, 0.92));
        border-color: rgba(255, 255, 255, 0.22);
      }

      .shell-body {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(270px, 0.8fr);
        gap: 16px;
      }

      .panel {
        padding: 22px;
      }

      .panel[hidden] {
        display: none;
      }

      .status-card {
        display: grid;
        gap: 12px;
      }

      .status-value {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(143, 240, 193, 0.12);
        color: var(--accent);
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .status-value.error {
        color: var(--danger);
        background: rgba(255, 133, 122, 0.12);
      }

      .status-list,
      .endpoint-list {
        display: grid;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .list-item,
      .endpoint {
        padding: 14px 16px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
      }

      .endpoint code {
        display: block;
        margin-top: 6px;
        color: var(--ink);
        overflow-wrap: anywhere;
      }

      .banner {
        display: none;
        margin-bottom: 14px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(255, 133, 122, 0.35);
        background: rgba(255, 133, 122, 0.12);
        color: #ffd5d1;
      }

      .banner.is-visible {
        display: block;
      }

      .footer-note {
        margin-top: 22px;
        color: rgba(247, 241, 229, 0.58);
        font-size: 0.92rem;
      }

      .fade-in {
        animation: rise 520ms ease both;
      }

      .fade-in[data-step="2"] {
        animation-delay: 70ms;
      }

      .fade-in[data-step="3"] {
        animation-delay: 140ms;
      }

      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(16px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 880px) {
        .hero-grid,
        .shell-body {
          grid-template-columns: 1fr;
        }

        h1 {
          max-width: none;
        }
      }

      @media (max-width: 560px) {
        .layout {
          width: min(100% - 20px, 100%);
          padding-top: 18px;
        }

        .hero,
        .panel,
        .shell {
          border-radius: 20px;
        }

        .hero,
        .panel {
          padding: 18px;
        }
      }
    </style>
  </head>
  <body>
    <main class="layout">
      <section class="hero fade-in" data-step="1">
        <span class="eyebrow">Telegram Mini App shell</span>
        <div class="hero-grid">
          <div>
            <h1>${config.appName}</h1>
            <p class="lede">
              Frontend foundation for onboarding, profile control, active season progress and payments.
              The shell bootstraps Telegram auth, guards failures, and keeps API hand-off points explicit.
            </p>
            <div class="cta-row">
              <button class="button primary" id="telegram-connect" type="button">Connect Telegram</button>
              <button class="button secondary" id="refresh-shell" type="button">Re-run bootstrap</button>
            </div>
            <div class="metrics">
              <div class="metric">
                <strong>4</strong>
                <span class="kpi-copy">integration surfaces ready</span>
              </div>
              <div class="metric">
                <strong>1</strong>
                <span class="kpi-copy">shared bootstrap payload</span>
              </div>
              <div class="metric">
                <strong>24/7</strong>
                <span class="kpi-copy">client error telemetry hook</span>
              </div>
            </div>
          </div>
          <aside class="hero-card fade-in" data-step="2">
            <h2>Bootstrap contract</h2>
            <ul class="status-list">
              <li class="list-item">Telegram WebApp detection and <code>initData</code> capture</li>
              <li class="list-item">Session bootstrap path reserved for backend auth contracts</li>
              <li class="list-item">
                Global <code>error</code> and <code>unhandledrejection</code> telemetry wiring
              </li>
              <li class="list-item">Profile, season and payments API entry points ready for slices</li>
            </ul>
          </aside>
        </div>
      </section>

      <section class="shell fade-in" data-step="3">
        <div class="shell-topbar">
          <div class="brand">
            <strong>${config.appName} cockpit</strong>
            <span class="hint">Environment: ${config.env}</span>
          </div>
          <span class="chip" id="miniapp-mode">Telegram mode pending</span>
        </div>

        <nav class="shell-nav" aria-label="Primary sections">
          <button class="nav-button is-active" data-panel-target="profile" type="button">Profile</button>
          <button class="nav-button" data-panel-target="season" type="button">Season</button>
          <button class="nav-button" data-panel-target="payments" type="button">Payments</button>
        </nav>

        <div class="banner" id="error-banner" role="alert"></div>

        <div class="shell-body">
          <section class="panel" data-panel="profile">
            <h2>Auth bootstrap</h2>
            <div class="status-card">
              <span class="status-value" id="auth-status">idle</span>
              <p class="status-copy" id="auth-message">
                Waiting for Telegram init data or a manual bootstrap attempt.
              </p>
              <ul class="status-list" id="status-facts">
                <li class="list-item">Bot: <strong>@${config.telegramBotName}</strong></li>
                <li class="list-item">Auth mode: <strong>${config.authMode}</strong></li>
                <li class="list-item">Session contract: <strong>reserved, not hard-coded</strong></li>
              </ul>
            </div>
          </section>

          <aside class="panel">
            <h2>API hand-off points</h2>
            <ul class="endpoint-list" id="endpoint-list"></ul>
          </aside>

          <section class="panel" data-panel="season" hidden>
            <h2>Season viewport</h2>
            <p class="panel-copy">
              This panel is ready for the vertical slice that pulls active season metadata, progression
              and reward lane state from the backend.
            </p>
            <ul class="status-list">
              <li class="list-item">Active season summary slot</li>
              <li class="list-item">Progress lane and rewards list slot</li>
              <li class="list-item">Telemetry event: <code>season_panel_opened</code></li>
            </ul>
          </section>

          <section class="panel" data-panel="payments" hidden>
            <h2>Payments viewport</h2>
            <p class="panel-copy">
              The shell exposes an explicit checkout integration point without coupling the UI to a provider yet.
            </p>
            <ul class="status-list">
              <li class="list-item">Checkout CTA mount point</li>
              <li class="list-item">Ledger history stub state</li>
              <li class="list-item">Telemetry event: <code>payments_panel_opened</code></li>
            </ul>
          </section>
        </div>

        <p class="footer-note">
          Client shell degrades gracefully outside Telegram and keeps runtime errors visible instead of failing silently.
        </p>
      </section>
    </main>

    <script type="application/json" id="app-bootstrap">${bootstrapPayload}</script>
    <script>
      const bootstrap = JSON.parse(document.getElementById("app-bootstrap").textContent);
      const telegramApp = globalThis.Telegram?.WebApp ?? null;
      const authStatus = document.getElementById("auth-status");
      const authMessage = document.getElementById("auth-message");
      const miniappMode = document.getElementById("miniapp-mode");
      const errorBanner = document.getElementById("error-banner");
      const endpointList = document.getElementById("endpoint-list");
      const facts = document.getElementById("status-facts");

      const setAuthState = (kind, message) => {
        authStatus.textContent = kind;
        authStatus.classList.toggle("error", kind === "error");
        authMessage.textContent = message;
      };

      const track = (event, detail = {}) => {
        const payload = JSON.stringify({
          event,
          detail,
          env: bootstrap.env,
          occurredAt: new Date().toISOString()
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon(bootstrap.telemetryUrl, payload);
          return;
        }

        void fetch(bootstrap.telemetryUrl, {
          method: "POST",
          keepalive: true,
          headers: { "content-type": "application/json" },
          body: payload
        }).catch(() => {});
      };

      const showError = (message, detail) => {
        errorBanner.textContent = message;
        errorBanner.classList.add("is-visible");
        setAuthState("error", message);
        track("client_error", detail);
      };

      const renderEndpoints = () => {
        endpointList.innerHTML = "";

        for (const [name, url] of Object.entries(bootstrap.endpoints)) {
          const item = document.createElement("li");
          item.className = "endpoint";
          item.innerHTML = "<strong>" + name + "</strong><code>" + url + "</code>";
          endpointList.append(item);
        }
      };

      const bootstrapTelegram = () => {
        if (!telegramApp) {
          miniappMode.textContent = "Browser preview";
          setAuthState(
            "preview",
            "Telegram WebApp bridge not found. Shell is running in browser preview mode."
          );
          facts.insertAdjacentHTML(
            "beforeend",
            "<li class=\\"list-item\\">Fallback: <strong>browser preview without Telegram bridge</strong></li>"
          );
          track("miniapp_preview_loaded");
          return;
        }

        telegramApp.ready();
        telegramApp.expand();

        if (telegramApp.initData) {
          miniappMode.textContent = "Telegram session detected";
          setAuthState("ready", "Telegram init data captured. Session bootstrap can continue via backend auth.");
          facts.insertAdjacentHTML(
            "beforeend",
            "<li class=\\"list-item\\">Init data: <strong>present and ready to exchange for session</strong></li>"
          );
          track("telegram_session_detected", { userId: telegramApp.initDataUnsafe?.user?.id ?? null });
          return;
        }

        miniappMode.textContent = "Telegram opened without init data";
        setAuthState(
          "warning",
          "Telegram bridge is available but init data is missing. Backend bootstrap should reject this session."
        );
        track("telegram_missing_init_data");
      };

      const activatePanel = (name) => {
        document.querySelectorAll("[data-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.panel !== name;
        });

        document.querySelectorAll("[data-panel-target]").forEach((button) => {
          button.classList.toggle("is-active", button.dataset.panelTarget === name);
        });

        track(name + "_panel_opened");
      };

      document.getElementById("telegram-connect").addEventListener("click", () => {
        errorBanner.classList.remove("is-visible");
        setAuthState("bootstrapping", "Re-checking Telegram bridge and auth hand-off.");
        track("manual_bootstrap_requested");
        bootstrapTelegram();
      });

      document.getElementById("refresh-shell").addEventListener("click", () => {
        track("shell_refresh_requested");
        location.reload();
      });

      document.querySelectorAll("[data-panel-target]").forEach((button) => {
        button.addEventListener("click", () => {
          activatePanel(button.dataset.panelTarget);
        });
      });

      globalThis.addEventListener("error", (event) => {
        showError("Unhandled runtime error in Mini App shell.", {
          message: event.message,
          filename: event.filename,
          line: event.lineno
        });
      });

      globalThis.addEventListener("unhandledrejection", (event) => {
        showError("Unhandled async failure in Mini App shell.", {
          reason: String(event.reason)
        });
      });

      renderEndpoints();
      bootstrapTelegram();
    </script>
  </body>
</html>
`;
};
