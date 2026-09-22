import React, { useEffect, useMemo, useState } from 'react';
import {
  FiX, FiCalendar, FiClock, FiMapPin, FiUsers, FiClipboard,
  FiCheckCircle, FiAlertCircle, FiMessageCircle, FiChevronLeft,
  FiChevronRight, FiCheck, FiPlus, FiInfo,
  FiSmartphone, FiUserCheck, FiGrid
} from 'react-icons/fi';
import { api } from '../../../api';
import { FaWhatsapp } from 'react-icons/fa';

const initialForm = {
  title: '',
  description: '',
  eventDate: '',
  eventTime: '16:30',
  location: '',
  allowSelfCheckin: true,
  enableQRCheckin: false,
  jumuiaId: '',
  enableWhatsAppAutoSend: false,
  whatsAppCustomMessage: '',
  whatsAppSendOnCheckin: true,
  whatsAppSendOnClose: true,
  categoryName: '',
  categoryOptions: '',
  categoryRequired: true,
};

function getTodayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Field({ label, required, hint, error, children }) {
  return (
    <div className="cs-field">
      <label className="cs-label">{label}{required && <span className="cs-required"> *</span>}</label>
      {children}
      {hint && <div className="cs-hint">{hint}</div>}
      {error && <div className="cs-error"><FiAlertCircle /> {error}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label, description, icon: Icon, disabled = false }) {
  return (
    <div className={`cs-toggle-card ${checked ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <div className="cs-toggle-icon">{Icon && <Icon />}</div>
      <div className="cs-toggle-copy">
        <div className="cs-toggle-title">{label}</div>
        {description && <div className="cs-toggle-description">{description}</div>}
      </div>
      <label className="cs-switch" aria-label={label}>
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
        <span className="cs-switch-track" />
      </label>
    </div>
  );
}

export default function CreateSheetModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState(initialForm);
  const [jumuiaList, setJumuiaList] = useState([]);
  const [whatsappGroups, setWhatsappGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingJumuia, setLoadingJumuia] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [botConnected, setBotConnected] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [optionDraft, setOptionDraft] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [whatsappTab, setWhatsappTab] = useState('groups'); // 'groups' | 'message'

  const categoryOptions = useMemo(
    () => (formData.categoryOptions || '').split(',').map(v => v.trim()).filter(Boolean),
    [formData.categoryOptions]
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchJumuia = async () => {
      try {
        const response = await api.get('/api/jumuia', { headers: { Authorization: `Bearer ${token}` } });
        setJumuiaList(response.data || []);
      } catch (error) {
        console.error('Error fetching jumuia:', error);
      } finally {
        setLoadingJumuia(false);
      }
    };
    const fetchWhatsApp = async () => {
      try {
        const response = await api.get('/api/admin/whatsapp/groups', { headers: { Authorization: `Bearer ${token}` } });
        if (response.data?.success) {
          setWhatsappGroups(response.data.groups || []);
          const status = await api.get('/api/admin/whatsapp/status', { headers: { Authorization: `Bearer ${token}` } });
          setBotConnected(Boolean(status.data?.status?.connected));
        }
      } catch (error) {
        console.error('Error fetching WhatsApp groups:', error);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchJumuia();
    fetchWhatsApp();
  }, []);

  useEffect(() => {
    const handleEscape = event => {
      if (event.key !== 'Escape' || loading) return;
      if (showConfirm) {
        setShowConfirm(false);
        return;
      }
      onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [loading, onClose, showConfirm]);

  const handleChange = event => {
    const { name, value, type, checked } = event.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setSubmitError('');
  };

  const toggleGroup = (groupId, groupName) => {
    setSelectedGroups(prev => prev.some(group => group.id === groupId)
      ? prev.filter(group => group.id !== groupId)
      : [...prev, { id: groupId, name: groupName }]);
    setErrors(prev => ({ ...prev, whatsAppGroups: '' }));
  };

  const addCategoryOption = () => {
    const value = optionDraft.trim();
    if (!value || categoryOptions.some(option => option.toLowerCase() === value.toLowerCase())) return;
    setFormData(prev => ({ ...prev, categoryOptions: [...categoryOptions, value].join(', ') }));
    setOptionDraft('');
  };

  const removeCategoryOption = optionToRemove => {
    setFormData(prev => ({
      ...prev,
      categoryOptions: categoryOptions.filter(option => option !== optionToRemove).join(', '),
    }));
  };

  const validateStep = currentStep => {
    const nextErrors = {};
    if (currentStep === 0) {
      if (!formData.title.trim()) nextErrors.title = 'Enter an event title.';
      if (!formData.eventDate) nextErrors.eventDate = 'Choose an event date.';
      else if (formData.eventDate < getTodayLocal()) nextErrors.eventDate = 'Choose today or a future date.';
    }
    if (currentStep === 1 && formData.categoryName.trim() && categoryOptions.length < 2) {
      nextErrors.categoryOptions = 'Add at least two options, or clear the category name.';
    }
    if (currentStep === 2 && formData.enableWhatsAppAutoSend && selectedGroups.length === 0) {
      nextErrors.whatsAppGroups = 'Select at least one WhatsApp group.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = () => {
    const allErrors = {};
    if (!formData.title.trim()) allErrors.title = 'Enter an event title.';
    if (!formData.eventDate) allErrors.eventDate = 'Choose an event date.';
    else if (formData.eventDate < getTodayLocal()) allErrors.eventDate = 'Choose today or a future date.';
    if (formData.categoryName.trim() && categoryOptions.length < 2) allErrors.categoryOptions = 'Add at least two options, or clear the category name.';
    if (formData.enableWhatsAppAutoSend && selectedGroups.length === 0) allErrors.whatsAppGroups = 'Select at least one WhatsApp group.';
    return allErrors;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(current => Math.min(2, current + 1));
  };

  const goBack = () => {
    setStep(current => Math.max(0, current - 1));
  };

  const handleCreateClick = () => {
    if (loading) return;
    const allErrors = validateAll();
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      if (allErrors.title || allErrors.eventDate) setStep(0);
      else if (allErrors.categoryOptions) setStep(1);
      else {
        setStep(2);
        setWhatsappTab('groups');
      }
      return;
    }
    setShowConfirm(true);
  };

  const confirmCreate = async () => {
    if (loading) return;
    setShowConfirm(false);
    setLoading(true);
    setSubmitError('');
    try {
      const submitData = {
        title: formData.title.trim(),
        description: formData.description || null,
        eventDate: formData.eventDate,
        eventTime: formData.eventTime,
        location: formData.location || null,
        allowSelfCheckin: formData.allowSelfCheckin,
        enableQRCheckin: formData.enableQRCheckin,
        jumuiaId: formData.jumuiaId || null,
        enableWhatsAppAutoSend: formData.enableWhatsAppAutoSend || false,
        whatsAppGroupIds: selectedGroups.map(group => group.id).join(','),
        whatsAppGroupNames: selectedGroups.map(group => group.name).join(','),
        whatsAppCustomMessage: formData.whatsAppCustomMessage || null,
        whatsAppSendOnCheckin: formData.whatsAppSendOnCheckin !== false,
        whatsAppSendOnClose: formData.whatsAppSendOnClose !== false,
        categoryName: formData.categoryName.trim() || null,
        categoryOptions,
        categoryRequired: formData.categoryRequired !== false,
      };
      await onCreate(submitData);
      onClose();
    } catch (error) {
      console.error('Error creating sheet:', error);
      setSubmitError(error.response?.data?.error || 'Could not create the attendance sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = whatsappGroups.filter(group => (group.name || '').toLowerCase().includes(groupSearch.toLowerCase()));
  const stepTitles = ['Event details', 'Attendance setup', 'WhatsApp setup & review'];

  return (
    <div className="cs-overlay" onMouseDown={event => event.target === event.currentTarget && !loading && onClose()}>
      <section className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-title">
        <header className="cs-header">
          <div className="cs-header-mark"><FiClipboard /></div>
          <div className="cs-header-copy">
            <h2 id="cs-title">Create attendance sheet</h2>
            <p>Set up an event and choose how attendance will be recorded.</p>
          </div>
          <button type="button" className="cs-icon-button" onClick={onClose} disabled={loading} aria-label="Close"><FiX /></button>
        </header>

        <div className="cs-progress-wrap">
          <div className="cs-progress-meta"><span>Step {step + 1} of 3</span><span>{Math.round(((step + 1) / 3) * 100)}% complete</span></div>
          <div className="cs-progress"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
          <div className="cs-step-labels">
            {stepTitles.map((title, index) => (
              <button type="button" key={title} onClick={() => index < step && setStep(index)} className={`cs-step-label ${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`}>
                <span className="cs-step-number">{index < step ? <FiCheck /> : index + 1}</span>{title}
              </button>
            ))}
          </div>
        </div>

        <div className="cs-form">
          <main className="cs-body">
            {submitError && <div className="cs-alert error"><FiAlertCircle />{submitError}</div>}

            {step === 0 && <div className="cs-panel">
              <div className="cs-section-heading"><div><h3>Event details</h3><p>Start with the essential information. You can configure attendance options next.</p></div><span className="cs-section-icon"><FiCalendar /></span></div>
              <Field label="Event title" required error={errors.title}>
                <input className={`cs-input ${errors.title ? 'invalid' : ''}`} name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Leaders Meeting, Choir practice," autoFocus />
              </Field>
              <Field label="Description (optional)" hint="Optional — add any details attendees should know.">
                <textarea className="cs-input cs-textarea" name="description" value={formData.description} onChange={handleChange} placeholder="Add a short description of this event..." rows={3} />
              </Field>
              <div className="cs-grid-two">
                <Field label="Event date" required error={errors.eventDate}>
                  <div className="cs-input-icon"><FiCalendar /><input className={`cs-input ${errors.eventDate ? 'invalid' : ''}`} type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} min={getTodayLocal()} /></div>
                </Field>
                <Field label="Start time">
                  <div className="cs-input-icon"><FiClock /><input className="cs-input" type="time" name="eventTime" value={formData.eventTime} onChange={handleChange} /></div>
                </Field>
              </div>
              <Field label="Location" hint="Optional — e.g. Main sanctuary, Hall 2.">
                <div className="cs-input-icon"><FiMapPin /><input className="cs-input" name="location" value={formData.location} onChange={handleChange} placeholder="Where will the event take place?" /></div>
              </Field>
              <Field label="Target audience" hint="Leave as All Members to make the sheet available to all members.">
                <div className="cs-input-icon"><FiUsers /><select className="cs-input" name="jumuiaId" value={formData.jumuiaId} onChange={handleChange}>
                  <option value="">All Members</option><option value="executive-team">Leaders only </option>
                  {loadingJumuia ? <option disabled>Loading Jumuia...</option> : jumuiaList.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select></div>
              </Field>
            </div>}

            {step === 1 && <div className="cs-panel">
              <div className="cs-section-heading"><div><h3>Attendance setup</h3><p>Choose the check-in methods members can use. Manual attendance is always available.</p></div><span className="cs-section-icon"><FiUserCheck /></span></div>
              <div className="cs-method-list">
                <div className="cs-toggle-card always-on"><div className="cs-toggle-icon"><FiClipboard /></div><div className="cs-toggle-copy"><div className="cs-toggle-title">Manual check-in</div><div className="cs-toggle-description">Admins can mark members present manually.</div></div><span className="cs-status-pill">Always on</span></div>
                <Toggle checked={formData.allowSelfCheckin} onChange={event => setFormData(prev => ({ ...prev, allowSelfCheckin: event.target.checked }))} label="Self check-in" description="Members check themselves in through the app." icon={FiUsers} />
                <Toggle checked={formData.enableQRCheckin} onChange={event => setFormData(prev => ({ ...prev, enableQRCheckin: event.target.checked }))} label="QR code check-in" description="Members scan a QR code to record attendance." icon={FiGrid} />
              </div>
              <div className="cs-subsection">
                <div className="cs-subsection-heading"><div><h4>Custom check-in category</h4><p>Optional — ask members to select an additional detail.</p></div><span className="cs-optional">Optional</span></div>
                <Field label="Category name" hint="Examples:Your Voice, year of study.">
                  <input className="cs-input" name="categoryName" value={formData.categoryName} onChange={handleChange} placeholder="e.g.Your Voice,(Heading)  " />
                </Field>
                <Field label="Category options" hint="Add at least two options when a category name is provided NOTE: separate using commas." error={errors.categoryOptions}>
                  <div className="cs-add-option"><input className="cs-input" value={optionDraft} onChange={event => setOptionDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCategoryOption(); } }} placeholder="e.g Alto,Sop,Tenor,Bass" /><button type="button" className="cs-button outline small" onClick={addCategoryOption} disabled={!optionDraft.trim()}><FiPlus /> Add</button></div>
                  {categoryOptions.length > 0 && <div className="cs-chips">{categoryOptions.map(option => <span className="cs-chip" key={option}>{option}<button type="button" onClick={() => removeCategoryOption(option)} aria-label={`Remove ${option}`}><FiX /></button></span>)}</div>}
                </Field>
                {formData.categoryName.trim() && <label className="cs-checkbox-row"><input type="checkbox" name="categoryRequired" checked={formData.categoryRequired} onChange={handleChange} /><span><strong>Required at check-in</strong><small>Members must select one of the category options.</small></span></label>}
              </div>
            </div>}

            {step === 2 && <div className="cs-panel">
              <div className="cs-section-heading"><div><h3>WhatsAPP & review</h3><p>Configure WhatsApp delivery if you want attendance updates sent automatically.</p></div><span className="cs-section-icon"><FiMessageCircle /></span></div>
              <Toggle checked={formData.enableWhatsAppAutoSend} onChange={event => setFormData(prev => ({ ...prev, enableWhatsAppAutoSend: event.target.checked }))} label="WhatsApp auto-send" description="Automatically send attendance updates to selected WhatsApp groups." icon={FiSmartphone} />

              {formData.enableWhatsAppAutoSend && <div className="cs-whatsapp-settings">
                <div className={`cs-alert ${botConnected ? 'success' : 'warning'}`}>{botConnected ? <FiCheckCircle /> : <FiAlertCircle />}<span>{botConnected ? 'WhatsApp bot is connected.' : 'WhatsApp bot is not connected. Connect it in admin settings before using auto-send.'}</span></div>

                {/* Tabs */}
                <div className="cs-tabs" role="tablist" aria-label="WhatsApp settings">
                  
                  <button
                    type="button"
                    role="tab"
                    aria-selected={whatsappTab === 'message'}
                    className={`cs-tab ${whatsappTab === 'message' ? 'active' : ''}`}
                    onClick={() => setWhatsappTab('message')}
                  >
                    <FiMessageCircle /> Message in Sheet
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={whatsappTab === 'groups'}
                    className={`cs-tab ${whatsappTab === 'groups' ? 'active' : ''}`}
                    onClick={() => setWhatsappTab('groups')}
                  >
                    <FaWhatsapp color='green' /> WhatsAPP Groups
                    {selectedGroups.length > 0 && <span className="cs-tab-badge">{selectedGroups.length}</span>}
                  </button>
                </div>

                {/* Tab: Groups */}
                {whatsappTab === 'groups' && (
                  <div className="cs-tab-panel" role="tabpanel">
                    <Field label="WhatsApp groups select groups to send the list" required error={errors.whatsAppGroups} hint={`${selectedGroups.length} group${selectedGroups.length === 1 ? '' : 's'} selected`}>
                      {loadingGroups ? <div className="cs-empty-state">Loading WhatsApp groups...</div> : whatsappGroups.length === 0 ? <div className="cs-empty-state"><FiInfo /><span>No WhatsApp groups found. Link the bot in admin settings first.</span></div> : <>
                        <input className="cs-input cs-search" value={groupSearch} onChange={event => setGroupSearch(event.target.value)} placeholder="Search groups..." />
                        <div className="cs-groups-list">{filteredGroups.map(group => {
                          const selected = selectedGroups.some(item => item.id === group.id);
                          return <label key={group.id} className={`cs-group-row ${selected ? 'selected' : ''}`}><input type="checkbox" checked={selected} onChange={() => toggleGroup(group.id, group.name)} /><span className="cs-group-check">{selected && <FiCheck />}</span><span className="cs-group-copy"><strong>{group.name}</strong><small>{group.participants || 0} members</small></span>{group.isActive && <span className="cs-status-pill">Active</span>}</label>;
                        })}{filteredGroups.length === 0 && <div className="cs-empty-state">No groups match your search.</div>}</div>
                      </>}
                    </Field>
                    {selectedGroups.length > 0 && <div className="cs-selected-summary"><FiCheckCircle /><span><strong>Sending to:</strong> {selectedGroups.map(group => group.name).join(', ')}</span></div>}
                  </div>
                )}

                {/* Tab: Message */}
                {whatsappTab === 'message' && (
                  <div className="cs-tab-panel" role="tabpanel">
                    <Field label="Custom message you want to include to whatsApp list" hint="Use {list} where you want the attendee list to appear.">
                      <textarea className="cs-input cs-textarea" name="whatsAppCustomMessage" value={formData.whatsAppCustomMessage} onChange={handleChange} rows={4} placeholder="Attendance update for {title}..." />
                      <div className="cs-token-note">Available placeholders: {'{title}'}, {'{date}'}, {'{time}'}, {'{location}'}, {'{total}'}, {'{list}'}</div>
                    </Field>
                    <div className="cs-send-options">
                      <label className="cs-checkbox-row compact"><input type="checkbox" name="whatsAppSendOnCheckin" checked={formData.whatsAppSendOnCheckin} onChange={handleChange} /><span><strong>Send on every check-in</strong></span></label>
                      <label className="cs-checkbox-row compact"><input type="checkbox" name="whatsAppSendOnClose" checked={formData.whatsAppSendOnClose} onChange={handleChange} /><span><strong>Send when the meeting closes</strong></span></label>
                    </div>
                  </div>
                )}
              </div>}

              <div className="cs-review-card"><div className="cs-review-heading"><FiClipboard /><strong>Review attendance sheet</strong></div><div className="cs-review-title">{formData.title || 'Untitled event'}</div>{formData.description && <p>{formData.description}</p>}<div className="cs-review-meta"><span><FiCalendar />{formData.eventDate || 'Date not set'}</span><span><FiClock />{formData.eventTime || 'Time not set'}</span>{formData.location && <span><FiMapPin />{formData.location}</span>}<span><FiUsers />{formData.jumuiaId === 'executive-team' ? 'Leaders only' : jumuiaList.find(item => String(item.id) === String(formData.jumuiaId))?.name || 'Everyone'}</span></div><div className="cs-review-tags">{formData.allowSelfCheckin && <span>Self check-in</span>}{formData.enableQRCheckin && <span>QR check-in</span>}{formData.categoryName.trim() && <span>{formData.categoryName}</span>}{formData.enableWhatsAppAutoSend && <span>WhatsApp updates</span>}{!formData.allowSelfCheckin && !formData.enableQRCheckin && <span>Manual check-in</span>}</div></div>
            </div>}
          </main>

          <footer className="cs-footer">
            <div className="cs-footer-note">{step === 0 ? <><span className="cs-required">*</span> Required fields</> : step === 1 ? 'You can change these settings later if needed.' : 'Review your details before creating the sheet.'}</div>
            <div className="cs-footer-actions">
              <button type="button" className="cs-button text" onClick={step === 0 ? onClose : goBack} disabled={loading}>
                {step === 0 ? 'Cancel' : <><FiChevronLeft /> Back</>}
              </button>

              {step < 2 ? (
                <button key={`continue-${step}`} type="button" className="cs-button primary" onClick={goNext} disabled={loading}>
                  Continue <FiChevronRight />
                </button>
              ) : (
                <button key="create-sheet" type="button" className="cs-button primary" onClick={handleCreateClick} disabled={loading}>
                  {loading ? <><span className="cs-spinner" /> Creating...</> : <><FiCheck /> Create sheet</>}
                </button>
              )}
            </div>
          </footer>
        </div>
      </section>

      {showConfirm && <div className="cs-confirm-backdrop" role="presentation">
        <section className="cs-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cs-confirm-title" aria-describedby="cs-confirm-description">
          <div className="cs-confirm-icon"><FiAlertCircle /></div>
          <h3 id="cs-confirm-title">Create this attendance sheet?</h3>
          <p id="cs-confirm-description">You are about to create <strong>{formData.title.trim()}</strong>{formData.eventDate ? ` for ${formData.eventDate}` : ''}. This action will save the sheet.</p>
          {submitError && <div className="cs-alert error">{submitError}</div>}
          <div className="cs-confirm-actions">
            <button type="button" className="cs-button outline" onClick={() => setShowConfirm(false)} disabled={loading}>Go back</button>
            <button type="button" className="cs-button primary" onClick={confirmCreate} disabled={loading}>{loading ? 'Creating…' : 'Yes, create sheet'}</button>
          </div>
        </section>
      </div>}

      <style>{`
        .cs-overlay{position:fixed;inset:0;z-index:1200;background:rgba(15,23,42,.52);display:flex;align-items:center;justify-content:center;padding:24px;font-family:inherit;color:#172033}
        .cs-modal{width:min(100%,800px);height:min(900px,calc(100dvh - 48px));max-height:calc(100dvh - 48px);background:#fff;border:1px solid #dce2ea;border-radius:14px;box-shadow:0 24px 70px rgba(15,23,42,.22);display:flex;flex-direction:column;overflow:hidden}
        .cs-header{display:flex;align-items:center;gap:14px;padding:22px 28px;border-bottom:1px solid #e7ebf0;background:#fff;flex-shrink:0}
        .cs-header-mark{width:44px;height:44px;display:grid;place-items:center;background:#eef2f7;color:#34445c;border-radius:10px;font-size:21px;flex-shrink:0}
        .cs-header-copy{flex:1;min-width:0}.cs-header h2{font-size:20px;line-height:1.3;font-weight:700;margin:0;color:#172033;letter-spacing:-.3px}.cs-header p{font-size:13px;color:#667085;margin:5px 0 0;line-height:1.45}
        .cs-icon-button{width:36px;height:36px;display:grid;place-items:center;border:1px solid transparent;background:transparent;border-radius:8px;color:#667085;font-size:20px;cursor:pointer}.cs-icon-button:hover{background:#f1f4f8;color:#172033}.cs-icon-button:disabled{opacity:.5;cursor:not-allowed}
        .cs-progress-wrap{padding:18px 28px 16px;border-bottom:1px solid #e7ebf0;flex-shrink:0}.cs-progress-meta{display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:#667085;margin-bottom:9px}.cs-progress{height:5px;background:#e9edf2;border-radius:20px;overflow:hidden}.cs-progress span{display:block;height:100%;background:#34445c;border-radius:20px;transition:width .2s ease}
        .cs-step-labels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:15px}.cs-step-label{display:flex;align-items:center;gap:8px;border:0;background:transparent;padding:0;text-align:left;font-size:12px;font-weight:500;color:#98a2b3;cursor:default;white-space:nowrap}.cs-step-label.active{color:#243247;font-weight:700}.cs-step-label.complete{color:#475467;cursor:pointer}.cs-step-number{width:23px;height:23px;border:1px solid #d0d5dd;border-radius:50%;display:grid;place-items:center;font-size:11px;flex-shrink:0;background:#fff}.cs-step-label.active .cs-step-number{background:#34445c;border-color:#34445c;color:#fff}.cs-step-label.complete .cs-step-number{background:#eef2f6;border-color:#cbd5e1;color:#34445c}
        .cs-form{display:flex;flex:1;flex-direction:column;min-height:0;overflow:hidden}.cs-body{padding:26px 28px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;min-height:0;flex:1}.cs-panel{max-width:680px;margin:0 auto}.cs-section-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:24px}.cs-section-heading h3{font-size:18px;color:#172033;margin:0 0 6px;font-weight:700;letter-spacing:-.2px}.cs-section-heading p{font-size:13px;line-height:1.5;color:#667085;margin:0;max-width:540px}.cs-section-icon{width:40px;height:40px;display:grid;place-items:center;background:#f1f4f8;color:#475467;border-radius:9px;font-size:19px;flex-shrink:0}
        .cs-field{margin-bottom:18px;min-width:0}.cs-label{display:block;font-size:12px;font-weight:650;color:#344054;margin-bottom:7px}.cs-required{color:#b42318}.cs-input{display:block;width:100%;min-height:42px;padding:10px 12px;border:1px solid #d0d5dd;border-radius:7px;background:#fff;color:#172033;font:inherit;font-size:13px;box-sizing:border-box;outline:none;transition:border-color .15s,box-shadow .15s}.cs-input::placeholder{color:#98a2b3}.cs-input:focus{border-color:#66788f;box-shadow:0 0 0 3px rgba(52,68,92,.10)}.cs-input.invalid{border-color:#d92d20}.cs-textarea{resize:vertical;min-height:84px;line-height:1.5}.cs-hint{font-size:11px;line-height:1.45;color:#667085;margin-top:6px}.cs-error{display:flex;align-items:center;gap:5px;color:#b42318;font-size:11px;margin-top:6px}.cs-grid-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cs-input-icon{position:relative}.cs-input-icon>svg{position:absolute;left:12px;top:13px;color:#667085;font-size:15px;pointer-events:none;z-index:1}.cs-input-icon .cs-input{padding-left:36px}.cs-input-icon select{appearance:auto}
        .cs-method-list{display:grid;gap:10px;margin-bottom:26px}.cs-toggle-card{display:flex;align-items:center;gap:13px;padding:14px 15px;border:1px solid #e0e5ec;border-radius:9px;background:#fff;min-width:0}.cs-toggle-card.is-on{border-color:#aab5c4;background:#f9fafb}.cs-toggle-card.is-disabled{opacity:.65}.cs-toggle-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:8px;background:#f1f4f8;color:#475467;font-size:17px;flex-shrink:0}.cs-toggle-copy{flex:1;min-width:0}.cs-toggle-title{font-size:13px;font-weight:650;color:#273449}.cs-toggle-description{font-size:12px;color:#667085;line-height:1.45;margin-top:3px}.cs-status-pill{font-size:10px;font-weight:650;color:#475467;background:#eef2f6;border-radius:20px;padding:5px 9px;white-space:nowrap}.cs-switch{position:relative;display:inline-flex;width:40px;height:23px;flex-shrink:0;cursor:pointer}.cs-switch input{position:absolute;opacity:0;width:1px;height:1px}.cs-switch-track{position:absolute;inset:0;background:#cbd2dc;border-radius:20px;transition:background .15s}.cs-switch-track:after{content:'';position:absolute;width:17px;height:17px;left:3px;top:3px;background:#fff;border-radius:50%;box-shadow:0 1px 2px #0002;transition:transform .15s}.cs-switch input:checked+.cs-switch-track{background:#34445c}.cs-switch input:checked+.cs-switch-track:after{transform:translateX(17px)}.cs-switch input:focus-visible+.cs-switch-track{outline:3px solid #cbd5e1;outline-offset:2px}.cs-switch input:disabled+.cs-switch-track{cursor:not-allowed}
        .cs-subsection{padding:20px;border:1px solid #e0e5ec;border-radius:10px;background:#fafbfc}.cs-subsection-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:17px}.cs-subsection-heading h4{font-size:14px;margin:0 0 4px;color:#273449}.cs-subsection-heading p{font-size:12px;color:#667085;margin:0;line-height:1.4}.cs-optional{font-size:10px;color:#667085;border:1px solid #d0d5dd;border-radius:20px;padding:4px 8px;white-space:nowrap;background:#fff}.cs-add-option{display:flex;gap:8px}.cs-add-option .cs-input{flex:1;min-width:0}.cs-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.cs-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 8px 5px 10px;background:#eef2f6;border:1px solid #dce2ea;border-radius:6px;font-size:12px;color:#344054}.cs-chip button{display:grid;place-items:center;border:0;background:transparent;color:#667085;cursor:pointer;padding:1px;font-size:13px}.cs-checkbox-row{display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-top:14px}.cs-checkbox-row input{margin:3px 0 0;accent-color:#34445c;width:15px;height:15px;flex-shrink:0}.cs-checkbox-row span{display:flex;flex-direction:column;gap:3px}.cs-checkbox-row strong{font-size:12px;color:#344054;font-weight:600}.cs-checkbox-row small{font-size:11px;color:#667085;line-height:1.4}.cs-checkbox-row.compact{margin:0}
        .cs-whatsapp-settings{border:1px solid #e0e5ec;border-radius:9px;padding:16px;margin:12px 0 22px;background:#fafbfc}
        .cs-tabs{display:flex;gap:4px;border-bottom:1px solid #e0e5ec;margin-bottom:16px}
        .cs-tab{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border:0;background:transparent;color:#667085;font:inherit;font-size:12px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;border-radius:6px 6px 0 0}
        .cs-tab:hover{color:#344054;background:#f1f4f8}
        .cs-tab.active{color:#34445c;border-bottom-color:#34445c;background:#fff}
        .cs-tab svg{font-size:14px}
        .cs-tab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:10px;background:#34445c;color:#fff;font-size:10px;font-weight:700}
        .cs-tab-panel{animation:cs-fade .15s ease}
        @keyframes cs-fade{from{opacity:0}to{opacity:1}}
        .cs-alert{display:flex;align-items:flex-start;gap:9px;padding:11px 12px;border-radius:7px;font-size:12px;line-height:1.45;margin-bottom:16px}.cs-alert svg{flex-shrink:0;margin-top:1px}.cs-alert.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}.cs-alert.warning{background:#fffaeb;border:1px solid #fedf89;color:#92400e}.cs-alert.error{background:#fef3f2;border:1px solid #fecdca;color:#b42318}.cs-search{margin-bottom:8px}.cs-groups-list{max-height:210px;overflow-y:auto;border:1px solid #e0e5ec;border-radius:7px;background:#fff}.cs-group-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #edf0f4;cursor:pointer}.cs-group-row:last-child{border-bottom:0}.cs-group-row:hover,.cs-group-row.selected{background:#f5f7fa}.cs-group-row input{position:absolute;opacity:0;pointer-events:none}.cs-group-check{width:17px;height:17px;border:1px solid #c4ccd6;border-radius:4px;display:grid;place-items:center;color:#fff;font-size:12px;flex-shrink:0}.cs-group-row.selected .cs-group-check{background:#34445c;border-color:#34445c}.cs-group-copy{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}.cs-group-copy strong{font-size:12px;font-weight:600;color:#344054;overflow:hidden;text-overflow:ellipsis}.cs-group-copy small{font-size:10px;color:#667085}.cs-selected-summary{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:7px;color:#166534;font-size:11px;line-height:1.5;margin:10px 0 0}.cs-selected-summary svg{flex-shrink:0;margin-top:1px}.cs-token-note{font-size:10px;line-height:1.5;color:#667085;margin-top:7px;overflow-wrap:anywhere}.cs-send-options{display:flex;gap:18px;flex-wrap:wrap;padding-top:12px;border-top:1px solid #e4e7ec;margin-top:14px}.cs-empty-state{display:flex;align-items:center;gap:8px;padding:14px;border:1px dashed #d0d5dd;border-radius:7px;background:#fff;color:#667085;font-size:12px;line-height:1.4}
        .cs-review-card{border:1px solid #dce2ea;border-radius:9px;padding:17px;margin-top:22px;background:#fff}.cs-review-heading{display:flex;align-items:center;gap:8px;font-size:12px;color:#475467;padding-bottom:12px;border-bottom:1px solid #edf0f4}.cs-review-title{font-size:16px;font-weight:700;color:#172033;margin-top:13px}.cs-review-card>p{font-size:12px;color:#667085;margin:6px 0 0;line-height:1.5}.cs-review-meta{display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:13px}.cs-review-meta span{display:flex;align-items:center;gap:6px;font-size:11px;color:#667085}.cs-review-meta svg{font-size:13px}.cs-review-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.cs-review-tags span{font-size:10px;font-weight:600;padding:5px 8px;border-radius:5px;background:#eef2f6;color:#475467}
        .cs-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 28px;border-top:1px solid #e7ebf0;background:#fff;flex-shrink:0}.cs-footer-note{font-size:11px;color:#667085}.cs-footer-actions{display:flex;align-items:center;gap:9px}.cs-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:39px;padding:0 16px;border-radius:7px;font:inherit;font-size:12px;font-weight:650;cursor:pointer;transition:background .15s,border-color .15s}.cs-button.primary{background:#34445c;border:1px solid #34445c;color:#fff}.cs-button.primary:hover{background:#26364c;border-color:#26364c}.cs-button.outline{background:#fff;border:1px solid #d0d5dd;color:#344054}.cs-button.outline:hover{background:#f8fafc}.cs-button.text{background:#fff;border:1px solid #d0d5dd;color:#475467}.cs-button.text:hover{background:#f8fafc}.cs-button:disabled{opacity:.55;cursor:not-allowed}.cs-button.small{min-height:39px;padding:0 12px}.cs-spinner{width:13px;height:13px;border:2px solid #ffffff66;border-top-color:#fff;border-radius:50%;animation:cs-spin .7s linear infinite}@keyframes cs-spin{to{transform:rotate(360deg)}}
        .cs-confirm-backdrop{position:fixed;inset:0;z-index:1300;background:rgba(15,23,42,.48);display:flex;align-items:center;justify-content:center;padding:20px}
        .cs-confirm-dialog{width:min(100%,440px);background:#fff;border:1px solid #dce2ea;border-radius:14px;padding:26px;box-shadow:0 24px 70px rgba(15,23,42,.28);color:#172033}
        .cs-confirm-icon{width:42px;height:42px;border-radius:10px;background:#eef2f6;color:#34445c;display:grid;place-items:center;font-size:20px;margin-bottom:14px}
        .cs-confirm-dialog h3{font-size:18px;margin:0 0 8px;font-weight:700;color:#172033}
        .cs-confirm-dialog p{font-size:14px;line-height:1.55;color:#596579;margin:0 0 20px}
        .cs-confirm-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
        @media(max-width:640px){.cs-confirm-dialog{padding:20px}.cs-confirm-actions{flex-direction:column-reverse}.cs-confirm-actions .cs-button{width:100%;justify-content:center}}
        @media(max-width:640px){.cs-overlay{padding:0;align-items:stretch}.cs-modal{width:100%;max-height:100dvh;height:100dvh;border-radius:0}.cs-header{padding:16px 18px}.cs-header h2{font-size:17px}.cs-header p{font-size:12px}.cs-progress-wrap{padding:14px 18px}.cs-step-labels{gap:5px}.cs-step-label{font-size:10px;white-space:normal;line-height:1.25;gap:5px}.cs-step-number{width:20px;height:20px}.cs-body{padding:20px 18px}.cs-grid-two{grid-template-columns:1fr;gap:0}.cs-footer{padding:12px 18px;align-items:flex-start;flex-direction:column}.cs-footer-note{display:none}.cs-footer-actions{width:100%;justify-content:space-between}.cs-footer-actions .cs-button{flex:1}.cs-subsection{padding:14px}.cs-toggle-card{padding:12px}.cs-send-options{flex-direction:column;gap:12px}.cs-tabs{gap:0}.cs-tab{flex:1;justify-content:center;padding:9px 8px;font-size:11px}}
        @media(prefers-reduced-motion:reduce){.cs-modal *{transition:none!important;animation:none!important}}
      `}</style>
    </div>
  );
}