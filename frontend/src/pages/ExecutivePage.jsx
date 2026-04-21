import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Crown, Mic, Church, Camera, Music, Users,
  ChevronDown, ChevronUp, Phone, Mail, 
  Calendar, Clock, User, Shield, Star, Award,
  Sparkles, Heart, MessageCircle, Share2, 
  Linkedin, Smartphone, Send
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';

// WhatsApp icon component (since lucide-react doesn't have it)
const WhatsAppIcon = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 1.9z" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
    <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
    <path d="M12 15a4 4 0 0 0-4-4" />
  </svg>
);

export default function ExecutivePage() {
  const [executives, setExecutives] = useState([]);
  const [grouped, setGrouped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    leadership: true,
    choir: true,
    jumuia: false,
    media: true,
    voice: false
  });
  const [selectedExecutive, setSelectedExecutive] = useState(null);

  useEffect(() => {
    fetchExecutiveTeam();
    // Load saved preferences from localStorage
    const saved = localStorage.getItem('executive_expanded_sections');
    if (saved) {
      try {
        setExpandedSections(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const fetchExecutiveTeam = async () => {
    try {
      const res = await api.get('/api/executive/team');
      setExecutives(res.data.executives);
      setGrouped(res.data.grouped);
    } catch (error) {
      console.error('Error fetching executive team:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    const newState = {
      ...expandedSections,
      [section]: !expandedSections[section]
    };
    setExpandedSections(newState);
    // Save preference to localStorage
    localStorage.setItem('executive_expanded_sections', JSON.stringify(newState));
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'leadership': return <Crown size={24} />;
      case 'choir': return <Mic size={24} />;
      case 'jumuia': return <Church size={24} />;
      case 'media': return <Camera size={24} />;
      case 'voice': return <Music size={24} />;
      default: return <Users size={24} />;
    }
  };

  const getCategoryTitle = (category) => {
    switch(category) {
      case 'leadership': return 'Leadership Team';
      case 'choir': return 'Choir Department';
      case 'jumuia': return 'Jumuia Moderators';
      case 'media': return 'Media Department';
      case 'voice': return 'Voice Representatives';
      default: return category;
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'leadership': return '#3b82f6';
      case 'choir': return '#8b5cf6';
      case 'jumuia': return '#10b981';
      case 'media': return '#f59e0b';
      case 'voice': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getCategoryGradient = (category) => {
    switch(category) {
      case 'leadership': return 'linear-gradient(135deg, #3b82f6, #2563eb)';
      case 'choir': return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
      case 'jumuia': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'media': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'voice': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      default: return 'linear-gradient(135deg, #64748b, #475569)';
    }
  };

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCall = (phone) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email) => {
    if (!email) return;
    window.location.href = `mailto:${email}`;
  };

  if (loading) {
    return (
      <div className="executive-loading">
        <div className="loading-container">
          <div className="loading-animation">
            <div className="loading-ring"></div>
            <div className="loading-ring"></div>
            <div className="loading-ring"></div>
            <Shield size={48} className="loading-icon" />
          </div>
          <h3>Loading Executive Team</h3>
          <p>ZUCA Leadership Structure</p>
        </div>
      </div>
    );
  }

  return (
    <div className="executive-page">
      {/* Hero Section */}
      <div className="executive-hero">
        <div className="hero-background">
          <div className="hero-particles"></div>
          <div className="hero-glow"></div>
        </div>
        <div className="hero-content">
          <div className="hero-icon">
            <Shield size={48} />
          </div>
          <h1>ZUCA Executive Committee</h1>
          <p>Leadership structure of Zetech University Catholic Action</p>
          <div className="hero-stats">
            <div className="stat">
              <Users size={16} />
              <span>{executives.length} Executives</span>
            </div>
            <div className="stat">
              <Award size={16} />
              <span>5 Departments</span>
            </div>
            <div className="stat">
              <Star size={16} />
              <span>18 Positions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flowchart Container */}
      <div className="flowchart-container">
        {grouped && Object.entries(grouped).map(([category, members]) => {
          if (members.length === 0) return null;
          
          const isExpanded = expandedSections[category];
          const categoryColor = getCategoryColor(category);
          const categoryGradient = getCategoryGradient(category);

          return (
            <div key={category} className="flowchart-section">
              <div 
                className="section-header"
                style={{ borderLeftColor: categoryColor }}
                onClick={() => toggleSection(category)}
              >
                <div className="section-header-left">
                  <div className="section-icon" style={{ background: categoryGradient }}>
                    {getCategoryIcon(category)}
                  </div>
                  <div>
                    <h2>{getCategoryTitle(category)}</h2>
                    <p>{members.length} {members.length === 1 ? 'member' : 'members'}</p>
                  </div>
                </div>
                <div className="section-toggle">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="section-content">
                  {category === 'leadership' ? (
                    // Leadership Flowchart (Vertical Hierarchy)
                    <div className="leadership-flow">
                      {members.map((member, index) => (
                        <div key={member.id} className="flow-node leadership-node">
                          {index > 0 && (
                            <div className="connector-line">
                              <div className="line-vertical"></div>
                              <div className="line-horizontal"></div>
                            </div>
                          )}
                          <div 
                            className="node-card"
                            onClick={() => setSelectedExecutive(member)}
                          >
                            <div className="node-rank" style={{ background: categoryGradient }}>
                              Level {member.level}
                            </div>
                            <div className="node-avatar">
                              {member.profileImage ? (
                                <img src={member.profileImage} alt={member.name} />
                              ) : (
                                <div className="avatar-placeholder" style={{ background: categoryGradient }}>
                                  {member.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <h3 className="node-name">{member.name}</h3>
                            <p className="node-role">{member.role}</p>
                            <div className="node-contact">
                              {member.phone && (
                                <button 
                                  className="contact-icon whatsapp"
                                  onClick={(e) => { e.stopPropagation(); handleWhatsApp(member.phone); }}
                                  title="WhatsApp"
                                >
                                  <WhatsAppIcon size={14} />
                                </button>
                              )}
                              {member.phone && (
                                <button 
                                  className="contact-icon call"
                                  onClick={(e) => { e.stopPropagation(); handleCall(member.phone); }}
                                  title="Call"
                                >
                                  <Phone size={14} />
                                </button>
                              )}
                              {member.email && (
                                <button 
                                  className="contact-icon email"
                                  onClick={(e) => { e.stopPropagation(); handleEmail(member.email); }}
                                  title="Email"
                                >
                                  <Mail size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Grid Layout for other categories
                    <div className="executive-grid">
                      {members.map(member => (
                        <div 
                          key={member.id} 
                          className="executive-card"
                          onClick={() => setSelectedExecutive(member)}
                        >
                          <div className="card-header" style={{ borderTopColor: categoryColor }}>
                            <div className="card-badge" style={{ background: categoryColor }}>
                              {member.role}
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="card-avatar">
                              {member.profileImage ? (
                                <img src={member.profileImage} alt={member.name} />
                              ) : (
                                <div className="avatar-placeholder" style={{ background: categoryGradient }}>
                                  {member.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <h3 className="card-name">{member.name}</h3>
                            <p className="card-role">{member.role}</p>
                            <div className="card-contact-buttons">
                              {member.phone && (
                                <>
                                  <button 
                                    className="contact-btn whatsapp"
                                    onClick={(e) => { e.stopPropagation(); handleWhatsApp(member.phone); }}
                                  >
                                    <WhatsAppIcon size={14} />
                                    <span>WhatsApp</span>
                                  </button>
                                  <button 
                                    className="contact-btn call"
                                    onClick={(e) => { e.stopPropagation(); handleCall(member.phone); }}
                                  >
                                    <Phone size={14} />
                                    <span>Call</span>
                                  </button>
                                </>
                              )}
                              {member.email && (
                                <button 
                                  className="contact-btn email"
                                  onClick={(e) => { e.stopPropagation(); handleEmail(member.email); }}
                                >
                                  <Mail size={14} />
                                  <span>Email</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Executive Detail Modal */}
      {selectedExecutive && (
        <div className="executive-modal" onClick={() => setSelectedExecutive(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedExecutive(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="modal-header" style={{ background: getCategoryGradient(selectedExecutive.category) }}>
              <div className="modal-avatar">
                {selectedExecutive.profileImage ? (
                  <img src={selectedExecutive.profileImage} alt={selectedExecutive.name} />
                ) : (
                  <div className="avatar-large" style={{ background: getCategoryGradient(selectedExecutive.category) }}>
                    {selectedExecutive.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="modal-title">
                <h2>{selectedExecutive.name}</h2>
                <p>{selectedExecutive.role}</p>
              </div>
            </div>
            
            <div className="modal-body">
              <div className="info-section">
                <h4>Contact Information</h4>
                <div className="contact-list">
                  {selectedExecutive.phone && (
                    <div className="contact-item">
                      <Phone size={18} />
                      <span>{selectedExecutive.phone}</span>
                      <div className="contact-actions">
                        <button onClick={() => handleCall(selectedExecutive.phone)}>Call</button>
                        <button onClick={() => handleWhatsApp(selectedExecutive.phone)}>WhatsApp</button>
                      </div>
                    </div>
                  )}
                  {selectedExecutive.email && (
                    <div className="contact-item">
                      <Mail size={18} />
                      <span>{selectedExecutive.email}</span>
                      <button onClick={() => handleEmail(selectedExecutive.email)}>Send Email</button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="info-section">
                <h4>Executive Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <Shield size={16} />
                    <span>Position</span>
                    <strong>{selectedExecutive.role}</strong>
                  </div>
                  <div className="detail-item">
                    <Award size={16} />
                    <span>Level</span>
                    <strong>Level {selectedExecutive.level}</strong>
                  </div>
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span>Assigned</span>
                    <strong>{selectedExecutive.assignedAt ? formatDistance(new Date(selectedExecutive.assignedAt), new Date(), { addSuffix: true }) : 'Recently'}</strong>
                  </div>
                </div>
              </div>
              
              <div className="info-section">
                <h4>Quick Actions</h4>
                <div className="quick-actions">
                  {selectedExecutive.phone && (
                    <>
                      <button className="action-btn whatsapp" onClick={() => handleWhatsApp(selectedExecutive.phone)}>
                        <WhatsAppIcon size={18} />
                        Message on WhatsApp
                      </button>
                      <button className="action-btn call" onClick={() => handleCall(selectedExecutive.phone)}>
                        <Phone size={18} />
                        Voice Call
                      </button>
                    </>
                  )}
                  {selectedExecutive.email && (
                    <button className="action-btn email" onClick={() => handleEmail(selectedExecutive.email)}>
                      <Mail size={18} />
                      Send Email
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .executive-page {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Hero Section */
        .executive-hero {
          position: relative;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 60px 24px 80px;
          text-align: center;
          overflow: hidden;
        }

        .hero-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .hero-particles {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: particleMove 20s linear infinite;
        }

        @keyframes particleMove {
          from { transform: translateY(0); }
          to { transform: translateY(-40px); }
        }

        .hero-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(59,130,246,0.3), transparent);
          transform: translate(-50%, -50%);
          filter: blur(60px);
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .hero-icon {
          width: 80px;
          height: 80px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: white;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .hero-content h1 {
          font-size: 36px;
          font-weight: 700;
          color: white;
          margin: 0 0 12px 0;
        }

        .hero-content p {
          font-size: 16px;
          color: rgba(255,255,255,0.8);
          margin: 0 0 24px 0;
        }

        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 32px;
        }

        .hero-stats .stat {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.9);
          font-size: 14px;
        }

        /* Flowchart Container */
        .flowchart-container {
          max-width: 1200px;
          margin: -40px auto 0;
          padding: 0 24px 48px;
          position: relative;
          z-index: 3;
        }

        /* Section */
        .flowchart-section {
          background: white;
          border-radius: 20px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .flowchart-section:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          cursor: pointer;
          border-left: 4px solid;
          transition: background 0.2s;
        }

        .section-header:hover {
          background: #fafbfc;
        }

        .section-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .section-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .section-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .section-header p {
          font-size: 12px;
          color: #64748b;
          margin: 4px 0 0;
        }

        .section-toggle {
          color: #94a3b8;
        }

        /* Leadership Flowchart */
        .leadership-flow {
          padding: 32px;
          background: linear-gradient(to bottom, #f8fafc, #ffffff);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .flow-node {
          position: relative;
          margin-bottom: 40px;
        }

        .flow-node:last-child {
          margin-bottom: 0;
        }

        .connector-line {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 40px;
          background: #cbd5e1;
        }

        .node-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          min-width: 220px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border: 1px solid #e8ecf0;
        }

        .node-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.12);
          border-color: #cbd5e1;
        }

        .node-rank {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          color: white;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .node-avatar {
          width: 80px;
          height: 80px;
          margin: 0 auto 16px;
        }

        .node-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 32px;
          font-weight: 600;
        }

        .node-name {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px;
        }

        .node-role {
          font-size: 12px;
          color: #64748b;
          margin: 0 0 12px;
        }

        .node-contact {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .contact-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-icon.whatsapp {
          background: #dcfce7;
          color: #22c55e;
        }

        .contact-icon.whatsapp:hover {
          background: #22c55e;
          color: white;
        }

        .contact-icon.call {
          background: #eff6ff;
          color: #3b82f6;
        }

        .contact-icon.call:hover {
          background: #3b82f6;
          color: white;
        }

        .contact-icon.email {
          background: #fef3c7;
          color: #f59e0b;
        }

        .contact-icon.email:hover {
          background: #f59e0b;
          color: white;
        }

        /* Executive Grid */
        .executive-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          padding: 24px;
        }

        .executive-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #e8ecf0;
        }

        .executive-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          border-color: #cbd5e1;
        }

        .card-header {
          padding: 12px 16px;
          border-top: 3px solid;
          background: #fafbfc;
        }

        .card-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          color: white;
          font-size: 11px;
          font-weight: 500;
        }

        .card-body {
          padding: 20px;
          text-align: center;
        }

        .card-avatar {
          width: 80px;
          height: 80px;
          margin: 0 auto 16px;
        }

        .card-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .card-name {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px;
        }

        .card-role {
          font-size: 12px;
          color: #64748b;
          margin: 0 0 16px;
        }

        .card-contact-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .contact-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .contact-btn.whatsapp {
          background: #dcfce7;
          color: #22c55e;
        }

        .contact-btn.whatsapp:hover {
          background: #22c55e;
          color: white;
        }

        .contact-btn.call {
          background: #eff6ff;
          color: #3b82f6;
        }

        .contact-btn.call:hover {
          background: #3b82f6;
          color: white;
        }

        .contact-btn.email {
          background: #fef3c7;
          color: #f59e0b;
        }

        .contact-btn.email:hover {
          background: #f59e0b;
          color: white;
        }

        /* Modal */
        .executive-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-container {
          background: white;
          border-radius: 24px;
          max-width: 480px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          position: relative;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0,0,0,0.5);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 10;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: rgba(0,0,0,0.7);
          transform: rotate(90deg);
        }

        .modal-header {
          text-align: center;
          padding: 40px 24px 32px;
          color: white;
        }

        .modal-avatar {
          width: 100px;
          height: 100px;
          margin: 0 auto 16px;
        }

        .modal-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid white;
        }

        .avatar-large {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 48px;
          font-weight: 600;
          border: 4px solid white;
        }

        .modal-title h2 {
          font-size: 24px;
          margin: 0 0 4px;
          color: white;
        }

        .modal-title p {
          font-size: 14px;
          opacity: 0.9;
          margin: 0;
          color: white;
        }

        .modal-body {
          padding: 24px;
        }

        .info-section {
          margin-bottom: 24px;
        }

        .info-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .contact-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .contact-item span {
          flex: 1;
          font-size: 14px;
          color: #1e293b;
        }

        .contact-item button {
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-actions {
          display: flex;
          gap: 8px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          gap: 6px;
        }

        .detail-item span {
          font-size: 11px;
          color: #64748b;
        }

        .detail-item strong {
          font-size: 13px;
          color: #1e293b;
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px;
          border-radius: 12px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.whatsapp {
          background: #dcfce7;
          color: #22c55e;
        }

        .action-btn.whatsapp:hover {
          background: #22c55e;
          color: white;
        }

        .action-btn.call {
          background: #eff6ff;
          color: #3b82f6;
        }

        .action-btn.call:hover {
          background: #3b82f6;
          color: white;
        }

        .action-btn.email {
          background: #fef3c7;
          color: #f59e0b;
        }

        .action-btn.email:hover {
          background: #f59e0b;
          color: white;
        }

        /* Loading */
        .executive-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e293b, #0f172a);
        }

        .loading-container {
          text-align: center;
        }

        .loading-animation {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 24px;
        }

        .loading-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          animation: ringRotate 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }

        .loading-ring:nth-child(1) {
          border-top-color: #3b82f6;
          border-right-color: #3b82f6;
        }

        .loading-ring:nth-child(2) {
          border-bottom-color: #8b5cf6;
          border-left-color: #8b5cf6;
          animation-delay: 0.3s;
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
        }

        .loading-ring:nth-child(3) {
          border-top-color: #10b981;
          border-right-color: #10b981;
          animation-delay: 0.6s;
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
        }

        @keyframes ringRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
        }

        .loading-container h3 {
          color: white;
          font-size: 20px;
          margin: 0 0 8px;
        }

        .loading-container p {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          margin: 0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-content h1 {
            font-size: 28px;
          }

          .hero-stats {
            flex-direction: column;
            gap: 12px;
            align-items: center;
          }

          .flowchart-container {
            padding: 0 16px 32px;
          }

          .section-header {
            padding: 16px;
          }

          .section-header-left {
            gap: 12px;
          }

          .section-icon {
            width: 40px;
            height: 40px;
          }

          .section-icon svg {
            width: 20px;
            height: 20px;
          }

          .section-header h2 {
            font-size: 16px;
          }

          .leadership-flow {
            padding: 20px;
          }

          .node-card {
            min-width: 180px;
            padding: 16px;
          }

          .executive-grid {
            grid-template-columns: 1fr;
            padding: 16px;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .modal-container {
            max-width: 95%;
          }
        }
      `}</style>
    </div>
  );
}