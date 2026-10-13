import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FiX } from "react-icons/fi";
import BASE_URL from "../api";

const PRESET_COLORS = {
  purple: "#7c3aed",
  red: "#dc2626",
  amber: "#f59e0b",
  green: "#16a34a",
  blue: "#2563eb",
  slate: "#1e293b"
};

const SCROLL_SPEED_PX_PER_SEC = 60;
const ROTATE_INTERVAL_MS = 5000;
const REFETCH_MS = 60000;
const LS_KEY = "zuca_ticker_dismissed";

function getReadableTextColor(hex) {
  if (!hex) return "#ffffff";
  const clean = String(hex).replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if ([r, g, b].some((v) => isNaN(v))) return "#ffffff";
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1f2937" : "#ffffff";
}

function resolveColors(ticker) {
  if (ticker.color === "custom") {
    const bg = ticker.customBg || "#7c3aed";
    return { bg, text: ticker.customText || getReadableTextColor(bg) };
  }
  const bg = PRESET_COLORS[ticker.color] || PRESET_COLORS.purple;
  return { bg, text: ticker.customText || getReadableTextColor(bg) };
}

function isPersonalOrAckRequired(ticker) {
  return ticker.target !== "all" || ticker.requireAck === true;
}

function loadLocalDismissed() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDismissed(ids) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch (err) {
    /* ignore */
  }
}

function ClickHereLink({ url, color }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="tk-link-cta"
      style={{ color }}
    >
      Click here
    </a>
  );
}

function AckButton({ onClick, color }) {
  return (
    <button
      type="button"
      className="tk-link-cta"
      style={{ color }}
      onClick={onClick}
    >
      I understand
    </button>
  );
}

function ScrollBar({ ticker, onDismiss, onAcknowledge }) {
  const colors = resolveColors(ticker);
  const duration = Math.max(
    15,
    (ticker.text.length * 12) / SCROLL_SPEED_PX_PER_SEC
  );

  return (
    <div
      className="tk-scroll-row"
      style={{ background: colors.bg, color: colors.text }}
    >
      <div className="tk-scroll-viewport">
        <div
          className="tk-scroll-content"
          style={{ animationDuration: `${duration}s` }}
        >
          <span className="tk-scroll-text">{ticker.text}</span>
        </div>
      </div>

      {ticker.linkUrl && (
        <ClickHereLink url={ticker.linkUrl} color={colors.text} />
      )}

      {ticker.requireAck ? (
        <AckButton
          color={colors.text}
          onClick={() => onAcknowledge(ticker.id)}
        />
      ) : ticker.dismissible ? (
        <button
          type="button"
          className="tk-close-btn"
          style={{ color: colors.text }}
          aria-label="Dismiss"
          onClick={() => onDismiss(ticker.id)}
        >
          <FiX size={14} />
        </button>
      ) : null}
    </div>
  );
}

function RotateBar({ tickers, onDismiss, onAcknowledge }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [tickers.length]);

  useEffect(() => {
    if (tickers.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % tickers.length),
      ROTATE_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [tickers.length]);

  if (tickers.length === 0) return null;

  const current = tickers[index];
  const colors = resolveColors(current);

  return (
    <div
      className="tk-rotate-bar"
      style={{ background: colors.bg, color: colors.text }}
    >
      <div key={index} className="tk-rotate-body">
        <span className="tk-rotate-text">{current.text}</span>

        {current.linkUrl && (
          <ClickHereLink url={current.linkUrl} color={colors.text} />
        )}

        {current.requireAck ? (
          <AckButton
            color={colors.text}
            onClick={() => onAcknowledge(current.id)}
          />
        ) : current.dismissible ? (
          <button
            type="button"
            className="tk-close-btn"
            style={{ color: colors.text }}
            aria-label="Dismiss"
            onClick={() => onDismiss(current.id)}
          >
            <FiX size={14} />
          </button>
        ) : null}
      </div>

      {tickers.length > 1 && (
        <div className="tk-dots">
          {tickers.map((_, i) => (
            <span
              key={i}
              className="tk-dot"
              style={{
                background: colors.text,
                opacity: i === index ? 1 : 0.35
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StaticBar({ ticker, onDismiss, onAcknowledge }) {
  const colors = resolveColors(ticker);

  return (
    <div
      className="tk-static-bar"
      style={{ background: colors.bg, color: colors.text }}
    >
      <span className="tk-static-text">{ticker.text}</span>

      {ticker.linkUrl && (
        <ClickHereLink url={ticker.linkUrl} color={colors.text} />
      )}

      {ticker.requireAck ? (
        <AckButton
          color={colors.text}
          onClick={() => onAcknowledge(ticker.id)}
        />
      ) : ticker.dismissible ? (
        <button
          type="button"
          className="tk-close-btn"
          style={{ color: colors.text }}
          aria-label="Dismiss"
          onClick={() => onDismiss(ticker.id)}
        >
          <FiX size={14} />
        </button>
      ) : null}
    </div>
  );
}

export default function SmartTicker() {
  const [tickers, setTickers] = useState([]);
  const [localDismissed, setLocalDismissed] = useState(loadLocalDismissed);
  const tickerRef = useRef([]);

  tickerRef.current = tickers;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchTickers = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${BASE_URL}/api/ticker/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickers(Array.isArray(data) ? data : []);
    } catch (err) {
      /* silent */
    }
  };

  useEffect(() => {
    fetchTickers();
    const id = setInterval(fetchTickers, REFETCH_MS);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let retryTimer = null;
    let attachedSocket = null;
    let attachedHandler = null;

    const attach = () => {
      if (cancelled) return;

      const socket = window.__zucaSocket;
      if (!socket) {
        retryTimer = setTimeout(attach, 300);
        return;
      }

      attachedSocket = socket;
      attachedHandler = () => fetchTickers();

      socket.on("ticker_updated", attachedHandler);
      socket.on("ticker_acknowledged", attachedHandler);
    };

    attach();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (attachedSocket && attachedHandler) {
        attachedSocket.off("ticker_updated", attachedHandler);
        attachedSocket.off("ticker_acknowledged", attachedHandler);
      }
    };
  }, [token]);

  const dismissLocal = (id) => {
    const next = Array.from(new Set([...localDismissed, id]));
    setLocalDismissed(next);
    saveLocalDismissed(next);
  };

  const dismissServer = async (id, acknowledged) => {
    const snapshot = tickers;
    setTickers((prev) => prev.filter((t) => t.id !== id));
    try {
      await axios.post(
        `${BASE_URL}/api/ticker/${id}/dismiss`,
        { acknowledged: !!acknowledged },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      setTickers(snapshot);
    }
  };

  const handleDismiss = (id) => {
    const t = tickerRef.current.find((x) => x.id === id);
    if (!t) return;
    if (isPersonalOrAckRequired(t)) {
      dismissServer(id, false);
    } else {
      dismissLocal(id);
    }
  };

  const handleAcknowledge = (id) => {
    dismissServer(id, true);
  };

  const visible = useMemo(
    () => tickers.filter((t) => !localDismissed.includes(t.id)),
    [tickers, localDismissed]
  );

  const scrolls = visible.filter((t) => t.style === "scroll");
  const rotates = visible.filter((t) => t.style === "rotate");
  const statics = visible.filter((t) => t.style === "static");

  if (visible.length === 0) return null;

  return (
    <div className="tk-wrapper">
      {statics.map((t) => (
        <StaticBar
          key={t.id}
          ticker={t}
          onDismiss={handleDismiss}
          onAcknowledge={handleAcknowledge}
        />
      ))}

      {rotates.length > 0 && (
        <RotateBar
          tickers={rotates}
          onDismiss={handleDismiss}
          onAcknowledge={handleAcknowledge}
        />
      )}

      {scrolls.map((t) => (
        <ScrollBar
          key={t.id}
          ticker={t}
          onDismiss={handleDismiss}
          onAcknowledge={handleAcknowledge}
        />
      ))}

      <style>{tickerCSS}</style>
    </div>
  );
}

const tickerCSS = `
  .tk-wrapper {
    position: sticky;
    top: 0;
    z-index: 40;
    width: 100%;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .tk-scroll-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    font-size: 13.5px;
    font-weight: 600;
  }

  .tk-scroll-viewport {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    position: relative;
    min-width: 0;
  }

  .tk-scroll-content {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding-left: 100%;
    animation: tk-scroll linear infinite;
    will-change: transform;
  }

  .tk-scroll-text {
    display: inline-block;
  }

  @keyframes tk-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-100%); }
  }

  .tk-rotate-bar {
    padding: 11px 16px;
    font-size: 13.5px;
    font-weight: 600;
    text-align: center;
    transition: background 0.3s ease;
    min-height: 40px;
  }

  .tk-rotate-body {
    animation: tk-fade 0.4s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    line-height: 1.4;
  }

  @keyframes tk-fade {
    from { opacity: 0; transform: translateY(-3px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .tk-rotate-text {
    display: inline-block;
  }

  .tk-static-bar {
    padding: 11px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13.5px;
    font-weight: 600;
    min-height: 40px;
  }

  .tk-static-text {
    flex: 1;
    line-height: 1.5;
    word-break: break-word;
  }

  .tk-link-cta {
    text-decoration: underline;
    font-weight: 700;
    font-size: inherit;
    font-family: inherit;
    opacity: 0.95;
    transition: opacity 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 0;
    color: inherit;
  }

  .tk-link-cta:hover {
    opacity: 1;
  }

  .tk-dots {
    display: flex;
    justify-content: center;
    gap: 4px;
    margin-top: 6px;
  }

  .tk-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transition: opacity 0.3s ease;
  }

  .tk-close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: inherit;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0.85;
    transition: opacity 0.15s ease, background 0.15s ease;
    padding: 0;
    flex-shrink: 0;
  }

  .tk-close-btn:hover { opacity: 1; background: rgba(255, 255, 255, 0.15); }

  @media (max-width: 640px) {
    .tk-scroll-row { font-size: 12.5px; padding: 9px 12px; gap: 8px; }
    .tk-rotate-bar { font-size: 12.5px; padding: 10px 12px; }
    .tk-static-bar { font-size: 12.5px; padding: 10px 12px; gap: 8px; }
  }
`;