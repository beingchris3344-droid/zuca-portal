import React, { useState } from 'react';
import { X, Check, Loader } from 'lucide-react';

export default function CategoryPickerModal({
  categoryName,
  options,
  required = true,
  onSelect,
  onClose,
  submitting = false
}) {
  const [selected, setSelected] = useState(null);

  const handleConfirm = () => {
    if (required && !selected) return;
    onSelect(selected); // null if optional and skipped
  };

  const canConfirm = required ? !!selected : true;

  return (
    <div
      className="cat-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cat-header">
          <div>
            <div className="cat-eyebrow">CHECK-IN</div>
            <h3 className="cat-title">Pick your {categoryName}</h3>
            <p className="cat-subtitle">
              {required
                ? `Required to complete your check-in`
                : `Optional — you can skip if you're unsure`}
            </p>
          </div>
          <button className="cat-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Options */}
        <div className="cat-options">
          {options.map((opt) => {
            const isActive = selected === opt;
            return (
              <button
                key={opt}
                type="button"
                className={`cat-option ${isActive ? 'active' : ''}`}
                onClick={() => setSelected(opt)}
                disabled={submitting}
              >
                <span className="cat-option-label">{opt}</span>
                {isActive && <Check size={18} className="cat-option-check" />}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="cat-footer">
          {!required && (
            <button
              type="button"
              className="cat-btn cat-btn-skip"
              onClick={() => onSelect(null)}
              disabled={submitting}
            >
              Skip for now
            </button>
          )}
          <button
            type="button"
            className="cat-btn cat-btn-confirm"
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
          >
            {submitting ? (
              <>
                <Loader size={16} className="cat-spin" />
                Checking in...
              </>
            ) : (
              <>
                <Check size={16} />
                Confirm check-in
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .cat-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 2000;
          animation: catFade 0.2s ease;
        }

        @keyframes catFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cat-modal {
          background: white;
          border-radius: 24px;
          width: 100%;
          max-width: 440px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
          animation: catSlide 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }

        @keyframes catSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .cat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }

        .cat-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #7c3aed;
          margin-bottom: 6px;
        }

        .cat-title {
          margin: 0 0 6px 0;
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.3px;
        }

        .cat-subtitle {
          margin: 0;
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
        }

        .cat-close {
          flex-shrink: 0;
          background: #f1f5f9;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .cat-close:hover:not(:disabled) {
          background: #e2e8f0;
          color: #0f172a;
        }

        .cat-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .cat-option {
          position: relative;
          padding: 18px 14px;
          border-radius: 14px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 58px;
        }

        .cat-option:hover:not(:disabled) {
          border-color: #c7d2fe;
          background: #eef2ff;
          transform: translateY(-1px);
        }

        .cat-option.active {
          border-color: #6366f1;
          background: linear-gradient(135deg, #eef2ff, #f3f0ff);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.2);
        }

        .cat-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cat-option-label {
          text-align: center;
          word-break: break-word;
        }

        .cat-option-check {
          color: #6366f1;
          flex-shrink: 0;
        }

        .cat-footer {
          display: flex;
          gap: 10px;
          padding-top: 4px;
        }

        .cat-btn {
          flex: 1;
          padding: 14px 18px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          border: none;
        }

        .cat-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cat-btn-skip {
          background: #f1f5f9;
          color: #334155;
        }

        .cat-btn-skip:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .cat-btn-confirm {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
        }

        .cat-btn-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
        }

        .cat-spin {
          animation: catSpin 0.9s linear infinite;
        }

        @keyframes catSpin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .cat-modal { padding: 20px; }
          .cat-options { gap: 8px; }
          .cat-option { padding: 16px 10px; font-size: 14px; min-height: 54px; }
          .cat-title { font-size: 19px; }
        }
      `}</style>
    </div>
  );
}