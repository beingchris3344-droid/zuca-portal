

// frontend/src/pages/admin/SecurityPage.jsx
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import backgroundImg from "../../assets/background.png";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function SecurityPage() {
  const [activeSection, setActiveSection] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadFormat, setDownloadFormat] = useState("html");
  const contentRef = useRef(null);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const sections = [
    { id: "overview", title: "📋 Overview", icon: "📋" },
    { id: "getting-started", title: "🚀 Getting Started", icon: "🚀" },
    { id: "dashboard", title: "📊 Dashboard", icon: "📊" },
    { id: "users", title: "👥 User Management", icon: "👥" },
    { id: "roles", title: "👑 Role Management", icon: "👑" },
    { id: "jumuia", title: "⛪ Jumuia Management", icon: "⛪" },
    { id: "media", title: "🎥 Media Management", icon: "🎥" },
    { id: "youtube", title: "▶️ YouTube Analytics", icon: "▶️" },
    { id: "songs", title: "🎵 Songs Program", icon: "🎵" },
    { id: "hymns", title: "📖 Hymn Book", icon: "📖" },
    { id: "pending-songs", title: "⏳ Pending Songs", icon: "⏳" },
    { id: "announcements", title: "📢 Announcements", icon: "📢" },
    { id: "contributions", title: "💰 Contributions", icon: "💰" },
    { id: "chat", title: "💬 Chat Monitor", icon: "💬" },
    { id: "security", title: "🔒 Security", icon: "🔒" },
    { id: "faq", title: "❓ FAQ", icon: "❓" },
    { id: "troubleshooting", title: "🛠️ Troubleshooting", icon: "🛠️" }
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.id.includes(searchTerm.toLowerCase())
  );

  // Download as HTML
  const downloadAsHTML = () => {
    const content = document.getElementById('manual-content').innerHTML;
    const styles = document.querySelector('style').innerHTML;
    
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ZUCA Portal - Admin User Manual</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
          background: #f8fafc;
          color: #0f172a;
          line-height: 1.6;
        }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e293b; margin-top: 30px; background: #f1f5f9; padding: 10px 15px; border-radius: 8px; }
        h3 { color: #475569; margin-top: 20px; }
        .section { margin-bottom: 30px; }
        .code-block { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
        th { background: #f1f5f9; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        .tip { background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; }
        ${styles}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    saveAs(blob, `zuca-admin-manual-${new Date().toISOString().split('T')[0]}.html`);
  };

  // Download as PDF (via print)
  const downloadAsPDF = () => {
    window.print();
  };

  // Download as DOC
  const downloadAsDOC = () => {
    const content = document.getElementById('manual-content').innerHTML;
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ZUCA Portal - Admin User Manual</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; margin: 1in; }
        h1 { color: #2563eb; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000; padding: 8px; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>`;
    
    const blob = new Blob([html], { type: 'application/msword' });
    saveAs(blob, `zuca-admin-manual-${new Date().toISOString().split('T')[0]}.doc`);
  };

  const handleDownload = () => {
    if (downloadFormat === 'html') downloadAsHTML();
    else if (downloadFormat === 'pdf') downloadAsPDF();
    else if (downloadFormat === 'doc') downloadAsDOC();
  };

  return (
    <div style={pageStyle}>
      <div style={overlayStyle}></div>
      
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>📚 ZUCA Portal - Admin User Manual</h1>
            <p style={subtitleStyle}>Complete guide for administrators, treasurers, and moderators</p>
          </div>
          <div style={headerActionsStyle}>
            <div style={downloadGroupStyle}>
              <select 
                value={downloadFormat} 
                onChange={(e) => setDownloadFormat(e.target.value)}
                style={formatSelectStyle}
              >
                <option value="html">📄 HTML</option>
                <option value="pdf">📑 PDF (Print)</option>
                <option value="doc">📝 Word Document</option>
              </select>
              <button onClick={handleDownload} style={downloadBtnStyle}>
                ⬇️ Download Manual
              </button>
            </div>
            <button onClick={() => window.print()} style={printBtnStyle}>
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={searchContainerStyle}>
          <input
            type="text"
            placeholder="🔍 Search manual sections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>

        {/* Quick Navigation */}
        <div style={navContainerStyle}>
          <h3 style={navTitleStyle}>📑 Quick Navigation</h3>
          <div style={navGridStyle}>
            {filteredSections.map(section => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={navButtonStyle}
              >
                <span style={{ fontSize: '20px' }}>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div id="manual-content" ref={contentRef} style={contentContainerStyle}>
          {/* Overview Section */}
          <div id="overview" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("overview")}>
              <h2 style={sectionTitleStyle}>📋 Overview</h2>
              <span style={toggleIconStyle}>{expandedSections["overview"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["overview"] && (
              <div style={sectionContentStyle}>
                <p>The ZUCA Portal is a comprehensive management system for Zetech University Catholic Action. This manual covers all administrative features available to:</p>
                
                <div style={roleGridStyle}>
                  <div style={roleCardStyle}>
                    <div style={{ fontSize: '32px' }}>👑</div>
                    <h4>Administrators</h4>
                    <p>Full system access, user management, role assignment, all modules</p>
                  </div>
                  <div style={roleCardStyle}>
                    <div style={{ fontSize: '32px' }}>💰</div>
                    <h4>Treasurers</h4>
                    <p>Manage contributions, approve pledges, track payments</p>
                  </div>
                  <div style={roleCardStyle}>
                    <div style={{ fontSize: '32px' }}>👥</div>
                    <h4>Jumuia Leaders</h4>
                    <p>Manage their jumuia, members, contributions, announcements</p>
                  </div>
                  <div style={roleCardStyle}>
                    <div style={{ fontSize: '32px' }}>📝</div>
                    <h4>Secretaries</h4>
                    <p>Create announcements, manage media, assist with admin tasks</p>
                  </div>
                  <div style={roleCardStyle}>
                    <div style={{ fontSize: '32px' }}>🎵</div>
                    <h4>Choir Moderators</h4>
                    <p>Manage songs, hymns, mass programs</p>
                  </div>
                  <div style={roleCardStyle}>
                    <div style={{ fontSize: '32px' }}>🎥</div>
                    <h4>Media Moderators</h4>
                    <p>Upload and manage media gallery content</p>
                  </div>
                </div>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Use the sidebar navigation to access different modules. Your role determines which modules you can see.
                </div>
              </div>
            )}
          </div>

          {/* Getting Started */}
          <div id="getting-started" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("getting-started")}>
              <h2 style={sectionTitleStyle}>🚀 Getting Started</h2>
              <span style={toggleIconStyle}>{expandedSections["getting-started"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["getting-started"] && (
              <div style={sectionContentStyle}>
                <h3>Login Methods</h3>
                <table style={tableStyle}>
                  <thead>
                    <tr><th>Method</th><th>How to Use</th><th>Who Can Use</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>🔐 Standard Login</td><td>Email + Password</td><td>All users with standard accounts</td></tr>
                    <tr><td>👑 Role Login</td><td>Email + Role Password (e.g., "treasurer123")</td><td>Treasurers, Leaders, Secretaries, Moderators</td></tr>
                  </tbody>
                </table>

                <h3>Role Login Passwords</h3>
                <table style={tableStyle}>
                  <thead>
                    <tr><th>Role</th><th>Password Format</th><th>Example</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Jumuia Leader</td><td>jumuianame + membership number</td><td>stmichaelZ#001</td></tr>
                    <tr><td>Treasurer</td><td>treasurer + membership number</td><td>treasurerZ#001</td></tr>
                    <tr><td>Secretary</td><td>secretary + membership number</td><td>secretaryZ#001</td></tr>
                    <tr><td>Choir Moderator</td><td>choir + membership number</td><td>choirZ#001</td></tr>
                    <tr><td>Media Moderator</td><td>media + membership number</td><td>mediaZ#001</td></tr>
                  </tbody>
                </table>

                <div style={warningStyle}>
                  <strong>⚠️ Important:</strong> Role logins only work if you have been assigned that special role by an administrator.
                </div>
              </div>
            )}
          </div>

          {/* Dashboard */}
          <div id="dashboard" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("dashboard")}>
              <h2 style={sectionTitleStyle}>📊 Dashboard</h2>
              <span style={toggleIconStyle}>{expandedSections["dashboard"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["dashboard"] && (
              <div style={sectionContentStyle}>
                <p>The dashboard provides an overview of key metrics and recent activity:</p>
                
                <ul style={listStyle}>
                  <li><strong>📢 Announcements</strong> - Recent announcements and notification count</li>
                  <li><strong>💬 Chat Activity</strong> - Recent messages and online users</li>
                  <li><strong>⛪ Upcoming Events</strong> - Mass programs and events</li>
                  <li><strong>💰 Contribution Summary</strong> - Total collected, pending approvals</li>
                  <li><strong>📊 Real-time Stats</strong> - User count, online members, system status</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Click on any stat card to navigate directly to that section.
                </div>
              </div>
            )}
          </div>

          {/* User Management */}
          <div id="users" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("users")}>
              <h2 style={sectionTitleStyle}>👥 User Management</h2>
              <span style={toggleIconStyle}>{expandedSections["users"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["users"] && (
              <div style={sectionContentStyle}>
                <p>Located in the sidebar under "Users", this section allows you to manage all system users.</p>

                <h3>Features:</h3>
                <ul style={listStyle}>
                  <li><strong>View All Users</strong> - Complete list with search and filters</li>
                  <li><strong>Promote/Demote</strong> - Change user roles between Member and Admin</li>
                  <li><strong>Delete Users</strong> - Remove users from the system</li>
                  <li><strong>Export Data</strong> - Download user lists as Excel or Word documents</li>
                  <li><strong>Bulk Actions</strong> - Select multiple users for bulk operations</li>
                  <li><strong>View Details</strong> - Click on any user avatar to see full profile</li>
                </ul>

                <h3>User Status Indicators:</h3>
                <ul style={listStyle}>
                  <li>🟢 <strong>Green Dot</strong> - User is online (active in last 5 minutes)</li>
                  <li>🔴 <strong>Red Dot</strong> - User is offline</li>
                  <li>👑 <strong>Crown Badge</strong> - Admin user</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Use the search bar to quickly find users by name, email, or membership number.
                </div>
              </div>
            )}
          </div>

          {/* Role Management */}
          <div id="roles" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("roles")}>
              <h2 style={sectionTitleStyle}>👑 Role Management</h2>
              <span style={toggleIconStyle}>{expandedSections["roles"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["roles"] && (
              <div style={sectionContentStyle}>
                <p>Assign special roles to users for granular access control.</p>

                <h3>Available Special Roles:</h3>
                <table style={tableStyle}>
                  <thead>
                    <tr><th>Role</th><th>Permissions</th><th>Icon</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Jumuia Leader</td><td>Manage their jumuia, members, contributions, announcements</td><td>👑</td></tr>
                    <tr><td>Treasurer</td><td>Manage contributions, approve pledges, view all financial data</td><td>💰</td></tr>
                    <tr><td>Secretary</td><td>Create announcements, manage media</td><td>📝</td></tr>
                    <tr><td>Choir Moderator</td><td>Manage songs, hymns, mass programs</td><td>🎵</td></tr>
                    <tr><td>Media Moderator</td><td>Upload and manage media gallery</td><td>🎥</td></tr>
                  </tbody>
                </table>

                <h3>How to Assign a Role:</h3>
                <ol style={listStyle}>
                  <li>Navigate to "Role Management" in sidebar</li>
                  <li>Find the user in the list</li>
                  <li>Select the special role from dropdown</li>
                  <li>For Jumuia Leader, also select which Jumuia they lead</li>
                  <li>Click "Save Changes"</li>
                </ol>

                <div style={warningStyle}>
                  <strong>⚠️ Note:</strong> Only Administrators can assign special roles. Role logins only work after assignment.
                </div>
              </div>
            )}
          </div>

          {/* Jumuia Management */}
          <div id="jumuia" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("jumuia")}>
              <h2 style={sectionTitleStyle}>⛪ Jumuia Management</h2>
              <span style={toggleIconStyle}>{expandedSections["jumuia"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["jumuia"] && (
              <div style={sectionContentStyle}>
                <p>Manage Jumuia (small Christian community) groups and their members.</p>

                <h3>Features:</h3>
                <ul style={listStyle}>
                  <li><strong>Create Jumuia</strong> - Add new Jumuia groups with name, description, location</li>
                  <li><strong>View Members</strong> - See all members in each Jumuia</li>
                  <li><strong>Move Members</strong> - Transfer members between Jumuia groups</li>
                  <li><strong>Assign Leaders</strong> - Make users Jumuia Leaders</li>
                  <li><strong>Remove Members</strong> - Remove users from Jumuia</li>
                  <li><strong>Export Data</strong> - Download Jumuia member lists</li>
                  <li><strong>View Full Page</strong> - See complete Jumuia details including contributions</li>
                </ul>

                <h3>Jumuia Structure:</h3>
                <ul style={listStyle}>
                  <li>📋 <strong>Name</strong> - Official Jumuia name (e.g., "St. Michael")</li>
                  <li>📍 <strong>Location</strong> - Meeting location or region</li>
                  <li>📝 <strong>Description</strong> - Brief about the Jumuia</li>
                  <li>👑 <strong>Leader</strong> - Assigned Jumuia Leader</li>
                  <li>👥 <strong>Members</strong> - List of all members</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Click "View Full Page" to see detailed contribution information for each Jumuia.
                </div>
              </div>
            )}
          </div>

          {/* Media Management */}
          <div id="media" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("media")}>
              <h2 style={sectionTitleStyle}>🎥 Media Management</h2>
              <span style={toggleIconStyle}>{expandedSections["media"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["media"] && (
              <div style={sectionContentStyle}>
                <p>Upload and manage images, videos, and documents for the media gallery.</p>

                <h3>Supported File Types:</h3>
                <ul style={listStyle}>
                  <li>🖼️ <strong>Images</strong> - JPG, PNG, GIF, WebP (max 10MB)</li>
                  <li>🎬 <strong>Videos</strong> - MP4, MOV, AVI (max 50MB)</li>
                  <li>🎵 <strong>Audio</strong> - MP3, WAV, OGG (max 20MB)</li>
                  <li>📄 <strong>Documents</strong> - PDF, DOC, DOCX (max 10MB)</li>
                </ul>

                <h3>How to Upload:</h3>
                <ol style={listStyle}>
                  <li>Click "Upload New Media" button</li>
                  <li>Select files (multiple allowed)</li>
                  <li>Choose category (Mass, Fellowship, Outreach, Events, Retreats)</li>
                  <li>Add description (optional)</li>
                  <li>Set visibility (Public/Private)</li>
                  <li>Mark as Featured if desired</li>
                  <li>Click "Upload"</li>
                </ol>

                <h3>Media Management:</h3>
                <ul style={listStyle}>
                  <li>📊 <strong>View Stats</strong> - Total views, likes, comments, downloads</li>
                  <li>✏️ <strong>Edit Metadata</strong> - Change title, description, category</li>
                  <li>🗑️ <strong>Delete Media</strong> - Remove files (admins and moderators only)</li>
                  <li>💬 <strong>Manage Comments</strong> - Delete inappropriate comments</li>
                  <li>👍 <strong>Remove Likes</strong> - Moderate likes if needed</li>
                  <li>📥 <strong>Bulk Actions</strong> - Select multiple items for bulk delete</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Use grid/list view toggle to switch between layouts. Search and filter by category to find specific media.
                </div>
              </div>
            )}
          </div>

          {/* YouTube Analytics */}
          <div id="youtube" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("youtube")}>
              <h2 style={sectionTitleStyle}>▶️ YouTube Analytics</h2>
              <span style={toggleIconStyle}>{expandedSections["youtube"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["youtube"] && (
              <div style={sectionContentStyle}>
                <p>Monitor ZUCA's YouTube channel performance and analytics.</p>

                <h3>Available Metrics:</h3>
                <ul style={listStyle}>
                  <li>📊 <strong>Channel Stats</strong> - Subscribers, total views, total videos</li>
                  <li>📈 <strong>Performance Overview</strong> - Views over time chart</li>
                  <li>🎬 <strong>Top Videos</strong> - Best performing content</li>
                  <li>🎵 <strong>Featured Songs</strong> - Most played songs</li>
                  <li>👥 <strong>Audience Demographics</strong> - Age, gender, location</li>
                  <li>📱 <strong>Device Data</strong> - How viewers watch (mobile, desktop, tablet)</li>
                  <li>⏰ <strong>Hourly Activity</strong> - Peak viewing times</li>
                  <li>📊 <strong>Traffic Sources</strong> - Where viewers come from</li>
                </ul>

                <h3>Time Range Options:</h3>
                <ul style={listStyle}>
                  <li>Last 7 days</li>
                  <li>Last 28 days</li>
                  <li>Last 90 days</li>
                  <li>Last year</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Click on any video thumbnail to open it on YouTube. Use the refresh button to fetch latest data.
                </div>
              </div>
            )}
          </div>

          {/* Songs Program */}
          <div id="songs" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("songs")}>
              <h2 style={sectionTitleStyle}>🎵 Songs Program (Mass Programs)</h2>
              <span style={toggleIconStyle}>{expandedSections["songs"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["songs"] && (
              <div style={sectionContentStyle}>
                <p>Create and manage Mass programs with assigned songs for each liturgy part.</p>

                <h3>Song Sections:</h3>
                <table style={tableStyle}>
                  <thead><tr><th>Section</th><th>Description</th><th>Icon</th></tr></thead>
                  <tbody>
                    <tr><td>Entrance Hymn</td><td>Sung as congregation enters</td><td>🚪</td></tr>
                    <tr><td>Mass Hymn</td><td>Opening hymn</td><td>⛪</td></tr>
                    <tr><td>Bible Reading</td><td>Scripture reading</td><td>📖</td></tr>
                    <tr><td>Offertory Hymn</td><td>During offering</td><td>🙏</td></tr>
                    <tr><td>Procession Hymn</td><td>During procession</td><td>🚶</td></tr>
                    <tr><td>Mtakatifu Hymn</td><td>Holy, Holy, Holy</td><td>✨</td></tr>
                    <tr><td>Sign of Peace</td><td>Peace be with you</td><td>🕊️</td></tr>
                    <tr><td>Communion Hymn</td><td>During communion</td><td>🍞</td></tr>
                    <tr><td>Thanksgiving Hymn</td><td>After communion</td><td>🎉</td></tr>
                    <tr><td>Exit Hymn</td><td>Closing hymn</td><td>👋</td></tr>
                  </tbody>
                </table>

                <h3>Features:</h3>
                <ul style={listStyle}>
                  <li><strong>Create Programs</strong> - Set date, venue, and assign songs</li>
                  <li><strong>Edit Programs</strong> - Update existing programs</li>
                  <li><strong>Delete Programs</strong> - Remove programs</li>
                  <li><strong>Download Options</strong> - Export as Word, PDF (Print), or Image (PNG)</li>
                  <li><strong>Duplicate Detection</strong> - Warns if same song was sung in recent program</li>
                  <li><strong>Auto-save Draft</strong> - Form auto-saves while editing</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Programs are sorted by date (newest first). Click on any program to expand and see all songs.
                </div>
              </div>
            )}
          </div>

          {/* Hymn Book */}
          <div id="hymns" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("hymns")}>
              <h2 style={sectionTitleStyle}>📖 Hymn Book</h2>
              <span style={toggleIconStyle}>{expandedSections["hymns"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["hymns"] && (
              <div style={sectionContentStyle}>
                <p>Manage the complete hymn book with lyrics and references.</p>

                <h3>Features:</h3>
                <ul style={listStyle}>
                  <li><strong>Add Hymns</strong> - Create new hymns with title, reference, lyrics</li>
                  <li><strong>Edit Hymns</strong> - Update existing hymns</li>
                  <li><strong>Delete Hymns</strong> - Remove hymns from database</li>
                  <li><strong>Search Hymns</strong> - Find by title, reference, or lyrics</li>
                  <li><strong>Auto-format Lyrics</strong> - Fix spacing and bold repeated lines (3+ times)</li>
                  <li><strong>Bulk Processing</strong> - Process multiple hymns at once</li>
                  <li><strong>Process All Songs</strong> - Process entire database</li>
                  <li><strong>Live Preview</strong> - See formatted lyrics as you type</li>
                  <li><strong>Font Size Control</strong> - Adjust preview font size</li>
                </ul>

                <h3>Auto-format Features:</h3>
                <ul style={listStyle}>
                  <li>✨ <strong>Clean Formatting</strong> - Fix spacing and line breaks</li>
                  <li>🎵 <strong>Bold Repeated Lines</strong> - Detects lines repeated 3+ times and bolds them</li>
                  <li>📝 <strong>Capitalize Title</strong> - Proper title case</li>
                  <li>📋 <strong>Insert Sample</strong> - Example lyrics for testing</li>
                </ul>

                <div style={warningStyle}>
                  <strong>⚠️ Note:</strong> "Process ALL Songs" may take a few minutes for large databases. It processes ALL hymns, not just loaded ones.
                </div>
              </div>
            )}
          </div>

          {/* Pending Songs */}
          <div id="pending-songs" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("pending-songs")}>
              <h2 style={sectionTitleStyle}>⏳ Pending Songs</h2>
              <span style={toggleIconStyle}>{expandedSections["pending-songs"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["pending-songs"] && (
              <div style={sectionContentStyle}>
                <p>View songs that were added to mass programs but don't have lyrics in the hymn book yet.</p>

                <h3>How it works:</h3>
                <ol style={listStyle}>
                  <li>When a program is created with a song not in the hymn book, it's automatically added as "Pending"</li>
                  <li>Admins and Choir Moderators see pending songs here</li>
                  <li>Click "Add Lyrics" to add the song to the hymn book</li>
                  <li>After adding lyrics, the pending status is removed</li>
                </ol>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> This ensures all songs in programs eventually have lyrics in the hymn book.
                </div>
              </div>
            )}
          </div>

          {/* Announcements */}
          <div id="announcements" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("announcements")}>
              <h2 style={sectionTitleStyle}>📢 Announcements</h2>
              <span style={toggleIconStyle}>{expandedSections["announcements"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["announcements"] && (
              <div style={sectionContentStyle}>
                <p>Create and manage announcements shown to all users.</p>

                <h3>Categories:</h3>
                <ul style={listStyle}>
                  <li>📌 <strong>General</strong> - General announcements</li>
                  <li>⛪ <strong>Mass</strong> - Mass-related announcements</li>
                  <li>🎉 <strong>Event</strong> - Event notifications</li>
                  <li>⚠️ <strong>Urgent</strong> - Time-sensitive announcements (highlighted)</li>
                  <li>🔔 <strong>Reminder</strong> - Reminder notices</li>
                </ul>

                <h3>Features:</h3>
                <ul style={listStyle}>
                  <li><strong>Create Announcements</strong> - Title, content, category</li>
                  <li><strong>Edit Announcements</strong> - Update existing</li>
                  <li><strong>Delete Announcements</strong> - Remove announcements</li>
                  <li><strong>Real-time Updates</strong> - Users see new announcements immediately</li>
                  <li><strong>Search & Filter</strong> - Find announcements by title, content, or category</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Use "Urgent" category for time-sensitive announcements - they get special highlighting.
                </div>
              </div>
            )}
          </div>

          {/* Contributions */}
          <div id="contributions" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("contributions")}>
              <h2 style={sectionTitleStyle}>💰 Contributions</h2>
              <span style={toggleIconStyle}>{expandedSections["contributions"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["contributions"] && (
              <div style={sectionContentStyle}>
                <p>Manage contribution campaigns, pledges, and payments.</p>

                <h3>For Admins & Treasurers:</h3>
                <ul style={listStyle}>
                  <li><strong>Create Campaigns</strong> - Title, description, amount per member, deadline</li>
                  <li><strong>View All Pledges</strong> - See every member's pledge status</li>
                  <li><strong>Approve Pledges</strong> - Convert pending amounts to approved</li>
                  <li><strong>Add Manual Payments</strong> - Record offline payments</li>
                  <li><strong>Edit Messages</strong> - Update pledge messages</li>
                  <li><strong>Reset Pledges</strong> - Clear all amounts for a pledge</li>
                  <li><strong>Bulk Approve</strong> - Approve multiple pledges at once</li>
                  <li><strong>Export Data</strong> - Excel, CSV, or Word export with filters</li>
                  <li><strong>Bulk Campaign Actions</strong> - Delete or duplicate multiple campaigns</li>
                </ul>

                <h3>Pledge Statuses:</h3>
                <table style={tableStyle}>
                  <thead><tr><th>Status</th><th>Meaning</th><th>Action Needed</th></tr></thead>
                  <tbody>
                    <tr><td>🟡 PENDING</td><td>Pledge made, awaiting approval</td><td>Admin/Treasurer approval</td></tr>
                    <tr><td>🟢 APPROVED</td><td>Pledge approved, payment recorded</td><td>None - automatically tracked</td></tr>
                    <tr><td>🔵 COMPLETED</td><td>Fully paid</td><td>None</td></tr>
                    <tr><td>⚪ NO PLEDGE</td><td>No amount pledged yet</td><td>Member can pledge</td></tr>
                  </tbody>
                </table>

                <h3>Real-time Updates:</h3>
                <ul style={listStyle}>
                  <li>🔔 New pledges trigger notifications to admins/treasurers</li>
                  <li>✅ Approvals notify the member</li>
                  <li>💬 Message thread for each pledge</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Use the message icon to communicate with members about their pledges.
                </div>
              </div>
            )}
          </div>

          {/* Chat Monitor */}
          <div id="chat" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("chat")}>
              <h2 style={sectionTitleStyle}>💬 Chat Monitor</h2>
              <span style={toggleIconStyle}>{expandedSections["chat"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["chat"] && (
              <div style={sectionContentStyle}>
                <p>Monitor and moderate the public chat with full admin controls.</p>

                <h3>Features:</h3>
                <ul style={listStyle}>
                  <li><strong>View All Messages</strong> - See all chat messages in real-time</li>
                  <li><strong>Send Messages</strong> - Participate in chat as admin</li>
                  <li><strong>Delete Messages</strong> - Remove inappropriate messages</li>
                  <li><strong>Pin Important Messages</strong> - Highlight key announcements</li>
                  <li><strong>Mute/Unmute Users</strong> - Temporarily silence disruptive users</li>
                  <li><strong>View Online Users</strong> - See who's currently active</li>
                  <li><strong>Bulk Delete</strong> - Remove multiple messages at once</li>
                  <li><strong>Export Chat History</strong> - Download as CSV for records</li>
                  <li><strong>Message Reactions</strong> - Add/remove emoji reactions</li>
                  <li><strong>Reply to Messages</strong> - Threaded conversations</li>
                  <li><strong>File Sharing</strong> - View and manage uploaded files</li>
                </ul>

                <h3>Chat Controls:</h3>
                <ul style={listStyle}>
                  <li>📌 <strong>Pin</strong> - Click pin icon to highlight important messages</li>
                  <li>🗑️ <strong>Delete</strong> - Click trash icon to remove message</li>
                  <li>🔇 <strong>Mute</strong> - Mute user from their message options</li>
                  <li>↩️ <strong>Reply</strong> - Reply to specific messages</li>
                  <li>👍 <strong>React</strong> - Add emoji reactions</li>
                </ul>

                <div style={tipStyle}>
                  <strong>💡 Tip:</strong> Long-press on mobile or right-click on desktop to access message actions.
                </div>
              </div>
            )}
          </div>

          {/* Security */}
          <div id="security" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("security")}>
              <h2 style={sectionTitleStyle}>🔒 Security</h2>
              <span style={toggleIconStyle}>{expandedSections["security"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["security"] && (
              <div style={sectionContentStyle}>
                <p>Manage security settings, alerts, and user password resets.</p>

                <h3>Available Features:</h3>
                <ul style={listStyle}>
                  <li><strong>Password Reset</strong> - Force reset user passwords</li>
                  <li><strong>Security Alerts</strong> - View and manage security notifications</li>
                  <li><strong>Login Monitoring</strong> - Track suspicious login attempts</li>
                  <li><strong>User Lockout Management</strong> - Unlock locked accounts</li>
                </ul>

                <div style={warningStyle}>
                  <strong>⚠️ Important:</strong> Always verify user identity before resetting passwords.
                </div>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div id="faq" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("faq")}>
              <h2 style={sectionTitleStyle}>❓ Frequently Asked Questions</h2>
              <span style={toggleIconStyle}>{expandedSections["faq"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["faq"] && (
              <div style={sectionContentStyle}>
                <div style={faqItemStyle}>
                  <h4>❓ How do I assign a special role to a user?</h4>
                  <p>Go to Role Management, find the user, select the role from dropdown, and click Save Changes.</p>
                </div>
                <div style={faqItemStyle}>
                  <h4>❓ Why can't a user login with role credentials?</h4>
                  <p>Ensure they have been assigned that special role in Role Management, and they're using the correct password format.</p>
                </div>
                <div style={faqItemStyle}>
                  <h4>❓ How do I delete multiple users at once?</h4>
                  <p>In User Management, enable bulk mode, select users, and click delete.</p>
                </div>
                <div style={faqItemStyle}>
                  <h4>❓ What happens when I "Process ALL Songs"?</h4>
                  <p>It processes ALL hymns in the database (not just loaded ones) to fix spacing and bold repeated lines. This may take a few minutes.</p>
                </div>
                <div style={faqItemStyle}>
                  <h4>❓ How do I approve a pledge?</h4>
                  <p>Go to Contributions, expand the campaign, find the member, and click the Approve button.</p>
                </div>
                <div style={faqItemStyle}>
                  <h4>❓ Why am I getting a duplicate song warning?</h4>
                  <p>The system prevents using the same song in consecutive programs to ensure variety. Choose a different song.</p>
                </div>
                <div style={faqItemStyle}>
                  <h4>❓ How do I export data?</h4>
                  <p>Most modules have an "Export" button that allows Excel, CSV, or Word export with filtering options.</p>
                </div>
              </div>
            )}
          </div>

          {/* Troubleshooting */}
          <div id="troubleshooting" style={sectionStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection("troubleshooting")}>
              <h2 style={sectionTitleStyle}>🛠️ Troubleshooting</h2>
              <span style={toggleIconStyle}>{expandedSections["troubleshooting"] ? "▼" : "▶"}</span>
            </div>
            {expandedSections["troubleshooting"] && (
              <div style={sectionContentStyle}>
                <div style={troubleItemStyle}>
                  <h4>⚠️ Page not loading?</h4>
                  <p>Try refreshing the page or check your internet connection. If the issue persists, contact support.</p>
                </div>
                <div style={troubleItemStyle}>
                  <h4>⚠️ Images not displaying?</h4>
                  <p>Check if you're logged in. Some images require authentication. Clear your browser cache if needed.</p>
                </div>
                <div style={troubleItemStyle}>
                  <h4>⚠️ Real-time updates not working?</h4>
                  <p>Check the online indicator in the top bar. If showing "Offline", refresh the page to reconnect.</p>
                </div>
                <div style={troubleItemStyle}>
                  <h4>⚠️ Can't upload files?</h4>
                  <p>Check file size limits (images: 10MB, videos: 50MB). Ensure you have the required permissions.</p>
                </div>
                <div style={troubleItemStyle}>
                  <h4>⚠️ Bulk operations failing?</h4>
                  <p>Try selecting fewer items at once. Some operations have timeout limits.</p>
                </div>
                <div style={troubleItemStyle}>
                  <h4>⚠️ Getting "Not authorized" error?</h4>
                  <p>Your session may have expired. Log out and log back in. If still happening, check your role permissions.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <p>© {new Date().getFullYear()} ZUCA Portal | Built for Unity & Faith</p>
            <p>Portal Built By | CHRISTECH WEBSYS</p>
            <p>Version 2.0 | Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @media print {
          .glass-effect, .floating-bg, .blob, .nav-container, .search-container, .header-actions {
            display: none !important;
          }
          body, .page-style, .container-style {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .section-content {
            page-break-inside: avoid;
          }
          h2 {
            page-break-after: avoid;
          }
        }
      `}</style>
    </div>
  );
}

// Styles
const pageStyle = {
  minHeight: "100vh",
  backgroundImage: `url(${backgroundImg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  position: "relative",
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "linear-gradient(135deg, rgba(10,10,30,0.92) 0%, rgba(26,0,51,0.92) 100%)",
  zIndex: 0,
};

const containerStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "40px 24px",
  position: "relative",
  zIndex: 1,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "32px",
  flexWrap: "wrap",
  gap: "20px",
};

const titleStyle = {
  fontSize: "clamp(28px, 5vw, 42px)",
  fontWeight: "800",
  color: "white",
  margin: "0 0 8px 0",
  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
};

const subtitleStyle = {
  fontSize: "16px",
  color: "rgba(255,255,255,0.8)",
  margin: 0,
};

const headerActionsStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const downloadGroupStyle = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const formatSelectStyle = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
  color: "white",
  fontSize: "14px",
  cursor: "pointer",
};

const downloadBtnStyle = {
  padding: "10px 20px",
  borderRadius: "10px",
  border: "none",
  background: "#2563eb",
  color: "white",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s",
};

const printBtnStyle = {
  padding: "10px 20px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
  color: "white",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
};

const searchContainerStyle = {
  marginBottom: "32px",
};

const searchInputStyle = {
  width: "100%",
  padding: "14px 20px",
  borderRadius: "50px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
  color: "white",
  fontSize: "16px",
  outline: "none",
  transition: "all 0.2s",
};

const navContainerStyle = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(10px)",
  borderRadius: "20px",
  padding: "24px",
  marginBottom: "32px",
  border: "1px solid rgba(255,255,255,0.1)",
};

const navTitleStyle = {
  color: "white",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px 0",
};

const navGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
  gap: "10px",
};

const navButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "white",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  transition: "all 0.2s",
};

const contentContainerStyle = {};

const sectionStyle = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  marginBottom: "16px",
  border: "1px solid rgba(255,255,255,0.1)",
  overflow: "hidden",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 24px",
  cursor: "pointer",
  transition: "background 0.2s",
};

const sectionTitleStyle = {
  color: "white",
  fontSize: "20px",
  fontWeight: "600",
  margin: 0,
};

const toggleIconStyle = {
  color: "rgba(255,255,255,0.6)",
  fontSize: "18px",
};

const sectionContentStyle = {
  padding: "0 24px 24px 24px",
  color: "rgba(255,255,255,0.9)",
  lineHeight: "1.6",
  animation: "fadeIn 0.3s ease",
};

const roleGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "16px",
  margin: "20px 0",
};

const roleCardStyle = {
  background: "rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "16px",
  textAlign: "center",
  border: "1px solid rgba(255,255,255,0.1)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  margin: "16px 0",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "8px",
  overflow: "hidden",
};

const listStyle = {
  margin: "16px 0",
  paddingLeft: "24px",
};

const tipStyle = {
  background: "rgba(37, 99, 235, 0.2)",
  borderLeft: "4px solid #2563eb",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
};

const warningStyle = {
  background: "rgba(245, 158, 11, 0.2)",
  borderLeft: "4px solid #f59e0b",
  padding: "16px",
  borderRadius: "8px",
  margin: "16px 0",
};

const faqItemStyle = {
  marginBottom: "20px",
  padding: "16px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "12px",
};

const troubleItemStyle = {
  marginBottom: "20px",
  padding: "16px",
  background: "rgba(239, 68, 68, 0.1)",
  borderRadius: "12px",
  borderLeft: "4px solid #ef4444",
};

const footerStyle = {
  textAlign: "center",
  padding: "32px 24px",
  color: "rgba(255,255,255,0.4)",
  fontSize: "13px",
  borderTop: "1px solid rgba(255,255,255,0.1)",
  marginTop: "32px",
};


