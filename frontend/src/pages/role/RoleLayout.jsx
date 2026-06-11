// frontend/src/pages/role/RoleLayout.jsx
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

export default function RoleLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user.role && !user.specialRole) {
      navigate("/login");
    }
  }, []);

  const getRoleInfo = () => {
    const role = user.specialRole || user.role;
    switch(role) {
      case "secretary":
        return { 
          icon: "📋", 
          name: "Secretary", 
          color: "#10b981",
          description: "Manage announcements, schedules & minutes",
          modules: [
            { path: "announcements", icon: "📢", label: "Announcements" },
            { path: "schedules", icon: "📅", label: "Schedules" },
            { path: "minutes", icon: "📝", label: "Minutes" }
          ],
          quickActions: [
            { action: "announcements", label: "New Announcement", icon: "➕" },
            { action: "schedules", label: "Create Schedule", icon: "📅" },
            { action: "minutes/create", label: "New Minutes", icon: "📝" }
          ]
        };
      case "treasurer":
        return { 
          icon: "💰", 
          name: "Treasurer", 
          color: "#f59e0b",
          description: "Manage contributions & financial reports",
          modules: [
            { path: "contributions", icon: "💰", label: "Contributions" },
            { path: "reports", icon: "📊", label: "Reports" }
          ],
          quickActions: [
            { action: "contributions", label: "Add Contribution", icon: "➕" },
            { action: "reports", label: "Generate Report", icon: "📊" }
          ]
        };
      case "choir_moderator":
        return { 
          icon: "🎵", 
          name: "Choir Moderator", 
          color: "#ec4899",
          description: "Manage mass programs & songs",
          modules: [
            { path: "songs", icon: "🎵", label: "Songs" },
            { path: "programs", icon: "📅", label: "Programs" }
          ],
          quickActions: [
            { action: "songs", label: "Add Song", icon: "➕" },
            { action: "programs", label: "Create Program", icon: "📅" }
          ]
        };
      case "jumuia_leader":
        return { 
          icon: "👑", 
          name: "Jumuia Leader", 
          color: "#8b5cf6",
          description: "Manage your jumuia members & activities",
          modules: [
            { path: "members", icon: "👥", label: "Members" },
            { path: "activities", icon: "🎯", label: "Activities" }
          ],
          quickActions: [
            { action: "members", label: "Add Member", icon: "➕" },
            { action: "activities", label: "Plan Activity", icon: "🎯" }
          ]
        };
      case "media_moderator":
        return { 
          icon: "📸", 
          name: "Media Moderator", 
          color: "#3b82f6",
          description: "Manage gallery & media content",
          modules: [
            { path: "gallery", icon: "🖼️", label: "Gallery" },
            { path: "videos", icon: "📹", label: "Videos" }
          ],
          quickActions: [
            { action: "gallery", label: "Upload Photo", icon: "📸" },
            { action: "videos", label: "Upload Video", icon: "📹" }
          ]
        };
      default:
        return { 
          icon: "👤", 
          name: "Member", 
          color: "#64748b",
          description: "Welcome to your dashboard",
          modules: [],
          quickActions: []
        };
    }
  };

  const roleInfo = getRoleInfo();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleQuickAction = (action) => {
    navigate(action);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="role-layout">
      {/* Minimal Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="role-badge-mini" style={{ background: `${roleInfo.color}15`, color: roleInfo.color }}>
            <span>{roleInfo.icon}</span>
            <span>{roleInfo.name}</span>
          </div>
          <span className="role-desc-mini">{roleInfo.description}</span>
        </div>
        <div className="top-bar-right">
          <span className="user-name-mini">{user.fullName || user.name || "User"}</span>
          <button className="logout-btn-mini" onClick={handleLogout}>
            <span>🚪</span>
            <span>Logout</span>
          </button>
          {isMobile && (
            <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              ☰
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="layout-container">
        {/* Desktop Sidebar - Compact */}
        {!isMobile && (
          <aside className="sidebar-compact">
            <nav className="sidebar-nav-compact">
              {roleInfo.modules.map((module) => (
                <NavLink
                  key={module.path}
                  to={module.path}
                  className={({ isActive }) => 
                    `nav-item-compact ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="nav-icon-compact">{module.icon}</span>
                  <span className="nav-label-compact">{module.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="quick-actions-compact">
              <div className="quick-actions-header">
                <span>⚡ Quick Actions</span>
              </div>
              {roleInfo.quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="quick-action-btn"
                  onClick={() => handleQuickAction(action.action)}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="main-content-compact">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu */}
      {isMobile && isMobileMenuOpen && (
        <>
          <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="mobile-menu">
            <div className="mobile-menu-header">
              <span className="mobile-user-name">{user.fullName || user.name || "User"}</span>
              <span className="mobile-user-role">{roleInfo.name}</span>
            </div>
            <nav className="mobile-nav">
              {roleInfo.modules.map((module) => (
                <NavLink
                  key={module.path}
                  to={module.path}
                  className={({ isActive }) => 
                    `mobile-nav-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>{module.icon}</span>
                  <span>{module.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mobile-quick-actions">
              <h4>Quick Actions</h4>
              {roleInfo.quickActions.map((action, idx) => (
                <button
                  key={idx}
                  className="mobile-action-btn"
                  onClick={() => handleQuickAction(action.action)}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
            <button className="mobile-logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .role-layout {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Top Bar - Compact */
        .top-bar {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .role-badge-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .role-desc-mini {
          font-size: 12px;
          color: #64748b;
        }

        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-name-mini {
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
        }

        .logout-btn-mini {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn-mini:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        /* Layout Container */
        .layout-container {
          display: flex;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* Compact Sidebar - Desktop */
        .sidebar-compact {
          width: 260px;
          background: white;
          min-height: calc(100vh - 57px);
          border-right: 1px solid #e2e8f0;
          padding: 20px 0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 57px;
          height: calc(100vh - 57px);
          overflow-y: auto;
        }

        .sidebar-nav-compact {
          flex: 1;
          padding: 0 16px;
        }

        .nav-item-compact {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          margin: 4px 0;
          border-radius: 10px;
          color: #475569;
          text-decoration: none;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
        }

        .nav-item-compact:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .nav-item-compact.active {
          background: ${roleInfo.color}10;
          color: ${roleInfo.color};
        }

        .nav-icon-compact {
          font-size: 18px;
        }

        /* Quick Actions */
        .quick-actions-compact {
          padding: 20px 16px;
          border-top: 1px solid #e2e8f0;
          margin-top: auto;
        }

        .quick-actions-header {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          margin: 4px 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-action-btn:hover {
          background: ${roleInfo.color}10;
          border-color: ${roleInfo.color}30;
          color: ${roleInfo.color};
        }

        /* Main Content - Full Width */
        .main-content-compact {
          flex: 1;
          padding: 24px 32px;
          min-height: calc(100vh - 57px);
          background: #f8fafc;
        }

        /* Mobile Styles */
        .mobile-menu-toggle {
          display: none;
          background: #f1f5f9;
          border: none;
          font-size: 20px;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
        }

        .mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 200;
        }

        .mobile-menu {
          position: fixed;
          top: 0;
          right: 0;
          width: 280px;
          height: 100vh;
          background: white;
          z-index: 201;
          padding: 20px;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .mobile-menu-header {
          text-align: center;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 16px;
        }

        .mobile-user-name {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        .mobile-user-role {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }

        .mobile-nav {
          flex: 1;
        }

        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          margin: 4px 0;
          border-radius: 10px;
          color: #475569;
          text-decoration: none;
          transition: all 0.2s;
        }

        .mobile-nav-item.active {
          background: ${roleInfo.color}10;
          color: ${roleInfo.color};
        }

        .mobile-quick-actions {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .mobile-quick-actions h4 {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
        }

        .mobile-action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px;
          margin: 4px 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .mobile-logout-btn {
          margin-top: 16px;
          padding: 12px;
          background: #fee2e2;
          color: #ef4444;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .top-bar {
            padding: 10px 16px;
          }

          .role-desc-mini {
            display: none;
          }

          .user-name-mini {
            display: none;
          }

          .logout-btn-mini span:last-child {
            display: none;
          }

          .logout-btn-mini {
            padding: 8px 12px;
          }

          .mobile-menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .main-content-compact {
            padding: 16px;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .main-content-compact {
            padding: 20px 24px;
          }

          .sidebar-compact {
            width: 240px;
          }

          .nav-label-compact {
            font-size: 13px;
          }
        }

        /* Scrollbar */
        .sidebar-compact::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-compact::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .sidebar-compact::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}