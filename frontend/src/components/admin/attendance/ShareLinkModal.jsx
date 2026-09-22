import React, { useEffect, useState } from 'react';
import {
  FiX, FiCopy, FiCheck, FiShare2, FiCalendar, FiClock, FiMapPin,
  FiLink, FiTrash2, FiRefreshCw, FiAlertCircle, FiCheckCircle,
  FiInfo, FiExternalLink, FiHash, FiPlus
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { api } from '../../../api';

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

function relativeExpiry(expiresAt) {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} left`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} left`;
  return 'Expires soon';
}

export default function ShareLinkModal({ sheet, onClose }) {
  const [generatedLink, setGeneratedLink] = useState(null);
  const [expiryDays, setExpiryDays] = useState(7);
  const [maxUses, setMaxUses] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [activeTab, setActiveTab] = useState('generate');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => { fetchLinks(); }, []);

  useEffect(() => {
    const handleEscape = e => {
      if (e.key !== 'Escape' || loading) return;
      if (confirmDelete) { setConfirmDelete(null); return; }
      onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [loading, onClose, confirmDelete]);

  const fetchLinks = async () => {
    setLoadingLinks(true);
    try {
      const response = await api.get(`/api/attendance/sheet/${sheet.id}/links`, { headers: getHeaders() });
      setLinks(response.data.links || []);
    } catch (error) {
      console.error('Error fetching links:', error);
      setSubmitError('Could not load existing links.');
    } finally {
      setLoadingLinks(false);
    }
  };

  const validate = () => {
    const next = {};
    if (maxUses !== '' && (Number(maxUses) < 1 || !Number.isFinite(Number(maxUses)))) {
      next.maxUses = 'Max uses must be 1 or greater, or left empty for unlimited.';
    }
    return next;
  };

  const generateLink = async () => {
    if (loading) return;
    const next = validate();
    if (Object.keys(next).length) { setErrors(next); return; }

    setLoading(true);
    setErrors({});
    setSubmitError('');
    setSuccessMsg('');
    try {
      const response = await api.post(
        `/api/attendance/sheet/${sheet.id}/generate-link`,
        { expiresInDays: expiryDays, maxUses: maxUses ? parseInt(maxUses, 10) : null },
        { headers: getHeaders() }
      );
      setGeneratedLink(response.data);
      await fetchLinks();
      setSuccessMsg('Link generated successfully.');
    } catch (error) {
      setSubmitError(error.response?.data?.error || 'Failed to generate link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setSubmitError('Copy failed — please copy manually.');
    }
  };

  const copyExistingLink = async (link) => {
    const fullLink = `${window.location.origin}/attendance/link/${link.token}`;
    await copyToClipboard(fullLink);
    setSuccessMsg('Link copied to clipboard.');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const shareViaWhatsApp = () => {
    if (!generatedLink?.link) return;
    const message = encodeURIComponent(
      `*${sheet.title}* Attendance\n\n` +
      `Date: ${formatDate(sheet.eventDate)}\n` +
      `Time: ${sheet.eventTime || '4:30 PM'}\n` +
      `Location: ${sheet.location || 'ZUCA'}\n\n` +
      `Click the link below to check in:\n${generatedLink.link}\n\n` +
      `Valid until: ${formatDate(generatedLink.expiresAt)}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const requestDelete = link => setConfirmDelete(link);

  const performDelete = async () => {
    if (!confirmDelete) return;
    const linkId = confirmDelete.id;
    setDeletingId(linkId);
    setConfirmDelete(null);
    try {
      await api.delete(`/api/attendance/link/${linkId}`, { headers: getHeaders() });
      setLinks(prev => prev.filter(l => l.id !== linkId));
      if (generatedLink?.id === linkId) setGeneratedLink(null);
      setSuccessMsg('Link deleted.');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (error) {
      setSubmitError(error.response?.data?.error || 'Failed to delete link.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="sl-overlay" onMouseDown={e => e.target === e.currentTarget && !loading && onClose()}>
      <section className="sl-modal" role="dialog" aria-modal="true" aria-labelledby="sl-title">
        <header className="sl-header">
          <div className="sl-header-mark"><FiLink /></div>
          <div className="sl-header-copy">
            <h2 id="sl-title">Share attendance link</h2>
            <p>Generate a secure link members can use to check in.</p>
          </div>
          <button type="button" className="sl-icon-btn" onClick={onClose} disabled={loading} aria-label="Close"><FiX /></button>
        </header>

        {/* Sheet summary */}
        <div className="sl-summary">
          <div className="sl-summary-title">{sheet.title || 'Untitled event'}</div>
          <div className="sl-summary-meta">
            <span><FiCalendar /> {formatDate(sheet.eventDate)}</span>
            <span><FiClock /> {sheet.eventTime || '4:30 PM'}</span>
            <span><FiMapPin /> {sheet.location || 'ZUCA'}</span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="sl-tabs" role="tablist" aria-label="Link management">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'generate'}
            className={`sl-tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <FiPlus /> Generate new
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'existing'}
            className={`sl-tab ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing')}
          >
            <FiHash /> Existing links
            {links.length > 0 && <span className="sl-tab-badge">{links.length}</span>}
          </button>
        </nav>

        <main className="sl-body">
          {submitError && <div className="sl-alert error"><FiAlertCircle />{submitError}</div>}
          {successMsg && <div className="sl-alert success"><FiCheckCircle />{successMsg}</div>}

          {/* Generate tab */}
          {activeTab === 'generate' && (
            <div className="sl-panel">
              <div className="sl-field">
                <label className="sl-label"><FiClock /> Link expiry</label>
                <select className="sl-input" value={expiryDays} onChange={e => setExpiryDays(parseInt(e.target.value, 10))} disabled={loading}>
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days (default)</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div className="sl-field">
                <label className="sl-label"><FiHash /> Max uses</label>
                <input
                  className={`sl-input ${errors.maxUses ? 'invalid' : ''}`}
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited"
                  value={maxUses}
                  onChange={e => { setMaxUses(e.target.value); setErrors(prev => ({ ...prev, maxUses: '' })); }}
                  disabled={loading}
                />
                {errors.maxUses
                  ? <div className="sl-error"><FiAlertCircle /> {errors.maxUses}</div>
                  : <div className="sl-hint">Leave empty for unlimited uses.</div>}
              </div>

              <button type="button" className="sl-btn primary full" onClick={generateLink} disabled={loading}>
                {loading ? <><span className="sl-spinner" /> Generating…</> : <><FiLink /> Generate shareable link</>}
              </button>

              {generatedLink && (
                <div className="sl-generated">
                  <div className="sl-generated-head">
                    <FiCheckCircle />
                    <span>Link generated</span>
                  </div>
                  <div className="sl-url-row">
                    <input className="sl-url-input" type="text" readOnly value={generatedLink.link} onFocus={e => e.target.select()} />
                    <button type="button" className="sl-btn outline small" onClick={() => copyToClipboard(generatedLink.link)}>
                      {copied ? <><FiCheck /> Copied</> : <><FiCopy /> Copy</>}
                    </button>
                  </div>
                  <button type="button" className="sl-btn whatsapp full" onClick={shareViaWhatsApp}>
                    <FaWhatsapp /> Share on WhatsApp
                  </button>
                  <div className="sl-generated-note">
                    Expires on <strong>{formatDate(generatedLink.expiresAt)}</strong>
                    {generatedLink.maxUses ? <> • Max <strong>{generatedLink.maxUses}</strong> uses</> : ' • Unlimited uses'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing tab */}
          {activeTab === 'existing' && (
            <div className="sl-panel">
              {loadingLinks ? (
                <div className="sl-skeleton-list" aria-busy="true" aria-live="polite">
                  {[0, 1, 2].map(i => (
                    <div className="sl-skeleton-item" key={i}>
                      <div className="sl-skeleton-line w-60" />
                      <div className="sl-skeleton-line w-40" />
                      <div className="sl-skeleton-actions">
                        <div className="sl-skeleton-pill" />
                        <div className="sl-skeleton-pill" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : links.length === 0 ? (
                <div className="sl-empty">
                  <div className="sl-empty-icon"><FiLink /></div>
                  <h4>No links yet</h4>
                  <p>Generate a link to let members check in from their phone.</p>
                  <button type="button" className="sl-btn primary" onClick={() => setActiveTab('generate')}>
                    <FiPlus /> Create your first link
                  </button>
                </div>
              ) : (
                <>
                  <div className="sl-links-header">
                    <div className="sl-links-count">
                      {links.length} link{links.length === 1 ? '' : 's'}
                    </div>
                    <button type="button" className="sl-btn ghost small" onClick={fetchLinks} disabled={loadingLinks}>
                      <FiRefreshCw className={loadingLinks ? 'sl-spin-icon' : ''} /> Refresh
                    </button>
                  </div>

                  <ul className="sl-links-list">
                    {links.map(link => {
                      const isDeleting = deletingId === link.id;
                      const fullLink = `${window.location.origin}/attendance/link/${link.token}`;
                      return (
                        <li key={link.id} className={`sl-link-item ${isDeleting ? 'is-deleting' : ''}`}>
                          <div className="sl-link-main">
                            <div className="sl-link-token">
                              <FiLink /> <code>{link.token.slice(0, 18)}…</code>
                            </div>
                            <div className="sl-link-stats">
                              <span><FiHash /> {link.usedCount} / {link.maxUses || '∞'} used</span>
                              <span><FiClock /> {formatDate(link.expiresAt)}</span>
                              <span className="sl-expiry-pill">{relativeExpiry(link.expiresAt)}</span>
                            </div>
                          </div>
                          <div className="sl-link-actions">
                            <button type="button" className="sl-icon-action" title="Open link" onClick={() => window.open(fullLink, '_blank')} disabled={isDeleting}>
                              <FiExternalLink />
                            </button>
                            <button type="button" className="sl-icon-action" title="Copy link" onClick={() => copyExistingLink(link)} disabled={isDeleting}>
                              <FiCopy />
                            </button>
                            <button type="button" className="sl-icon-action danger" title="Delete link" onClick={() => requestDelete(link)} disabled={isDeleting}>
                              {isDeleting ? <span className="sl-spinner dark" /> : <FiTrash2 />}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </main>

        <footer className="sl-footer">
          <div className="sl-footer-note">
            <FiInfo /> Links can be revoked at any time.
          </div>
          <button type="button" className="sl-btn outline" onClick={onClose} disabled={loading}>Close</button>
        </footer>
      </section>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="sl-confirm-backdrop" role="presentation">
          <section className="sl-confirm" role="alertdialog" aria-modal="true" aria-labelledby="sl-del-title">
            <div className="sl-confirm-icon"><FiTrash2 /></div>
            <h3 id="sl-del-title">Delete this link?</h3>
            <p>Anyone using this link will no longer be able to check in. This cannot be undone.</p>
            <div className="sl-confirm-actions">
              <button type="button" className="sl-btn outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button type="button" className="sl-btn danger" onClick={performDelete}>Yes, delete</button>
            </div>
          </section>
        </div>
      )}

      <style>{`
        .sl-overlay{position:fixed;inset:0;z-index:1200;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit;color:#172033}
        .sl-modal{width:min(100%,560px);max-height:calc(100dvh - 48px);background:#fff;border:1px solid #dce2ea;border-radius:14px;box-shadow:0 24px 70px rgba(15,23,42,.28);display:flex;flex-direction:column;overflow:hidden}

        /* Header */
        .sl-header{display:flex;align-items:center;gap:14px;padding:20px 24px;border-bottom:1px solid #e7ebf0;flex-shrink:0;background:#fff}
        .sl-header-mark{width:42px;height:42px;display:grid;place-items:center;background:#eef2f7;color:#34445c;border-radius:10px;font-size:19px;flex-shrink:0}
        .sl-header-copy{flex:1;min-width:0}
        .sl-header h2{font-size:17px;font-weight:700;margin:0;color:#172033;letter-spacing:-.2px}
        .sl-header p{font-size:12px;color:#667085;margin:4px 0 0;line-height:1.4}
        .sl-icon-btn{width:34px;height:34px;display:grid;place-items:center;border:1px solid transparent;background:transparent;border-radius:8px;color:#667085;cursor:pointer}
        .sl-icon-btn:hover{background:#f1f4f8;color:#172033}
        .sl-icon-btn:disabled{opacity:.5;cursor:not-allowed}

        /* Sheet summary */
        .sl-summary{padding:14px 24px;background:#f8fafc;border-bottom:1px solid #e7ebf0;flex-shrink:0}
        .sl-summary-title{font-size:14px;font-weight:700;color:#172033;margin-bottom:8px;letter-spacing:-.1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sl-summary-meta{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:11px;color:#667085}
        .sl-summary-meta span{display:inline-flex;align-items:center;gap:5px}
        .sl-summary-meta svg{font-size:12px}

        /* Tabs */
        .sl-tabs{display:flex;gap:4px;padding:10px 24px 0;border-bottom:1px solid #e7ebf0;background:#fff;flex-shrink:0}
        .sl-tab{position:relative;display:inline-flex;align-items:center;gap:7px;padding:10px 14px;border:0;background:transparent;color:#667085;font:inherit;font-size:12px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;border-radius:6px 6px 0 0;transition:color .15s,background .15s,border-color .15s}
        .sl-tab:hover{color:#344054;background:#f7f9fb}
        .sl-tab.active{color:#34445c;border-bottom-color:#34445c;background:#fff}
        .sl-tab svg{font-size:14px}
        .sl-tab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:10px;background:#34445c;color:#fff;font-size:10px;font-weight:700}

        /* Body */
        .sl-body{flex:1;min-height:0;overflow-y:auto;padding:20px 24px}
        .sl-panel{animation:sl-fade .18s ease}
        @keyframes sl-fade{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}

        /* Fields */
        .sl-field{margin-bottom:16px}
        .sl-label{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:650;color:#344054;margin-bottom:7px}
        .sl-label svg{font-size:13px;color:#667085}
        .sl-input{display:block;width:100%;min-height:42px;padding:10px 12px;border:1px solid #d0d5dd;border-radius:8px;background:#fff;color:#172033;font:inherit;font-size:13px;box-sizing:border-box;outline:none;transition:border-color .15s,box-shadow .15s}
        .sl-input::placeholder{color:#98a2b3}
        .sl-input:focus{border-color:#66788f;box-shadow:0 0 0 3px rgba(52,68,92,.10)}
        .sl-input.invalid{border-color:#d92d20}
        .sl-input:disabled{background:#f8fafc;color:#98a2b3}
        .sl-hint{font-size:11px;color:#667085;margin-top:6px;line-height:1.4}
        .sl-error{display:flex;align-items:center;gap:5px;color:#b42318;font-size:11px;margin-top:6px}

        /* Buttons */
        .sl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 16px;border-radius:8px;font:inherit;font-size:12px;font-weight:650;cursor:pointer;transition:background .15s,border-color .15s;white-space:nowrap}
        .sl-btn.primary{background:#34445c;border:1px solid #34445c;color:#fff}
        .sl-btn.primary:hover:not(:disabled){background:#26364c;border-color:#26364c}
        .sl-btn.outline{background:#fff;border:1px solid #d0d5dd;color:#344054}
        .sl-btn.outline:hover:not(:disabled){background:#f8fafc}
        .sl-btn.ghost{background:transparent;border:1px solid transparent;color:#667085}
        .sl-btn.ghost:hover:not(:disabled){background:#f1f4f8;color:#172033}
        .sl-btn.danger{background:#d92d20;border:1px solid #d92d20;color:#fff}
        .sl-btn.danger:hover:not(:disabled){background:#b42318;border-color:#b42318}
        .sl-btn.whatsapp{background:#25D366;border:1px solid #25D366;color:#fff}
        .sl-btn.whatsapp:hover:not(:disabled){background:#1eb85a;border-color:#1eb85a}
        .sl-btn.full{width:100%}
        .sl-btn.small{min-height:34px;padding:0 12px;font-size:11px}
        .sl-btn:disabled{opacity:.55;cursor:not-allowed}

        /* Spinner */
        .sl-spinner{width:13px;height:13px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:sl-spin .7s linear infinite;display:inline-block}
        .sl-spinner.dark{border-color:rgba(217,45,32,.25);border-top-color:#d92d20}
        .sl-spin-icon{animation:sl-spin .9s linear infinite}
        @keyframes sl-spin{to{transform:rotate(360deg)}}

        /* Alerts */
        .sl-alert{display:flex;align-items:flex-start;gap:8px;padding:11px 12px;border-radius:8px;font-size:12px;line-height:1.45;margin-bottom:14px}
        .sl-alert svg{flex-shrink:0;margin-top:1px}
        .sl-alert.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}
        .sl-alert.error{background:#fef3f2;border:1px solid #fecdca;color:#b42318}

        /* Generated link */
        .sl-generated{margin-top:18px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px}
        .sl-generated-head{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:650;color:#166534;margin-bottom:10px}
        .sl-generated-head svg{font-size:14px}
        .sl-url-row{display:flex;gap:8px;margin-bottom:10px}
        .sl-url-input{flex:1;min-width:0;padding:9px 12px;background:#fff;border:1px solid #d0d5dd;border-radius:8px;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#172033;outline:none}
        .sl-url-input:focus{border-color:#66788f;box-shadow:0 0 0 3px rgba(52,68,92,.10)}
        .sl-generated-note{font-size:11px;color:#166534;text-align:center;margin-top:10px;line-height:1.4}
        .sl-generated-note strong{font-weight:700}

        /* Links list */
        .sl-links-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .sl-links-count{font-size:12px;font-weight:650;color:#475467}
        .sl-links-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
        .sl-link-item{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border:1px solid #e7ebf0;border-radius:10px;transition:border-color .15s,background .15s}
        .sl-link-item:hover{border-color:#cbd5e1;background:#f8fafc}
        .sl-link-item.is-deleting{opacity:.6;pointer-events:none}
        .sl-link-main{flex:1;min-width:0}
        .sl-link-token{display:flex;align-items:center;gap:6px;font-size:12px;color:#475467;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sl-link-token svg{font-size:13px;color:#667085;flex-shrink:0}
        .sl-link-token code{background:#f1f4f8;padding:2px 6px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#344054;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
        .sl-link-stats{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:11px;color:#667085}
        .sl-link-stats span{display:inline-flex;align-items:center;gap:4px}
        .sl-link-stats svg{font-size:11px}
        .sl-expiry-pill{background:#fffaeb;color:#92400e;border:1px solid #fedf89;padding:2px 8px;border-radius:20px;font-weight:600;font-size:10px}
        .sl-link-actions{display:flex;gap:4px;flex-shrink:0}
        .sl-icon-action{width:32px;height:32px;display:grid;place-items:center;background:transparent;border:1px solid #e7ebf0;border-radius:8px;color:#667085;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .sl-icon-action:hover:not(:disabled){background:#f1f4f8;color:#172033;border-color:#cbd5e1}
        .sl-icon-action.danger:hover:not(:disabled){background:#fef3f2;color:#b42318;border-color:#fecdca}
        .sl-icon-action:disabled{opacity:.5;cursor:not-allowed}
        .sl-icon-action svg{font-size:14px}

        /* Empty state */
        .sl-empty{text-align:center;padding:36px 20px;color:#667085}
        .sl-empty-icon{width:56px;height:56px;margin:0 auto 14px;display:grid;place-items:center;background:#f1f4f8;color:#475467;border-radius:14px;font-size:24px}
        .sl-empty h4{margin:0 0 6px;font-size:14px;color:#172033;font-weight:700}
        .sl-empty p{margin:0 0 18px;font-size:12px;line-height:1.5;color:#667085}

        /* Skeleton */
        .sl-skeleton-list{display:flex;flex-direction:column;gap:10px}
        .sl-skeleton-item{padding:14px;border:1px solid #e7ebf0;border-radius:10px;background:#fff}
        .sl-skeleton-line{height:10px;background:linear-gradient(90deg,#eef2f7 0%,#f7f9fb 50%,#eef2f7 100%);background-size:200% 100%;border-radius:6px;margin-bottom:8px;animation:sl-shimmer 1.3s ease-in-out infinite}
        .sl-skeleton-line.w-60{width:60%}
        .sl-skeleton-line.w-40{width:40%}
        .sl-skeleton-actions{display:flex;gap:6px;margin-top:10px}
        .sl-skeleton-pill{width:64px;height:24px;background:linear-gradient(90deg,#eef2f7 0%,#f7f9fb 50%,#eef2f7 100%);background-size:200% 100%;border-radius:6px;animation:sl-shimmer 1.3s ease-in-out infinite}
        @keyframes sl-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        /* Footer */
        .sl-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 24px;border-top:1px solid #e7ebf0;background:#fff;flex-shrink:0}
        .sl-footer-note{display:flex;align-items:center;gap:6px;font-size:11px;color:#667085}
        .sl-footer-note svg{font-size:13px;color:#98a2b3}

        /* Confirm dialog */
        .sl-confirm-backdrop{position:fixed;inset:0;z-index:1300;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:20px}
        .sl-confirm{width:min(100%,420px);background:#fff;border:1px solid #dce2ea;border-radius:14px;padding:24px;box-shadow:0 24px 70px rgba(15,23,42,.28)}
        .sl-confirm-icon{width:42px;height:42px;border-radius:10px;background:#fef3f2;color:#b42318;display:grid;place-items:center;font-size:19px;margin-bottom:14px}
        .sl-confirm h3{font-size:17px;margin:0 0 8px;font-weight:700;color:#172033}
        .sl-confirm p{font-size:13px;line-height:1.55;color:#596579;margin:0 0 20px}
        .sl-confirm-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}

        /* Responsive */
        @media(max-width:560px){
          .sl-overlay{padding:0;align-items:stretch}
          .sl-modal{width:100%;max-height:100dvh;height:100dvh;border-radius:0}
          .sl-header{padding:16px 18px}
          .sl-summary{padding:12px 18px}
          .sl-tabs{padding:8px 14px 0}
          .sl-body{padding:18px}
          .sl-footer{padding:12px 18px;flex-direction:column;align-items:stretch}
          .sl-footer .sl-btn{width:100%}
          .sl-url-row{flex-direction:column}
          .sl-url-row .sl-btn{width:100%}
          .sl-link-item{flex-direction:column;align-items:stretch}
          .sl-link-actions{justify-content:flex-end}
          .sl-confirm-actions{flex-direction:column-reverse}
          .sl-confirm-actions .sl-btn{width:100%}
        }
        @media(prefers-reduced-motion:reduce){.sl-modal *{transition:none!important;animation:none!important}}
      `}</style>
    </div>
  );
}