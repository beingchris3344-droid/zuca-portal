// frontend/src/lib/hymnCache.js
import axios from "axios";
import BASE_URL from "../api";

const memory = new Map();
const inflight = new Map();
const LS_KEY = "hymnLyricsCache_v1";
const LS_MAX = 200;

let lsHydrated = false;

const hydrateFromLS = () => {
  if (lsHydrated) return;
  lsHydrated = true;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      Object.entries(parsed).forEach(([k, v]) => {
        if (v && v.title) memory.set(String(k), v);
      });
    }
  } catch (e) {
    localStorage.removeItem(LS_KEY);
  }
};

const persistToLS = () => {
  try {
    const entries = Array.from(memory.entries()).slice(-LS_MAX);
    localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (e) {
    // quota exceeded — ignore silently
  }
};

export const cacheKey = (song) => {
  if (!song) return "";
  if (song.id != null) return `id:${song.id}`;
  if (song.title) return `title:${song.title.toLowerCase()}`;
  return "";
};

export const getCached = (song) => {
  hydrateFromLS();
  const k = cacheKey(song);
  if (!k) return null;
  if (memory.has(k)) return memory.get(k);
  if (song?.title) {
    const kt = `title:${song.title.toLowerCase()}`;
    if (memory.has(kt)) return memory.get(kt);
  }
  return null;
};

export const putCached = (song, payload) => {
  hydrateFromLS();
  if (!song || !payload) return;
  const normalized = {
    id: payload.id ?? song.id,
    title: payload.title || song.title,
    reference: payload.reference || song.reference || "",
    firstLine: payload.firstLine || song.firstLine || "",
    lyrics: payload.lyrics || "",
    _cachedAt: Date.now(),
  };
  const k = cacheKey(normalized);
  if (k) memory.set(k, normalized);
  if (normalized.title) {
    memory.set(`title:${normalized.title.toLowerCase()}`, normalized);
  }
  persistToLS();
};

const fetchHymnDetail = async (hymnId, token) => {
  const res = await axios.get(`${BASE_URL}/api/public/hymns/${hymnId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.data?.success) return null;
  return res.data.hymn;
};

export const prefetchByTitle = (title, token) => {
  if (!title) return null;
  const key = `title:${title.toLowerCase()}`;
  hydrateFromLS();
  if (memory.has(key)) return Promise.resolve(memory.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      const searchRes = await axios.get(
        `${BASE_URL}/api/public/hymns/search/${encodeURIComponent(title)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const hymns = searchRes.data?.hymns || [];
      if (!hymns.length) return null;
      const exact =
        hymns.find((h) => h.title.toLowerCase() === title.toLowerCase()) ||
        hymns[0];
      const detail = await fetchHymnDetail(exact.id, token);
      if (detail) putCached({ title: detail.title }, detail);
      return detail;
    } catch (e) {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
};

export const prefetchById = (song, token) => {
  if (!song?.id) return null;
  const key = `id:${song.id}`;
  hydrateFromLS();
  if (memory.has(key)) return Promise.resolve(memory.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      const detail = await fetchHymnDetail(song.id, token);
      if (detail) putCached(song, detail);
      return detail;
    } catch (e) {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
};

export const resolveHymn = async (title, token, { revalidate = true } = {}) => {
  hydrateFromLS();
  const key = `title:${(title || "").toLowerCase()}`;
  const cached = memory.get(key);

  if (cached) {
    if (revalidate) {
      fetchHymnDetail(cached.id, token)
        .then((fresh) => {
          if (fresh) putCached({ title: fresh.title }, fresh);
        })
        .catch(() => {});
    }
    return cached;
  }

  const searchRes = await axios.get(
    `${BASE_URL}/api/public/hymns/search/${encodeURIComponent(title)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  const hymns = searchRes.data?.hymns || [];
  if (!hymns.length) return null;

  const exact =
    hymns.find((h) => h.title.toLowerCase() === title.toLowerCase()) ||
    hymns[0];
  const detail = await fetchHymnDetail(exact.id, token);
  if (detail) {
    putCached({ title: detail.title }, detail);
  }
  return detail;
};

const getInflightByIdOrTitle = (title, hintedId) => {
  const k1 = hintedId != null && hintedId !== "" ? `id:${hintedId}` : null;
  const k2 = `title:${(title || "").toLowerCase()}`;
  if (k1 && inflight.has(k1)) return inflight.get(k1);
  if (inflight.has(k2)) return inflight.get(k2);
  return null;
};

export const resolveByIdOrTitle = async (
  title,
  hintedId,
  token,
  { revalidate = true } = {}
) => {
  hydrateFromLS();
  const key = `title:${(title || "").toLowerCase()}`;
  const cached = memory.get(key);

  if (cached) {
    if (revalidate) {
      fetchHymnDetail(cached.id, token)
        .then((fresh) => {
          if (fresh) putCached({ title: fresh.title }, fresh);
        })
        .catch(() => {});
    }
    return cached;
  }

  const pending = getInflightByIdOrTitle(title, hintedId);
  if (pending) {
    try {
      const detail = await pending;
      if (detail) return detail;
    } catch (e) {
      // fall through
    }
  }

  if (hintedId != null && hintedId !== "") {
    const detail = await fetchHymnDetail(hintedId, token);
    if (detail) {
      putCached({ title: detail.title }, detail);
      return detail;
    }
  }

  return resolveHymn(title, token, { revalidate: false });
};