// frontend/src/pages/admin/AdminPrayers.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  Plus, Edit2, Trash2, Search, X, Save,
  ChevronLeft, ChevronRight, RefreshCw,
  Filter, BookOpen, CheckCircle, AlertCircle,
  ChevronDown, MoreVertical,
} from 'lucide-react';

export default function AdminPrayers() {
  const [prayers, setPrayers] = useState([]);
  const [filteredPrayers, setFilteredPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [openRowMenu, setOpenRowMenu] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'daily',
    prayer: '',
    language: 'en',
    version: 'traditional',
    order: 0,
    isActive: true,
  });

  const categories = [
    { id: 'daily', name: 'Daily Prayers' },
    { id: 'marian', name: 'Marian Prayers' },
    { id: 'saints', name: 'Saints' },
    { id: 'rosary', name: 'Rosary' },
    { id: 'other', name: 'Other' },
    { id: 'novena', name: 'Novena' },
    { id: 'liturgical', name: 'Liturgical' },
    { id: 'angelic', name: 'Angelic' },
    { id: 'creed', name: 'Creed' },
  ];

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchPrayers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/prayers/admin/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrayers(response.data.prayers || []);
      setFilteredPrayers(response.data.prayers || []);
    } catch (error) {
      console.error('Error fetching prayers:', error);
      if (error.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
      } else {
        showToast('Failed to load prayers', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayers();
  }, []);

  useEffect(() => {
    let filtered = [...prayers];
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.prayer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    setFilteredPrayers(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, prayers]);

  // Close row menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.row-menu-wrap')) setOpenRowMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalPages = Math.ceil(filteredPrayers.length / itemsPerPage);
  const paginatedPrayers = filteredPrayers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'daily',
      prayer: '',
      language: 'en',
      version: 'traditional',
      order: 0,
      isActive: true,
    });
    setEditingPrayer(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (prayer) => {
    setEditingPrayer(prayer);
    setFormData({
      title: prayer.title || '',
      category: prayer.category || 'daily',
      prayer: prayer.prayer || '',
      language: prayer.language || 'en',
      version: prayer.version || 'traditional',
      order: prayer.order || 0,
      isActive: prayer.isActive !== false,
    });
    setShowModal(true);
    setOpenRowMenu(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    if (!formData.prayer.trim()) {
      showToast('Prayer content is required', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (editingPrayer) {
        await api.put(`/api/prayers/admin/${editingPrayer.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast('Prayer updated successfully');
      } else {
        await api.post('/api/prayers/admin', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast('Prayer created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchPrayers();
    } catch (error) {
      console.error('Error saving prayer:', error);
      if (error.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
      } else {
        showToast(error.response?.data?.error || 'Failed to save prayer', 'error');
      }
    }
  };

  const handleDelete = async (prayer) => {
    setOpenRowMenu(null);
    if (!window.confirm(`Delete "${prayer.title}"? This action cannot be undone.`)) return;

    try {
      const token = localStorage.getItem('token');
      await api.delete(`/api/prayers/admin/${prayer.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Prayer deleted successfully');
      fetchPrayers();
    } catch (error) {
      console.error('Error deleting prayer:', error);
      if (error.response?.status === 401) {
        showToast('Session expired. Please login again.', 'error');
      } else {
        showToast('Failed to delete prayer', 'error');
      }
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : categoryId;
  };

  const cleanPreview = (text) => {
    if (!text) return '';
    let cleaned = text.replace(/<[^>]*>/g, '');
    cleaned = cleaned.substring(0, 110);
    return cleaned + (cleaned.length >= 110 ? '...' : '');
  };

  const activeCount = prayers.filter((p) => p.isActive !== false).length;

  /* ============================================================
     SKELETON LOADER
     ============================================================ */
  if (loading) {
    return (
      <div className="ap-page">
        <div className="ap-container">
          <div className="ap-skeleton-header">
            <div>
              <div className="ap-skeleton ap-skeleton-title" />
              <div className="ap-skeleton ap-skeleton-subtitle" />
            </div>
            <div className="ap-skeleton ap-skeleton-btn" />
          </div>

          <div className="ap-skeleton-stats">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="ap-skeleton-stat">
                <div className="ap-skeleton ap-skeleton-stat-value" />
                <div className="ap-skeleton ap-skeleton-stat-label" />
              </div>
            ))}
          </div>

          <div className="ap-skeleton-toolbar">
            <div className="ap-skeleton ap-skeleton-input" />
            <div className="ap-skeleton ap-skeleton-input" style={{ maxWidth: 220 }} />
          </div>

          <div className="ap-skeleton-table">
            <div className="ap-skeleton-thead">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="ap-skeleton ap-skeleton-th" />
              ))}
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="ap-skeleton-tr">
                <div className="ap-skeleton ap-skeleton-td-sm" />
                <div className="ap-skeleton ap-skeleton-td-lg" />
                <div className="ap-skeleton ap-skeleton-td-md" />
                <div className="ap-skeleton ap-skeleton-td-xl" />
                <div className="ap-skeleton ap-skeleton-td-sm" />
                <div className="ap-skeleton ap-skeleton-td-sm" />
              </div>
            ))}
          </div>
        </div>
        <style>{skeletonCSS}</style>
      </div>
    );
  }

  /* ============================================================
     MAIN RENDER
     ============================================================ */
  return (
    <div className="ap-page">
      <div className="ap-container">
        {/* Toast */}
        {toast.show && (
          <div className={`ap-toast ap-toast-${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <header className="ap-header">
          <div>
            <div className="ap-eyebrow">
              <BookOpen size={12} />
              Content library
            </div>
            <h1 className="ap-title">Prayers</h1>
            <p className="ap-subtitle">
              Manage the prayer book available to all members
            </p>
          </div>
          <div className="ap-header-actions">
            <button className="ap-btn" onClick={fetchPrayers}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="ap-btn ap-btn-primary" onClick={openCreateModal}>
              <Plus size={14} /> New Prayer
            </button>
          </div>
        </header>

        {/* Stats row */}
        <div className="ap-stats">
          <div className="ap-stat">
            <div className="ap-stat-value">{prayers.length}</div>
            <div className="ap-stat-label">Total prayers</div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-value">{activeCount}</div>
            <div className="ap-stat-label">Active</div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-value">{prayers.length - activeCount}</div>
            <div className="ap-stat-label">Inactive</div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-value">{categories.length}</div>
            <div className="ap-stat-label">Categories</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="ap-toolbar">
          <div className="ap-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by title or content"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="ap-search-clear" onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="ap-filter">
            <Filter size={14} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="ap-filter-chevron" />
          </div>
        </div>

        {/* Table */}
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Title</th>
                <th style={{ width: 160 }}>Category</th>
                <th>Preview</th>
                <th style={{ width: 80 }}>Lang</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginatedPrayers.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="ap-empty">
                      <BookOpen size={28} />
                      <div className="ap-empty-title">
                        {searchTerm || selectedCategory !== 'all'
                          ? 'No prayers match your filters'
                          : 'No prayers yet'}
                      </div>
                      <div className="ap-empty-sub">
                        {searchTerm || selectedCategory !== 'all'
                          ? 'Try adjusting your search or category'
                          : 'Create your first prayer to get started'}
                      </div>
                      {!searchTerm && selectedCategory === 'all' && (
                        <button className="ap-btn ap-btn-primary" onClick={openCreateModal}>
                          <Plus size={14} /> New Prayer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPrayers.map((prayer, index) => (
                  <tr key={prayer.id}>
                    <td className="ap-cell-num">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td>
                      <div className="ap-cell-title">{prayer.title}</div>
                    </td>
                    <td>
                      <span className="ap-cat-badge">
                        {getCategoryName(prayer.category)}
                      </span>
                    </td>
                    <td className="ap-cell-preview">{cleanPreview(prayer.prayer)}</td>
                    <td>
                      <span className="ap-lang-badge">
                        {prayer.language?.toUpperCase() || 'EN'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ap-status-badge ${
                          prayer.isActive !== false ? 'active' : 'inactive'
                        }`}
                      >
                        <span className="ap-status-dot" />
                        {prayer.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="row-menu-wrap">
                        <button
                          className="ap-row-menu-btn"
                          onClick={() =>
                            setOpenRowMenu(openRowMenu === prayer.id ? null : prayer.id)
                          }
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openRowMenu === prayer.id && (
                          <div className="ap-row-menu">
                            <button onClick={() => openEditModal(prayer)}>
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              className="ap-row-menu-danger"
                              onClick={() => handleDelete(prayer)}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="ap-pagination">
            <button
              className="ap-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <div className="ap-page-info">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </div>
            <button
              className="ap-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="ap-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <div>
                <h2>{editingPrayer ? 'Edit prayer' : 'New prayer'}</h2>
                <p className="ap-modal-sub">
                  {editingPrayer
                    ? 'Update the prayer content and settings'
                    : 'Add a new prayer to the library'}
                </p>
              </div>
              <button className="ap-modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="ap-modal-body">
              <div className="ap-field">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Hail Mary"
                />
              </div>

              <div className="ap-field-row">
                <div className="ap-field">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ap-field">
                  <label>Language</label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                  >
                    <option value="en">English</option>
                    <option value="sw">Kiswahili</option>
                    <option value="la">Latin</option>
                  </select>
                </div>
              </div>

              <div className="ap-field">
                <label>Prayer content *</label>
                <textarea
                  name="prayer"
                  value={formData.prayer}
                  onChange={handleInputChange}
                  placeholder="Enter the full prayer text"
                  rows={10}
                />
                <div className="ap-field-hint">
                  {formData.prayer.length} characters
                </div>
              </div>

              <div className="ap-field-row">
                <div className="ap-field">
                  <label>Display order</label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
                <div className="ap-field ap-field-checkbox">
                  <label className="ap-checkbox">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    <span>Active (visible to members)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="ap-modal-footer">
              <button className="ap-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="ap-btn ap-btn-primary" onClick={handleSave}>
                <Save size={14} />
                {editingPrayer ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{mainCSS}</style>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const baseCSS = `
  .ap-page {
    background: #fafafa;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #171717;
    -webkit-font-smoothing: antialiased;
  }
  .ap-container {
    padding: 28px 24px 60px;
    max-width: 1360px;
    margin: 0 auto;
  }

  /* ---------- HEADER ---------- */
  .ap-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    flex-wrap: wrap;
    padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px;
  }
  .ap-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #737373;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }
  .ap-title {
    font-size: 26px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.5px;
    color: #0f0f0f;
  }
  .ap-subtitle {
    font-size: 13.5px;
    color: #737373;
    margin: 4px 0 0 0;
  }
  .ap-header-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* ---------- BUTTONS ---------- */
  .ap-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 13px;
    border-radius: 8px;
    border: 1px solid #e5e5e5;
    background: #ffffff;
    color: #262626;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    transition: background 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
    font-family: inherit;
  }
  .ap-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
  .ap-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .ap-btn-primary {
    background: #0f0f0f;
    color: #ffffff;
    border-color: #0f0f0f;
  }
  .ap-btn-primary:hover {
    background: #262626;
    border-color: #262626;
  }

  /* ---------- STATS ---------- */
  .ap-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 22px;
  }
  @media (min-width: 600px) {
    .ap-stats { grid-template-columns: repeat(4, 1fr); }
  }
  .ap-stat {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 16px 18px;
  }
  .ap-stat-value {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.6px;
    color: #0f0f0f;
    line-height: 1.1;
  }
  .ap-stat-label {
    font-size: 11px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    margin-top: 4px;
  }

  /* ---------- TOOLBAR ---------- */
  .ap-toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .ap-search {
    flex: 1;
    min-width: 220px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 0 12px;
    height: 40px;
    color: #737373;
    transition: border-color 0.15s ease;
  }
  .ap-search:focus-within { border-color: #a3a3a3; }
  .ap-search input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #171717;
    font-family: inherit;
    height: 100%;
  }
  .ap-search input::placeholder { color: #a3a3a3; }
  .ap-search-clear {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #a3a3a3;
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 6px;
  }
  .ap-search-clear:hover { background: #f5f5f5; color: #525252; }

  .ap-filter {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 0 12px;
    height: 40px;
    min-width: 180px;
    color: #737373;
  }
  .ap-filter select {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #171717;
    cursor: pointer;
    appearance: none;
    font-family: inherit;
    padding-right: 18px;
  }
  .ap-filter-chevron {
    position: absolute;
    right: 12px;
    pointer-events: none;
    color: #a3a3a3;
  }

  /* ---------- TABLE ---------- */
  .ap-table-wrap {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    overflow: hidden;
    overflow-x: auto;
  }
  .ap-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    min-width: 720px;
  }
  .ap-table thead th {
    background: #fafafa;
    text-align: left;
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #737373;
    border-bottom: 1px solid #e5e5e5;
  }
  .ap-table tbody td {
    padding: 14px 16px;
    border-bottom: 1px solid #f5f5f5;
    vertical-align: middle;
    color: #262626;
  }
  .ap-table tbody tr:last-child td { border-bottom: none; }
  .ap-table tbody tr { transition: background 0.12s ease; }
  .ap-table tbody tr:hover { background: #fafafa; }

  .ap-cell-num { color: #a3a3a3; font-size: 12px; }
  .ap-cell-title {
    font-weight: 600;
    color: #0f0f0f;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 260px;
  }
  .ap-cell-preview {
    color: #737373;
    font-size: 12.5px;
    max-width: 340px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ap-cat-badge {
    display: inline-block;
    padding: 3px 10px;
    background: #f5f5f5;
    border-radius: 999px;
    font-size: 11.5px;
    color: #525252;
    font-weight: 600;
    white-space: nowrap;
  }
  .ap-lang-badge {
    display: inline-block;
    padding: 3px 9px;
    background: #f5f5f5;
    color: #525252;
    border-radius: 6px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.05em;
    font-family: 'SF Mono', Menlo, Consolas, monospace;
  }
  .ap-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }
  .ap-status-badge.active {
    background: #f0fdf4;
    color: #15803d;
  }
  .ap-status-badge.inactive {
    background: #f5f5f5;
    color: #737373;
  }
  .ap-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .ap-status-badge.active .ap-status-dot { background: #16a34a; }
  .ap-status-badge.inactive .ap-status-dot { background: #a3a3a3; }

  /* ---------- ROW MENU ---------- */
  .row-menu-wrap { position: relative; display: flex; justify-content: flex-end; }
  .ap-row-menu-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #737373;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }
  .ap-row-menu-btn:hover { background: #f5f5f5; color: #171717; }
  .ap-row-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.12);
    padding: 4px;
    min-width: 140px;
    z-index: 20;
    animation: ap-menu-in 0.12s ease;
  }
  @keyframes ap-menu-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .ap-row-menu button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    background: transparent;
    border: none;
    text-align: left;
    font-size: 12.5px;
    font-weight: 500;
    color: #262626;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.12s ease;
  }
  .ap-row-menu button:hover { background: #f5f5f5; }
  .ap-row-menu-danger { color: #b91c1c !important; }
  .ap-row-menu-danger:hover { background: #fef2f2 !important; }

  /* ---------- EMPTY ---------- */
  .ap-empty {
    padding: 56px 20px;
    text-align: center;
    color: #a3a3a3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .ap-empty svg { color: #d4d4d4; }
  .ap-empty-title {
    font-size: 15px;
    font-weight: 700;
    color: #262626;
    margin-top: 4px;
  }
  .ap-empty-sub {
    font-size: 12.5px;
    color: #a3a3a3;
    margin-bottom: 8px;
  }

  /* ---------- PAGINATION ---------- */
  .ap-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  .ap-page-info {
    font-size: 12.5px;
    color: #737373;
  }
  .ap-page-info strong { color: #171717; font-weight: 700; }

  /* ---------- TOAST ---------- */
  .ap-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    z-index: 1200;
    box-shadow: 0 10px 25px -5px rgba(15, 15, 15, 0.2);
    animation: ap-toast-in 0.25s ease;
  }
  .ap-toast-success { background: #0f0f0f; color: #ffffff; }
  .ap-toast-error { background: #dc2626; color: #ffffff; }
  @keyframes ap-toast-in {
    from { opacity: 0; transform: translateX(-50%) translateY(12px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* ---------- MODAL ---------- */
  .ap-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 15, 15, 0.5);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
  }
  .ap-modal {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 720px;
    max-height: 92vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.2);
    animation: ap-modal-in 0.2s ease;
  }
  @keyframes ap-modal-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ap-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 22px 24px;
    border-bottom: 1px solid #f0f0f0;
  }
  .ap-modal-header h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f0f0f;
    letter-spacing: -0.2px;
  }
  .ap-modal-sub {
    font-size: 12.5px;
    color: #a3a3a3;
    margin: 3px 0 0 0;
  }
  .ap-modal-close {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #a3a3a3;
    padding: 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: all 0.15s ease;
  }
  .ap-modal-close:hover { background: #f5f5f5; color: #171717; }

  .ap-modal-body { padding: 22px 24px; }

  .ap-field { margin-bottom: 18px; }
  .ap-field:last-child { margin-bottom: 0; }
  .ap-field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #525252;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .ap-field input[type="text"],
  .ap-field input[type="number"],
  .ap-field select,
  .ap-field textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    font-size: 13.5px;
    color: #171717;
    font-family: inherit;
    background: #ffffff;
    transition: border-color 0.15s ease;
  }
  .ap-field input[type="text"]:focus,
  .ap-field input[type="number"]:focus,
  .ap-field select:focus,
  .ap-field textarea:focus {
    outline: none;
    border-color: #0f0f0f;
  }
  .ap-field textarea {
    resize: vertical;
    min-height: 180px;
    line-height: 1.6;
  }
  .ap-field-hint {
    font-size: 11px;
    color: #a3a3a3;
    margin-top: 6px;
    text-align: right;
  }
  .ap-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 600px) {
    .ap-field-row { grid-template-columns: 1fr; gap: 0; }
  }
  .ap-field-checkbox {
    display: flex;
    align-items: flex-end;
    padding-bottom: 10px;
  }
  .ap-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #262626;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 500;
    margin: 0;
  }
  .ap-checkbox input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #0f0f0f;
    cursor: pointer;
  }

  .ap-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
    border-radius: 0 0 16px 16px;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 640px) {
    .ap-container { padding: 20px 16px 40px; }
    .ap-title { font-size: 22px; }
    .ap-header-actions { width: 100%; }
    .ap-header-actions .ap-btn { flex: 1; justify-content: center; }
    .ap-cell-title { max-width: 160px; }
    .ap-cell-preview { max-width: 180px; }
  }
`;

const skeletonCSS = `
  ${baseCSS}
  .ap-skeleton {
    background: #ececec;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }
  .ap-skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
    animation: ap-shimmer 1.5s ease-in-out infinite;
  }
  @keyframes ap-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .ap-skeleton-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    padding-bottom: 22px;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .ap-skeleton-title { width: 160px; height: 26px; }
  .ap-skeleton-subtitle { width: 280px; height: 14px; margin-top: 8px; }
  .ap-skeleton-btn { width: 130px; height: 38px; border-radius: 8px; }
  .ap-skeleton-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 22px;
  }
  @media (min-width: 600px) {
    .ap-skeleton-stats { grid-template-columns: repeat(4, 1fr); }
  }
  .ap-skeleton-stat {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 16px 18px;
  }
  .ap-skeleton-stat-value { width: 60px; height: 26px; }
  .ap-skeleton-stat-label { width: 90px; height: 11px; margin-top: 8px; }
  .ap-skeleton-toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .ap-skeleton-input {
    flex: 1;
    min-width: 220px;
    height: 40px;
    border-radius: 10px;
  }
  .ap-skeleton-table {
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 14px;
    overflow: hidden;
  }
  .ap-skeleton-thead {
    display: grid;
    grid-template-columns: 48px 2fr 1.2fr 3fr 60px 110px;
    gap: 16px;
    padding: 14px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e5e5e5;
  }
  .ap-skeleton-th { height: 12px; width: 100%; }
  .ap-skeleton-tr {
    display: grid;
    grid-template-columns: 48px 2fr 1.2fr 3fr 60px 110px;
    gap: 16px;
    padding: 18px 16px;
    border-bottom: 1px solid #f5f5f5;
  }
  .ap-skeleton-tr:last-child { border-bottom: none; }
  .ap-skeleton-td-sm { height: 12px; width: 100%; }
  .ap-skeleton-td-md { height: 20px; width: 100%; border-radius: 999px; }
  .ap-skeleton-td-lg { height: 14px; width: 100%; }
  .ap-skeleton-td-xl { height: 12px; width: 100%; }
`;

const mainCSS = baseCSS;

