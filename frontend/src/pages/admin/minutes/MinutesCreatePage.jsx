import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, Calendar, Clock, MapPin, Users, ChevronDown, ChevronUp, ArrowLeft, Save, Eye, Loader } from 'lucide-react';
import { api } from '../../../api';

export default function MinutesCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingSheets, setFetchingSheets] = useState(true);
  const [openingSheet, setOpeningSheet] = useState(false);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ 0: true });
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    attendanceSheetId: '',
    agenda: [''],
    preliminaries: '',
    sections: [{ number: 'MIN 01/25', title: '', content: '', decisions: [''] }],
    aob: [{ title: '', content: '' }],
    adjournment: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    setFetchingSheets(true);
    try {
      const response = await api.get('/api/attendance/all-sheets', { headers });
      const availableSheets = response.data.sheets.filter(s => !s.hasMinutes);
      setSheets(availableSheets);
    } catch (error) {
      console.error('Error fetching sheets:', error);
    } finally {
      setFetchingSheets(false);
    }
  };

  const handleSheetSelect = async (sheet) => {
    setOpeningSheet(true);
    try {
      const response = await api.get(`/api/attendance/sheet/${sheet.id}`, { headers });
      setSheetData(response.data.sheet);
      setSelectedSheet(sheet);
      setFormData(prev => ({ ...prev, attendanceSheetId: sheet.id }));
      setStep(2);
    } catch (error) {
      console.error('Error fetching sheet:', error);
    } finally {
      setOpeningSheet(false);
    }
  };

  const addSection = () => {
    const newNumber = `MIN ${String(formData.sections.length + 1).padStart(2, '0')}/${new Date().getFullYear().toString().slice(-2)}`;
    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, { number: newNumber, title: '', content: '', decisions: [''] }]
    }));
    setExpandedSections(prev => ({ ...prev, [formData.sections.length]: true }));
  };

  const removeSection = (index) => {
    setFormData(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
  };

  const updateSection = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const addDecision = (sectionIndex) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === sectionIndex ? { ...s, decisions: [...s.decisions, ''] } : s)
    }));
  };

  const updateDecision = (sectionIndex, decisionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === sectionIndex ? {
        ...s,
        decisions: s.decisions.map((d, j) => j === decisionIndex ? value : d)
      } : s)
    }));
  };

  const addAgenda = () => {
    setFormData(prev => ({ ...prev, agenda: [...prev.agenda, ''] }));
  };

  const updateAgenda = (index, value) => {
    setFormData(prev => ({ ...prev, agenda: prev.agenda.map((a, i) => i === index ? value : a) }));
  };

  const addAOB = () => {
    setFormData(prev => ({ ...prev, aob: [...prev.aob, { title: '', content: '' }] }));
  };

  const updateAOB = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      aob: prev.aob.map((a, i) => i === index ? { ...a, [field]: value } : a)
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submitData = {
        attendanceSheetId: formData.attendanceSheetId,
        agenda: formData.agenda.filter(a => a.trim()),
        preliminaries: formData.preliminaries,
        sections: formData.sections.filter(s => s.title.trim()).map(s => ({
          number: s.number,
          title: s.title,
          content: s.content,
          decisions: s.decisions.filter(d => d.trim())
        })),
        aob: formData.aob.filter(a => a.title.trim() || a.content.trim()),
        adjournment: formData.adjournment
      };

      await api.post('/api/minutes', submitData, { headers });
      navigate('/admin/minutes');
    } catch (error) {
      console.error('Error creating minutes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Loading state for step 1
  if (step === 1 && fetchingSheets) {
    return (
      <div className="create-minutes-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/admin/minutes')}>
            <ArrowLeft size={18} /> Back to Minutes
          </button>
          <h1>Create Meeting Minutes</h1>
        </div>
        <div className="loading-container">
          <Loader size={48} className="spin" />
          <p>Loading attendance sheets...</p>
        </div>
        <style>{`
          .loading-container {
            text-align: center;
            padding: 80px;
            background: white;
            border-radius: 20px;
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="create-minutes-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/admin/minutes')}>
            <ArrowLeft size={18} /> Back to Minutes
          </button>
          <h1>Create Meeting Minutes</h1>
        </div>

        <div className="sheets-container">
          <h2>Select Attendance Sheet</h2>
          <p className="subtitle">Choose an attendance sheet to create minutes from</p>

          {sheets.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <p>No attendance sheets available</p>
              <small>Please create an attendance sheet first</small>
            </div>
          ) : (
            <div className="sheets-grid">
              {sheets.map(sheet => (
                <div key={sheet.id} className="sheet-card" onClick={() => handleSheetSelect(sheet)}>
                  <div className="sheet-header">
                    <h3>{sheet.title}</h3>
                    <span className="present-count">✅ {sheet.entries?.length || 0} present</span>
                  </div>
                  <div className="sheet-details">
                    <span><Calendar size={14} /> {new Date(sheet.eventDate).toLocaleDateString()}</span>
                    <span><Clock size={14} /> {sheet.eventTime || '4:30 PM'}</span>
                    <span><MapPin size={14} /> {sheet.location || 'ZUCA'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {openingSheet && (
          <div className="loading-overlay">
            <div className="loading-popup">
              <Loader size={40} className="spin" />
              <p>Loading attendance data...</p>
            </div>
          </div>
        )}

        <style>{`
          .create-minutes-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px;
            background: #f8fafc;
            min-height: 100vh;
          }
          .page-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 32px;
            flex-wrap: wrap;
          }
          .back-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #1e293b;
          }
          .page-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
          }
          .sheets-container h2 {
            font-size: 18px;
            margin-bottom: 8px;
          }
          .subtitle {
            color: #64748b;
            margin-bottom: 24px;
          }
          .sheets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
          }
          .sheet-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #e2e8f0;
          }
          .sheet-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            border-color: #1a1a1a;
          }
          .sheet-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 8px;
          }
          .sheet-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
          }
          .present-count {
            font-size: 12px;
            color: #22c55e;
            background: #dcfce7;
            padding: 4px 10px;
            border-radius: 20px;
          }
          .sheet-details {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            font-size: 13px;
            color: #64748b;
          }
          .sheet-details span {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .empty-state {
            text-align: center;
            padding: 60px;
            background: white;
            border-radius: 20px;
            border: 2px dashed #e2e8f0;
          }
          .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          .loading-popup {
            background: white;
            border-radius: 20px;
            padding: 30px 40px;
            text-align: center;
          }
          .loading-popup p {
            margin-top: 16px;
            color: #64748b;
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @media (max-width: 768px) {
            .create-minutes-page { padding: 16px; }
            .sheets-grid { grid-template-columns: 1fr; }
            .page-header { flex-direction: column; align-items: flex-start; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="create-minutes-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => setStep(1)}>
          <ArrowLeft size={18} /> Back to Sheets
        </button>
        <h1>Create Meeting Minutes</h1>
        <div className="header-actions">
          <button className="preview-btn" onClick={() => setPreviewMode(!previewMode)}>
            <Eye size={16} /> {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader size={16} className="spin" /> Saving...</> : <><Save size={16} /> Save Minutes</>}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-popup">
            <Loader size={40} className="spin" />
            <p>Creating minutes...</p>
          </div>
        </div>
      )}

      {previewMode ? (
        <div className="preview-container">
          <div className="preview-header">
            <h1>MINUTES OF MEETING HELD ON {new Date(sheetData?.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()} AT {sheetData?.location?.toUpperCase() || 'THE COMPLEX BUILDING'} AT {sheetData?.eventTime || '1850HRS'}</h1>
          </div>

          <div className="preview-section">
            <h2>Members present</h2>
            {sheetData?.entries?.map((member, idx) => (
              <div key={idx}>{idx + 1}. {member.fullName}{member.role ? ` (${member.role})` : ''}</div>
            ))}
          </div>

          {sheetData?.absentMembers?.filter(m => m.excused).length > 0 && (
            <div className="preview-section">
              <h2>Absent with Apology</h2>
              {sheetData.absentMembers.filter(m => m.excused).map((member, idx) => (
                <div key={idx}>{idx + 1}. {member.fullName}</div>
              ))}
            </div>
          )}

          {sheetData?.presentGuests?.length > 0 && (
            <div className="preview-section">
              <h2>In-Attendance</h2>
              {sheetData.presentGuests.map((guest, idx) => (
                <div key={idx}>{idx + 1}. {guest.fullName}</div>
              ))}
            </div>
          )}

          <div className="preview-section">
            <h2>Agenda</h2>
            {formData.agenda.filter(a => a.trim()).map((item, idx) => (
              <div key={idx}>{idx + 1}. {item}</div>
            ))}
          </div>

          {formData.preliminaries && (
            <div className="preview-section">
              <h2>MIN 01/{new Date().getFullYear().toString().slice(-2)}: PRELIMINARIES</h2>
              <p>{formData.preliminaries}</p>
            </div>
          )}

          {formData.sections.filter(s => s.title.trim()).map((section, idx) => (
            <div key={idx} className="preview-section">
              <h2>{section.number}: {section.title}</h2>
              <p>{section.content}</p>
              {section.decisions.filter(d => d.trim()).length > 0 && (
                <div className="preview-decisions">
                  <strong>Decisions:</strong>
                  <ul>
                    {section.decisions.filter(d => d.trim()).map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {formData.aob.filter(a => a.title.trim()).length > 0 && (
            <div className="preview-section">
              <h2>MIN {String(formData.sections.filter(s => s.title.trim()).length + 1).padStart(2, '0')}/{new Date().getFullYear().toString().slice(-2)}: AOB</h2>
              {formData.aob.filter(a => a.title.trim()).map((item, idx) => (
                <div key={idx}>
                  <strong>{item.title}</strong>
                  {item.content && <p>{item.content}</p>}
                </div>
              ))}
            </div>
          )}

          {formData.adjournment && (
            <div className="preview-section">
              <h2>MIN {String(formData.sections.filter(s => s.title.trim()).length + (formData.aob.filter(a => a.title.trim()).length > 0 ? 2 : 1)).padStart(2, '0')}/{new Date().getFullYear().toString().slice(-2)}: ADJOURNMENT</h2>
              <p>{formData.adjournment}</p>
            </div>
          )}

          <div className="preview-signatures">
            <div>Date _________________</div>
            <div>Chairperson _________________</div>
            <div>Secretary _________________</div>
          </div>
        </div>
      ) : (
        <>
          <div className="meeting-info-card">
            <h3>{sheetData?.title}</h3>
            <div className="info-meta">
              <span><Calendar size={14} /> {new Date(sheetData?.eventDate).toLocaleDateString()}</span>
              <span><Clock size={14} /> {sheetData?.eventTime || '4:30 PM'}</span>
              <span><MapPin size={14} /> {sheetData?.location || 'ZUCA'}</span>
            </div>
            <details className="attendance-summary">
              <summary>📋 Attendance ({sheetData?.entries?.length || 0} present, {sheetData?.absentMembers?.length || 0} absent)</summary>
              <div className="present-list"><strong>Present:</strong> {sheetData?.entries?.map(e => e.fullName).join(', ')}</div>
              <div className="absent-list"><strong>Absent:</strong> {sheetData?.absentMembers?.map(m => m.fullName).join(', ')}</div>
            </details>
          </div>

          <div className="form-section">
            <label>Agenda Items</label>
            {formData.agenda.map((item, idx) => (
              <div key={idx} className="array-item">
                <input type="text" value={item} onChange={(e) => updateAgenda(idx, e.target.value)} placeholder={`Item ${idx + 1}`} />
                {idx === formData.agenda.length - 1 && (
                  <button type="button" className="add-btn" onClick={addAgenda}><Plus size={16} /></button>
                )}
              </div>
            ))}
          </div>

          <div className="form-section">
            <label>Preliminaries (Opening prayer, who chaired)</label>
            <textarea value={formData.preliminaries} onChange={(e) => setFormData(prev => ({ ...prev, preliminaries: e.target.value }))} placeholder="The meeting was opened with a word of prayer from..." rows="3" />
          </div>

          <div className="form-section">
            <div className="section-header-label">
              <label>Minutes Sections</label>
              <button type="button" className="add-section-btn" onClick={addSection}><Plus size={16} /> Add Section</button>
            </div>
            
            {formData.sections.map((section, idx) => (
              <div key={idx} className="section-card">
                <div className="section-header" onClick={() => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                  <span>{section.number}</span>
                  <div className="section-actions">
                    <button type="button" className="remove-btn" onClick={(e) => { e.stopPropagation(); removeSection(idx); }}><Trash2 size={14} /></button>
                    <ChevronDown size={16} className={expandedSections[idx] ? 'rotate' : ''} />
                  </div>
                </div>
                {expandedSections[idx] && (
                  <div className="section-content">
                    <input type="text" placeholder="Section Title (e.g., REVIEW OF ACTIVITIES)" value={section.title} onChange={(e) => updateSection(idx, 'title', e.target.value)} />
                    <textarea placeholder="Discussion content..." value={section.content} onChange={(e) => updateSection(idx, 'content', e.target.value)} rows="4" />
                    <div className="sub-section">
                      <label>Decisions Made</label>
                      {section.decisions.map((decision, dIdx) => (
                        <div key={dIdx} className="array-item">
                          <input type="text" value={decision} onChange={(e) => updateDecision(idx, dIdx, e.target.value)} placeholder={`Decision ${dIdx + 1}`} />
                          {dIdx === section.decisions.length - 1 && (
                            <button type="button" className="add-btn" onClick={() => addDecision(idx)}><Plus size={14} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="form-section">
            <div className="section-header-label">
              <label>Any Other Business (AOB)</label>
              <button type="button" className="add-section-btn" onClick={addAOB}><Plus size={16} /> Add AOB</button>
            </div>
            {formData.aob.map((item, idx) => (
              <div key={idx} className="aob-card">
                <input type="text" placeholder="Topic" value={item.title} onChange={(e) => updateAOB(idx, 'title', e.target.value)} />
                <textarea placeholder="Details" value={item.content} onChange={(e) => updateAOB(idx, 'content', e.target.value)} rows="2" />
                {formData.aob.length > 1 && (
                  <button type="button" className="remove-aob" onClick={() => setFormData(prev => ({ ...prev, aob: prev.aob.filter((_, i) => i !== idx) }))}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-section">
            <label>Adjournment</label>
            <textarea value={formData.adjournment} onChange={(e) => setFormData(prev => ({ ...prev, adjournment: e.target.value }))} placeholder="The meeting was closed by... with a prayer from..." rows="2" />
          </div>

          <div className="form-actions">
            <button className="cancel-btn" onClick={() => navigate('/admin/minutes')}>Cancel</button>
            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Minutes'}
            </button>
          </div>
        </>
      )}

      <style>{`
        .create-minutes-page {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }
        .page-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .preview-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          background: #f1f5f9;
          color: #1e293b;
        }
        .submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          background: #1a1a1a;
          color: white;
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .meeting-info-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }
        .meeting-info-card h3 {
          margin: 0 0 12px;
          font-size: 18px;
        }
        .info-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #64748b;
        }
        .info-meta span {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .attendance-summary {
          cursor: pointer;
        }
        .attendance-summary summary {
          font-weight: 500;
          margin-bottom: 8px;
        }
        .present-list, .absent-list {
          font-size: 13px;
          margin: 4px 0;
        }
        .form-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        .form-section label {
          display: block;
          font-weight: 600;
          margin-bottom: 12px;
          font-size: 14px;
          color: #0f172a;
        }
        .form-section input, .form-section textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
        }
        .form-section input:focus, .form-section textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }
        .array-item {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        .array-item input {
          flex: 1;
        }
        .add-btn {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          padding: 0 16px;
          display: flex;
          align-items: center;
        }
        .section-header-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .add-section-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .section-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #f8fafc;
          cursor: pointer;
          font-weight: 500;
        }
        .section-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .remove-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #ef4444;
        }
        .rotate {
          transform: rotate(180deg);
        }
        .section-content {
          padding: 16px;
          border-top: 1px solid #e2e8f0;
        }
        .sub-section {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px dashed #e2e8f0;
        }
        .aob-card {
          position: relative;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .aob-card input, .aob-card textarea {
          margin-bottom: 10px;
        }
        .remove-aob {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #ef4444;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 24px;
        }
        .cancel-btn {
          padding: 12px 24px;
          background: #f1f5f9;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .loading-popup {
          background: white;
          border-radius: 20px;
          padding: 30px 40px;
          text-align: center;
        }
        .loading-popup p {
          margin-top: 16px;
          color: #64748b;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        .preview-container {
          background: white;
          border-radius: 16px;
          padding: 30px;
          border: 1px solid #e2e8f0;
        }
        .preview-header h1 {
          text-align: center;
          font-size: 14px;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #1a1a1a;
        }
        .preview-section {
          margin-bottom: 24px;
        }
        .preview-section h2 {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
          text-decoration: underline;
        }
        .preview-section p {
          font-size: 13px;
          line-height: 1.5;
        }
        .preview-decisions {
          margin-top: 10px;
          padding-left: 20px;
        }
        .preview-decisions ul {
          margin: 5px 0;
          padding-left: 20px;
        }
        .preview-signatures {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .create-minutes-page { padding: 16px; }
          .page-header { flex-direction: column; align-items: stretch; }
          .header-actions { justify-content: flex-end; }
          .form-actions { flex-direction: column; }
          .cancel-btn, .submit-btn { width: 100%; justify-content: center; }
          .preview-signatures { flex-direction: column; gap: 16px; }
        }
      `}</style>
    </div>
  );
}