import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../api';

export default function TreasurerNotes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'editor'
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/treasurer/notes`, { headers });
      setNotes(res.data.notes || []);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      if (selectedNote) {
        await axios.put(`${BASE_URL}/api/treasurer/notes/${selectedNote.id}`, 
          { title, content },
          { headers }
        );
      } else {
        await axios.post(`${BASE_URL}/api/treasurer/notes`, 
          { title, content },
          { headers }
        );
      }
      await fetchNotes();
      goBackToList();
      alert('Note saved successfully!');
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id) => {
    if (!confirm('Delete this note?')) return;
    
    try {
      await axios.delete(`${BASE_URL}/api/treasurer/notes/${id}`, { headers });
      await fetchNotes();
      if (selectedNote?.id === id) goBackToList();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Failed to delete');
    }
  };

  const openEditor = (note = null) => {
    if (note) {
      setSelectedNote(note);
      setTitle(note.title);
      setContent(note.content || '');
    } else {
      setSelectedNote(null);
      setTitle('');
      setContent('');
    }
    setView('editor');
  };

  const goBackToList = () => {
    setView('list');
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setShowCalculator(false);
  };

  // Calculator functions
  const handleNumber = (num) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const handleOperation = (op) => {
    if (prevValue !== null && !waitingForOperand) {
      calculate();
    }
    setPrevValue(parseFloat(display));
    setOperation(op);
    setWaitingForOperand(true);
  };

  const calculate = () => {
    if (prevValue === null || operation === null) return;
    
    const current = parseFloat(display);
    let result = 0;
    
    switch (operation) {
      case '+': result = prevValue + current; break;
      case '-': result = prevValue - current; break;
      case '*': result = prevValue * current; break;
      case '/': result = prevValue / current; break;
      default: return;
    }
    
    setDisplay(String(result));
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const insertCalculation = () => {
    setContent(prev => prev + `\n[📊 Calculation Result: ${display}]\n`);
  };

  // List View
  if (view === 'list') {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', marginTop: '60px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '28px', margin: 0, color: '#1e293b' }}>💰 Treasurer Notes</h1>
              <p style={{ color: '#64748b', marginTop: '8px' }}>Manage your financial notes and calculations</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => navigate(-1)}
                style={{ padding: '10px 20px', background: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button 
                onClick={() => openEditor()}
                style={{ padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                + New Note
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{notes.length}</div>
              <div style={{ color: '#64748b' }}>Total Notes</div>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                {notes.filter(n => new Date(n.createdAt).toDateString() === new Date().toDateString()).length}
              </div>
              <div style={{ color: '#64748b' }}>Created Today</div>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
                {notes.filter(n => n.content?.length > 0).length}
              </div>
              <div style={{ color: '#64748b' }}>With Notes</div>
            </div>
          </div>

          {/* Notes List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px' }}>Loading notes...</div>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <h3>No notes yet</h3>
              <p style={{ color: '#64748b' }}>Click "New Note" to create your first financial note</p>
              <button 
                onClick={() => openEditor()}
                style={{ marginTop: '16px', padding: '10px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Create First Note
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notes.map(note => (
                <div key={note.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', transition: 'all 0.2s', cursor: 'pointer', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div onClick={() => openEditor(note)} style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{note.title}</h3>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p style={{ color: '#475569', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                        {note.content ? (note.content.length > 150 ? note.content.substring(0, 150) + '...' : note.content) : 'No content'}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Editor View - Full Page
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', marginTop: '60px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button 
            onClick={goBackToList}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
          >
            ← Back to Notes
          </button>
          <button 
            onClick={() => setShowCalculator(!showCalculator)}
            style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🧮 {showCalculator ? 'Hide Calculator' : 'Show Calculator'}
          </button>
        </div>

        {/* Calculator (collapsible) */}
        {showCalculator && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '16px' }}>🧮 Calculator</h3>
            <div style={{ fontSize: '36px', textAlign: 'right', padding: '20px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '20px', fontFamily: 'monospace', fontWeight: 'bold' }}>
              {display}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <button onClick={() => handleNumber(7)} style={btnStyle}>7</button>
              <button onClick={() => handleNumber(8)} style={btnStyle}>8</button>
              <button onClick={() => handleNumber(9)} style={btnStyle}>9</button>
              <button onClick={() => handleOperation('+')} style={{...btnStyle, background: '#e2e8f0'}}>+</button>
              
              <button onClick={() => handleNumber(4)} style={btnStyle}>4</button>
              <button onClick={() => handleNumber(5)} style={btnStyle}>5</button>
              <button onClick={() => handleNumber(6)} style={btnStyle}>6</button>
              <button onClick={() => handleOperation('-')} style={{...btnStyle, background: '#e2e8f0'}}>-</button>
              
              <button onClick={() => handleNumber(1)} style={btnStyle}>1</button>
              <button onClick={() => handleNumber(2)} style={btnStyle}>2</button>
              <button onClick={() => handleNumber(3)} style={btnStyle}>3</button>
              <button onClick={() => handleOperation('*')} style={{...btnStyle, background: '#e2e8f0'}}>*</button>
              
              <button onClick={() => handleNumber(0)} style={btnStyle}>0</button>
              <button onClick={handleDecimal} style={btnStyle}>.</button>
              <button onClick={calculate} style={{...btnStyle, background: '#10b981', color: 'white'}}>=</button>
              <button onClick={() => handleOperation('/')} style={{...btnStyle, background: '#e2e8f0'}}>/</button>
              
              <button onClick={handleClear} style={{ gridColumn: 'span 4', ...btnStyle, background: '#ef4444', color: 'white' }}>Clear All</button>
            </div>
            <button 
              onClick={insertCalculation}
              style={{ marginTop: '16px', width: '100%', padding: '12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
            >
              📋 Insert Calculation Result ({display}) into Note
            </button>
          </div>
        )}

        {/* Note Editor */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '24px' }}>{selectedNote ? '✏️ Edit Note' : '📝 Create New Note'}</h2>
          
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '14px', fontSize: '18px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', '&:focus': { borderColor: '#10b981' } }}
          />
          
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="12"
            style={{ width: '100%', padding: '14px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '24px', fontFamily: 'monospace', resize: 'vertical', outline: 'none' }}
            placeholder="Write your notes here...
            
Examples:
• Total collected this month: KES 45,000
• Pending approvals: KES 12,500
• Building Fund: 350,000 / 500,000 = 70%
• Choir Fund: 180,000 / 200,000 = 90%"
          />
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={saveNote} 
              disabled={saving}
              style={{ flex: 1, padding: '14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
            >
              {saving ? 'Saving...' : '💾 Save Note'}
            </button>
            {selectedNote && (
              <button 
                onClick={() => deleteNote(selectedNote.id)}
                style={{ padding: '14px 24px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                🗑 Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '14px',
  fontSize: '16px',
  border: '1px solid #e2e8f0',
  background: 'white',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};