// frontend/src/pages/admin/SecurityPage.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiDownload, FiPrinter, FiSearch, FiChevronDown, FiChevronRight,
  FiBookOpen, FiLogIn, FiGrid, FiUsers, FiShield, FiHome, FiImage,
  FiPlay, FiCalendar, FiMusic, FiClock, FiBell, FiDollarSign,
  FiMessageCircle, FiCheckSquare, FiFileText, FiClipboard, FiMessageSquare,
  FiMail, FiAlertTriangle, FiUser, FiZap, FiActivity, FiSend, FiBook,
  FiCamera, FiUserCheck, FiLock, FiHelpCircle, FiTool, FiAward,
  FiCreditCard, FiTrendingUp, FiList, FiMenu, FiSettings, FiUserPlus
} from "react-icons/fi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const BulletList = ({ items }) => (
  <ul style={styles.list}>
    {items.map((item, index) => <li key={index}>{item}</li>)}
  </ul>
);

const DataTable = ({ headers, rows }) => (
  <div style={styles.tableWrap}>
    <table style={styles.table}>
      <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => (
        <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
      ))}</tbody>
    </table>
  </div>
);

const Detail = ({ label, children }) => (
  <div style={styles.detailRow}>
    <strong>{label}</strong>
    <div>{children}</div>
  </div>
);

const Path = ({ children }) => <p style={styles.path}><strong>Path:</strong> <code>{children}</code></p>;

const roleItems = [
  { title: "Administrator", icon: <FiShield />, description: "Full system access, user and role management, all modules." },
  { title: "Treasurer", icon: <FiDollarSign />, description: "Contributions, pledges, treasury reports, bank payments." },
  { title: "Secretary", icon: <FiFileText />, description: "Announcements, minutes, schedules, semester registration, feedback." },
  { title: "Choir Moderator", icon: <FiMusic />, description: "Mass programs, hymns, pending songs, OCR scanner." },
  { title: "Media Moderator", icon: <FiImage />, description: "Media gallery and YouTube analytics." },
  { title: "Jumuia Leader", icon: <FiHome />, description: "Assigned Jumuia membership management." }
];

function SectionBody({ id }) {
  switch (id) {
    case "overview":
      return <>
        <p>The ZUCA Portal is a management system for Zetech University Catholic Action. The sidebar in the admin layout determines which modules are visible. Roles are:</p>
        <div style={styles.roleGrid}>
          {roleItems.map((role) => <div style={styles.roleCard} key={role.title}>
            <div style={styles.roleIcon}>{role.icon}</div>
            <h4>{role.title}</h4><p>{role.description}</p>
          </div>)}
        </div>
      </>;
    case "getting-started":
      return <>
        <DataTable headers={["Method", "How to use", "Who can use"]} rows={[
          ["Standard login", "Email and password", "All users"],
          ["Role login", "Email and role password", "Users with an assigned special role"]
        ]} />
        <div style={styles.warning}>Role logins only work if the special role has been assigned by an administrator.</div>
      </>;
    case "dashboard":
      return <>
        <Path>/admin (Home View in sidebar)</Path>
        <Detail label="Page controls">Refresh button, Exit button, stat cards, quick action buttons, charts, recent users list, pending approvals list, activity log, executive team summary, system health block.</Detail>
        <Detail label="Stat cards">Total Users, Announcements, Total Pledges, Mass Programs, Hymns, Manage Countdown.</Detail>
        <Detail label="Quick actions">Meeting Minutes, Attendance sheet, Attendance Monitor, Users Management, Announcements, Mass Programs, Pledges Management, Hymns Management, Gallery Management, Executive Team, Calendar Admin, Prayer Management, Admin Chat, Bank Payments, System Analysis, Countdown Settings, Birthday Management.</Detail>
        <p><strong>Tables:</strong> None. Charts are rendered with Chart.js.</p>
      </>;
    case "users":
      return <>
        <Path>/admin/users</Path>
        <Detail label="Controls">Export dropdown (Excel, Word), Refresh button, search input, role filter (<code>all</code>, <code>admin</code>, <code>member</code>), status filter (<code>all</code>, <code>online</code>, <code>offline</code>), bulk delete, view button, promote button, demote button, delete button.</Detail>
        <Detail label="Table columns">Checkbox, User, Membership #, Email, Phone, Role, Special Role, Home Jumuia, Leading Jumuia, Status, Actions.</Detail>
        <Detail label="User modal">Full name, email, membership number, user id, role, special role, home Jumuia, leading Jumuia, online status, member since. Buttons: Make Admin or Make Member, Delete User.</Detail>
        <Detail label="Toast strings">"Copied to clipboard", "Failed to load users", "{name} deleted", "Delete failed", "{name} is now {role}", "Role change failed", "No users selected", "{n} users deleted", "Failed to delete some users", "Exported {n} users".</Detail>
      </>;
    case "roles":
      return <>
        <Path>/admin/roles</Path>
        <Detail label="Controls">Search input, filter toggle, view toggle (grid or list), section toggles for "Users with Special Roles", "Administrators", "Regular Members", "All Users", Save Changes button per user card, and a Jumuia selector that appears when the special role is <code>jumuia_leader</code>.</Detail>
        <Detail label="Special roles available">Administrator, Jumuia Leader, Treasurer, Secretary, Choir Moderator, Media Moderator.</Detail>
      </>;
    case "jumuia":
      return <>
        <Path>/admin/jumuia-management</Path>
        <Detail label="Controls">Download Report (PDF or Word per Jumuia or full report), New Jumuia, search members, role filter, Bulk Mode toggle, View Full Page per group, Show or Hide members, Activate or Deactivate group, Move member dropdown, Remove button, Clear button.</Detail>
        <Detail label="New Jumuia modal">Name, Description, Location.</Detail>
      </>;
    case "media":
      return <>
        <Path>/admin/media</Path>
        <Detail label="Controls">Refresh, Upload Media, media player (play, pause, seek, volume, mute, loop, fullscreen), like, comment, download, share, edit, delete, bulk select, view toggle grid or list.</Detail>
        <Detail label="Upload modal">File picker, Caption or Description, Category (uncategorized, choir, mass, events, teachings, retreats), Tags, Feature this media checkbox, Make public checkbox.</Detail>
        <p>Upload queue shows per-file progress and overall progress.</p>
      </>;
    case "youtube":
      return <>
        <Path>/admin/analytics</Path>
        <Detail label="Controls">Refresh, Export, chart period toggle 7D, 30D, 90D, category filters (All Videos, Mass Programs, Choir, Events, Teachings), search input, video player, share buttons (WhatsApp, Facebook, Twitter), pagination.</Detail>
        <Detail label="Stat cards">Subscribers, Total Views, Total Videos, Total Likes, Comments, Shares.</Detail>
      </>;
    case "songs":
      return <>
        <Path>/admin/songs</Path>
        <Detail label="Controls">New Program, Refresh, Saved drafts panel, search programs, venue filter, edit, delete, download Word, download PDF, download image, full booklet (red PDF icon).</Detail>
        <Detail label="Program form">Date, Venue, and a song slot list per liturgy part: Entrance Hymn, Mass Hymn, Bible Reading, Offertory Hymn, Procession Hymn, Mtakatifu Hymn, Sign of Peace, Communion Hymn, Thanksgiving Hymn, Exit Hymn. Maximum 10 songs per field.</Detail>
        <Detail label="Toast strings">"Draft loaded", "Draft restored", "Failed to load draft", "Draft deleted", "Draft cleared", "Program created successfully", "Program updated successfully", "Program deleted", "Failed to delete program", "No songs found matching \"{}\"", "Maximum 10 songs per field".</Detail>
      </>;
    case "hymns":
      return <>
        <Path>/admin/hymns</Path>
        <Detail label="Controls">Add Hymn, Scan, Pending, Process All, Bold, select all, bulk mode, view toggle, list grid toggle, stats toggle, search, filter (<code>all</code>, <code>withRef</code>, <code>noRef</code>, <code>hasLyrics</code>), edit, delete, load more.</Detail>
        <Detail label="Add Hymn form">Title (required), Reference, Lyrics.</Detail>
        <Detail label="Toolbar actions">Show or Hide Preview, Clean Formatting, Bold Repeated Lines, Capitalize Title, Insert Sample, font size A-/A+.</Detail>
        <div style={styles.tip}>Lines repeated three or more times are bolded when Bold Repeated Lines is clicked.</div>
      </>;
    case "pending-songs":
      return <>
        <Path>/admin/pending-songs</Path>
        <Detail label="Controls">Add Lyrics per pending song (opens the edit hymn page with <code>pendingId</code> query param), Delete per pending song.</Detail>
        <div style={styles.tip}>All caught up! No pending songs need lyrics</div>
      </>;
    case "announcements":
      return <>
        <Path>/admin/announcements</Path>
        <Detail label="Tabs">Announcements, Schedules, Minutes, History.</Detail>
        <Detail label="Announcements tab controls">Search, category filter, New Announcement, edit, delete, viewer avatar list.</Detail>
        <Detail label="New Announcement fields">Title, Category (General, Mass, Event, Urgent, Reminder), Content.</Detail>
        <div style={styles.warning}>Delete Announcement. Are you sure you want to delete this announcement? This action cannot be undone.</div>
      </>;
    case "contributions":
      return <>
        <Path>/admin/contributions</Path>
        <Detail label="Controls">Notes and Calculator button, View Treasury Reports button, Export Data (Excel, CSV, Document), search, campaign selection, bulk delete campaigns, bulk duplicate campaigns, Generate Link per campaign, member search, status tabs (All, Pending, Approved, Partial, Completed), bulk approve, delete campaign.</Detail>
        <Detail label="Per pledge actions">Approve, Add amount, Reset, Message.</Detail>
        <Detail label="Payment link modal">URL, Copy button, Share on WhatsApp, Share via Email.</Detail>
        <Detail label="Status labels">PENDING, APPROVED, COMPLETED, PARTIALLY PAID, NO PLEDGE.</Detail>
      </>;
    case "chat":
      return <>
        <Path>/admin/chat or /admin/chat-monitor</Path>
        <Detail label="Controls">Auto-refresh toggle, refresh, search messages, filter by user, message actions (reply, copy, edit, pin, delete, mute or unmute), bulk select, export to CSV, date range picker, media preview, file attachments, emoji picker, send message.</Detail>
        <div style={styles.tip}>Message actions are accessed by long-press on mobile and right-click on desktop.</div>
      </>;
    case "attendance":
      return <>
        <Detail label="Paths">/admin/attendance (sheet list); /admin/attendance/sheet/:sheetId (details); /admin/attendance/add-member/:sheetId (add member page); /admin/attendance/overview (all-members overview); /admin/attendance/member/:userId (member detail).</Detail>
        <Detail label="Create sheet modal">Title, Description, Event date, Start time, Location, Target audience (All Members, Leaders only, or a Jumuia), Self check-in toggle, QR code check-in toggle, Category name, Category options, Category required, WhatsApp auto-send toggle, group selection, custom message, send on check-in, send on close.</Detail>
        <Detail label="Sheet action buttons">View, Add Single, Bulk Add, Remind All, Share Link, QR Code, Settings or Edit, Export, Delete, Close. Past sheets support Reopen.</Detail>
        <Detail label="Share link modal">Expiry in days, max uses, Generate shareable link, Copy, Share on WhatsApp, existing links list, Delete link.</Detail>
        <Detail label="Remind modal">Recipient option (All Absent Members, Selected Members Only, Custom List), quick templates (Urgent, Gentle, Reminder, Finance), message body, preview, Send Reminders.</Detail>
        <Detail label="Add Member page">Two modes — Add One by One and Bulk Add Multiple. Bulk mode accepts free text; phone numbers are auto-detected and existing ZUCA accounts are auto-filled. A progress bar is shown during bulk add. Autosave drafts are supported.</Detail>
        <p><strong>Export options:</strong> Full report, present only, absent only.</p>
      </>;
    case "minutes":
      return <>
        <Detail label="Paths">/admin/minutes (list), /admin/minutes/create, /admin/minutes/edit/:id, /admin/minutes/:id (view).</Detail>
        <Detail label="List controls">New Minutes, search, type filter (All Types, Executive, Jumuia), status filter (All Status, Approved, Draft), view, edit, publish, delete. Stats: Total Minutes, Published, Drafts.</Detail>
        <Detail label="Create page">Choose attendance sheet, then fill Agenda, Preliminaries, Sections (each section has number, title, content, decisions), AOB (title, content), Adjournment. Live indicator shows how many members are checked in and offers Sync Now. Save Draft is available. Preview mode toggles.</Detail>
        <Detail label="View page">Print, PDF, Word downloads. Live indicator with Sync Now.</Detail>
        <div style={styles.tip}>Section numbering uses the format <code>MIN NN/MM</code>, where MM is the current month number. PRELIMINARIES is <code>MIN 01/MM</code>; AOB and Adjournment continue the numbering.</div>
      </>;
    case "schedules":
      return <>
        <Path>/admin/schedules</Path>
        <Detail label="Controls">New Schedule, Drafts (count), Notifications (count), search, delete schedule, edit schedule, view schedule, download PDF, image, Word.</Detail>
        <Detail label="Tabs">Structured Mode, Free Mode. Free Mode includes an Upload Image to Extract Schedule button that runs OCR.</Detail>
        <Detail label="Structured form fields">Schedule Title, Semester Start, Semester End, general information bullets, sections with title and table rows (Date, Event/Leading), free text per section, additional notes, Publish immediately checkbox.</Detail>
        <p><strong>Save actions:</strong> Save as Draft, Publish Schedule or Update Schedule.</p>
      </>;
    case "semester":
      return <>
        <Path>/admin/semesters</Path>
        <Detail label="Tabs">Roster, Share, Google Sheet, Controls, WhatsApp, Notifications.</Detail>
        <Detail label="Roster">Search member, Register a member, remove member.</Detail>
        <Detail label="Share">Copy link, Share on WhatsApp, Native share.</Detail>
        <Detail label="Google Sheet">Bot email (copy), paste Google Sheet link, toggle update on register, toggle update on close, Save settings, Push roster now, Open current sheet.</Detail>
        <Detail label="Controls">Open Registration, Close Registration, Resend Notifications, Export as Excel, PDF, Word, CSV.</Detail>
        <Detail label="WhatsApp">Enable auto-send, send on register, send on close, group selection, custom message with placeholders <code>{"{list}"}</code>, <code>{"{total}"}</code>, <code>{"{semester}"}</code>, <code>{"{link}"}</code>, Save, Send roster.</Detail>
        <Detail label="Notifications">Push and email toggles for open and register events.</Detail>
      </>;
    case "feedback":
      return <>
        <Path>/admin/feedback; detail page: /admin/feedback/:id</Path>
        <Detail label="List controls">Refresh, search, Show or Hide filters, type filter (All, Feedback, Complaint, Suggestion, Bug report), status filter (Total, Pending, In review, Resolved, Closed, Rejected), status dropdown per item, View details, Delete.</Detail>
        <Detail label="Detail page">Edit status, admin response, Delete. Attachments are listed with download links.</Detail>
      </>;
    case "email":
      return <>
        <Path>/admin/email (dashboard); /admin/email-settings (email management)</Path>
        <Detail label="Email Dashboard tabs">Overview, Campaigns, Users, Settings, Analytics.</Detail>
        <Detail label="Overview controls">Search, event type filter, date filter (today, week, month, all), sort (latest, oldest, email), Export, view mode toggle, activity feed, all events table with view history and re-subscribe on unsubscribe rows.</Detail>
        <Detail label="Settings tab">Emergency mode toggle and per-type email controls.</Detail>
        <div style={styles.warning}>Only password reset and verification emails are being sent.</div>
        <Detail label="Email Management page">Category sections with per-type toggle and "Turn all on" / "Turn all off" per category. Reset all button. Stats: Total types, Enabled, Disabled, Categories, Emails sent.</Detail>
      </>;
    case "whatsapp":
      return <>
        <Path>/admin/whatsapp; Message History: /admin/message-history</Path>
        <Detail label="Tabs">Messages, AI Assistant, Overview, Groups.</Detail>
        <Detail label="Messages tab">Default group ID input with Set button, Send to default group textarea with Send button, Send to specific group selector with Send button, Broadcast to groups textarea with Broadcast button.</Detail>
        <div style={styles.warning}>The broadcast warning reads: "Sends to all N active groups".</div>
        <Detail label="Overview tab">Status bar, status grid (Bot number, Default group, Connection, Reconnect attempts, Total groups, Active groups, Last error), Link WhatsApp button when disconnected, Unlink button when connected, QR code panel with three scan steps.</Detail>
        <Detail label="Groups tab">Refresh groups, group cards with Show members or Hide members, Activate or Deactivate.</Detail>
        <Detail label="Message History">Tabs Broadcasts and Normal Messages, search, filter by type, Clear All option with confirmation typing <code>DELETE_ALL</code>, copy, edit, soft delete, permanent delete. Messages older than 15 minutes cannot be edited.</Detail>
      </>;
    case "advertisements":
      return <>
        <Path>/admin/advertisements</Path>
        <Detail label="Controls">Clean expired, Refresh, New advertisement, search, filter (All, Active, Scheduled, Expired, Inactive), sort by (Recent, Title A-Z, Title Z-A, status variants, start date, end date), row menu (Edit, Activate or Deactivate, Delete), Edit, Open link.</Detail>
        <Detail label="New or Edit advertisement form">Advertisement image (PNG, JPG, WEBP, max 10MB), Title, Description, Button text, Button link (select from portal pages or custom), Start date and time, End date and time, Advertisement active toggle.</Detail>
      </>;
    case "ticker":
      return <>
        <Path>/admin/ticker</Path>
        <Detail label="Controls">New Ticker, edit, pause or resume, delete.</Detail>
        <Detail label="Ticker form fields">Message text (required), Title (for push notification), Style (Rotate, Scroll, Static), Color (six presets plus custom color picker), Link destination (portal page list or custom URL), Link text, Target (Everyone, By role, Specific users), Priority 1-10, Jumuia (optional), Start at, End at, Dismissible, Require "I understand", Also send push notification, Active. A live preview bar is shown below the form.</Detail>
      </>;
    case "countdown":
      return <>
        <Path>/admin/countdown-settings</Path>
        <Detail label="Controls">Active toggle, Event title, Subtitle, Target date and time, Icon grid, Event color (picker plus presets), Save changes.</Detail>
        <p>Live preview shows the countdown exactly as visitors see it.</p>
      </>;
    case "birthdays":
      return <>
        <Path>/admin/birthday</Path>
        <Detail label="Tabs">Birthdays, Settings, WhatsApp.</Detail>
        <Detail label="Birthdays tab">Sub-tabs Today and All. Today tab has Process all and per-member Process or Delete ad. All tab has search, sort, edit, opt in or out, process, delete advert, clear birthday data.</Detail>
        <Detail label="Add or Edit birthday modal">Opt in checkbox, Birthday date, Birthday photo (auto-cropped to 16:9), Personal message.</Detail>
        <Detail label="Settings tab">Auto-create adverts, Send push notifications, Send to WhatsApp groups toggles.</Detail>
        <Detail label="WhatsApp tab">Group selection, Save WhatsApp groups.</Detail>
        <div style={styles.tip}>The birthday photo is automatically converted to 16:9.</div>
      </>;
    case "ai":
      return <>
        <p><strong>Component:</strong> <code>AdminAIAssistant.jsx</code>. Opened from the header "AI" button.</p>
        <Detail label="Capabilities in the welcome message">Users (list, find, delete, promote), executives (show team, assign, remove), campaigns (create, list), announcements (create, list), schedules (build from pasted text), gallery (list, delete), YouTube stats, system stats and health.</Detail>
        <Detail label="Controls">Send message, voice input, attach file, quick actions, export chat, clear chat, full screen toggle, close.</Detail>
      </>;
    case "health":
      return <>
        <Path>/admin/health-centre</Path>
        <Detail label="Tabs">Overview, Services, Logs, Data and Storage, Developer Services.</Detail>
        <Detail label="Header controls">Auto ON or Auto OFF, Export, Clear.</Detail>
        <Detail label="Overview">System Health score, Security Posture score, stat tiles (Uptime, Memory, Errors, Online, Requests, Connections), error trend chart, slowest endpoints chart, issue cards (Password resets, Pending verifications, Failed logins).</Detail>
        <Detail label="Services">Per-service status with Test button for email and YouTube.</Detail>
        <Detail label="Logs">Error list (click a row for detail modal), slow requests, user reports with Resolve button.</Detail>
        <Detail label="Data and Storage">Storage used, total files, file type counts, database statistics, recent logins.</Detail>
        <Detail label="Developer Services">Add, edit, delete services with fields Slug, Name, Description, Service URL, Docs URL, Icon, Category, Order, Mark as primary, Login email, Vault link, Last rotated, Notes.</Detail>
      </>;
    case "messenger":
      return <>
        <Path>/admin/messenger</Path>
        <Detail label="Layout">Left column: chat list with New Chat button. Right column: selected conversation, info drawer, back button on mobile.</Detail>
      </>;
    case "prayers":
      return <>
        <Path>/admin/prayers</Path>
        <Detail label="Controls">Refresh, New Prayer, search, category filter (All categories, Daily, Marian, Saints, Rosary, Other, Novena, Liturgical, Angelic, Creed), row menu (Edit, Delete), pagination.</Detail>
        <Detail label="New or Edit prayer modal">Title (required), Category, Language (English, Kiswahili, Latin), Prayer content (required), Display order, Active checkbox.</Detail>
      </>;
    case "ocr":
      return <>
        <Path>/admin/ocr-scanner</Path>
        <p>Also reachable from the Add Hymn page via the Scan Lyrics button.</p>
        <Detail label="Tabs">Scan Lyrics, Assistant.</Detail>
        <Detail label="Scan flow">Upload Image or Take Photo, Crop to lyrics area (Rotate, Skip Crop, Apply Crop), Extract Lyrics, then edit.</Detail>
        <Detail label="Edit tools">Clean, Bold Chorus, Capitalize, Add Numbers, Remove Numbers, Fix OCR, Remove Dups, Copy.</Detail>
        <p><strong>Actions:</strong> Start Over, Save to Hymn Book. A confidence percentage is displayed after extraction.</p>
      </>;
    case "executive":
      return <>
        <Path>/admin/executive</Path>
        <Detail label="Tabs">Position Management, Current Team, Analytics.</Detail>
        <Detail label="Controls">Bulk Actions toggle, Select All, Assign Selected, Remove Selected, Add Position, Export Excel, Export Word, Refresh, search, status filter (All, Filled, Vacant), category collapse toggle, Assign, Edit Contact, Remove, Delete department (only for custom categories).</Detail>
        <Detail label="Add Position modal">Position Title (required), Category (required), Level (required, 1 = highest), Description (optional).</Detail>
      </>;
    case "bank-payments":
      return <>
        <Path>/admin/bank-payments</Path>
        <p>This page is rendered through the sidebar Finance section. Refer to the page itself for the exact field layout.</p>
      </>;
    case "treasury":
      return <>
        <Path>/treasurer/reports</Path>
        <p>This route opens the treasurer reports page from the Finance section. Refer to the page itself for the exact layout.</p>
      </>;
    case "faq":
      return <>
        {[
          ["How do I assign a special role to a user?", "Go to Role Management, find the user, select the special role from the dropdown, and click Save Changes."],
          ["Why can a user not log in with role credentials?", "Ensure the user has been assigned that special role and is using the correct password format."],
          ["How do I delete multiple users at once?", "In User Management, enable bulk mode, select users, and click Delete."],
          ["How do I approve a pledge?", "Go to Contributions, expand the campaign, find the member, and click Approve."],
          ["Why are repeated hymn lines not bolded?", "On the Hymns page, open the hymn, click Bold Repeated Lines. Only lines repeated three or more times are bolded."],
          ["Why does bulk add not auto-fill a member?", "The phone number in the bulk text must match the phone number on the member's ZUCA account."],
          ["Why can I not edit a WhatsApp message?", "Messages older than 15 minutes can no longer be edited."],
          ["How do I activate a semester?", "On the Attendance Overview page, open Manage, then choose Activate on the semester you want to make current."]
        ].map(([question, answer]) => <div style={styles.faqItem} key={question}><h4>{question}</h4><p>{answer}</p></div>)}
      </>;
    case "troubleshooting":
      return <>
        {[
          ["Page not loading.", "Refresh the page and check the internet connection."],
          ["Images not displaying.", "Clear the browser cache and confirm the session is still active."],
          ["Upload not accepted.", "Confirm the file type and size limits (images 10MB, videos 50MB in the media module, advertisement images 10MB)."],
          ["Not authorized error.", "The session may have expired. Log out and log in again."],
          ["Sheet shows no members.", "Confirm the target audience and that members are registered in the selected Jumuia."],
          ["Bulk add has no auto-fill.", "The phone number in the bulk text does not match any ZUCA account."],
          ["Countdown not visible on the portal.", "Confirm the Active toggle is on in Countdown Settings."],
          ["Announcement viewer count not updating.", "Views are recorded when members open the announcement, not when it is listed."]
        ].map(([problem, solution]) => <div style={styles.troubleItem} key={problem}><h4>{problem}</h4><p>{solution}</p></div>)}
      </>;
    default:
      return null;
  }
}

const sections = [
  { id: "overview", title: "Overview", icon: <FiBookOpen />, description: "System overview and user roles" },
  { id: "getting-started", title: "Getting Started", icon: <FiLogIn />, description: "Login methods and setup" },
  { id: "dashboard", title: "Dashboard", icon: <FiGrid />, description: "Admin dashboard overview" },
  { id: "users", title: "User Management", icon: <FiUsers />, description: "Manage all system users" },
  { id: "roles", title: "Role Management", icon: <FiShield />, description: "Assign special roles" },
  { id: "jumuia", title: "Jumuia Management", icon: <FiHome />, description: "Manage Jumuia groups" },
  { id: "media", title: "Media Management", icon: <FiImage />, description: "Upload and manage media" },
  { id: "youtube", title: "YouTube Analytics", icon: <FiPlay />, description: "Monitor channel analytics" },
  { id: "songs", title: "Mass Program", icon: <FiCalendar />, description: "Create and manage mass programs" },
  { id: "hymns", title: "Hymn Book", icon: <FiMusic />, description: "Manage hymn lyrics" },
  { id: "pending-songs", title: "Pending Songs", icon: <FiClock />, description: "Songs needing lyrics" },
  { id: "announcements", title: "Announcements", icon: <FiBell />, description: "Create and manage announcements" },
  { id: "contributions", title: "Contributions", icon: <FiDollarSign />, description: "Manage pledges and payments" },
  { id: "chat", title: "Chat Monitor", icon: <FiMessageCircle />, description: "Moderate public chat" },
  { id: "attendance", title: "Attendance", icon: <FiCheckSquare />, description: "Create and manage attendance sheets" },
  { id: "minutes", title: "Minutes", icon: <FiFileText />, description: "Create and manage meeting minutes" },
  { id: "schedules", title: "Schedules", icon: <FiCalendar />, description: "Manage semester schedules" },
  { id: "semester", title: "Semester Registration", icon: <FiClipboard />, description: "Manage club registration" },
  { id: "feedback", title: "Feedback Management", icon: <FiMessageSquare />, description: "Review member feedback" },
  { id: "email", title: "Email", icon: <FiMail />, description: "Control outbound email" },
  { id: "whatsapp", title: "WhatsApp Bot", icon: <FiMessageCircle />, description: "Manage WhatsApp integration" },
  { id: "advertisements", title: "Advertisements", icon: <FiImage />, description: "Manage portal advertisements" },
  { id: "ticker", title: "Header Notices", icon: <FiAlertTriangle />, description: "Manage scrolling header notices" },
  { id: "countdown", title: "Countdown Settings", icon: <FiClock />, description: "Configure the countdown widget" },
  { id: "birthdays", title: "Birthday Management", icon: <FiUser />, description: "Manage birthday adverts" },
  { id: "ai", title: "AI Assistant", icon: <FiZap />, description: "Admin AI assistant" },
  { id: "health", title: "System Monitor", icon: <FiActivity />, description: "Backend health and monitoring" },
  { id: "messenger", title: "Messenger", icon: <FiSend />, description: "Admin messenger" },
  { id: "prayers", title: "Prayer Settings", icon: <FiBook />, description: "Manage the prayer library" },
  { id: "ocr", title: "OCR Scanner", icon: <FiCamera />, description: "Scan hymn lyrics from photos" },
  { id: "executive", title: "Executive Team", icon: <FiAward />, description: "Manage executive positions" },
  { id: "bank-payments", title: "Bank Payments", icon: <FiCreditCard />, description: "Manage bank payment records" },
  { id: "treasury", title: "Treasury Report", icon: <FiTrendingUp />, description: "Financial reporting" },
  { id: "faq", title: "FAQ", icon: <FiHelpCircle />, description: "Frequently asked questions" },
  { id: "troubleshooting", title: "Troubleshooting", icon: <FiTool />, description: "Common issues and fixes" }
];

export default function SecurityPage() {
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadFormat, setDownloadFormat] = useState("html");

  const toggleSection = (sectionId) => {
    setExpandedSections((previous) => ({ ...previous, [sectionId]: !previous[sectionId] }));
  };

  const filteredSections = sections.filter((section) =>
    `${section.title} ${section.id} ${section.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadAsHTML = () => {
    const content = document.getElementById("manual-content")?.innerHTML || "";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ZUCA Portal - Admin User Manual</title>
      <style>
        body{font-family:Arial,sans-serif;max-width:1200px;margin:0 auto;padding:32px;color:#1e293b;line-height:1.6}
        h1{color:#123665;border-bottom:2px solid #123665;padding-bottom:12px}
        h2{color:#123665;background:#f1f5f9;padding:12px;border-radius:8px}
        table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #cbd5e1;padding:9px;text-align:left}
        th{background:#e2e8f0}.role-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .role-card{border:1px solid #cbd5e1;padding:12px;border-radius:8px}.warning{background:#fff7ed;padding:12px}
      </style></head><body><h1>ZUCA Portal - Admin User Manual</h1>${content}</body></html>`;
    saveAs(new Blob([html], { type: "text/html;charset=utf-8" }), `zuca-admin-manual-${new Date().toISOString().slice(0, 10)}.html`);
  };

  const downloadAsPDF = () => window.print();

  const downloadAsDOC = () => {
    const content = document.getElementById("manual-content")?.innerHTML || "";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ZUCA Portal - Admin User Manual</title>
      <style>body{font-family:"Times New Roman",serif;margin:1in;line-height:1.5}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #777;padding:7px;text-align:left}</style></head><body><h1>ZUCA Portal - Admin User Manual</h1>${content}</body></html>`;
    saveAs(new Blob([html], { type: "application/msword" }), `zuca-admin-manual-${new Date().toISOString().slice(0, 10)}.doc`);
  };

  const handleDownload = () => {
    if (downloadFormat === "html") downloadAsHTML();
    else if (downloadFormat === "pdf") downloadAsPDF();
    else if (downloadFormat === "doc") downloadAsDOC();
  };

  const openSection = (sectionId) => {
    setExpandedSections((previous) => ({ ...previous, [sectionId]: true }));
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={styles.container} className="security-manual-container">
      <div style={styles.header} className="manual-header">
        <div>
          <h1 style={styles.title}>Admin User Manual</h1>
          <p style={styles.subtitle}>Complete guide for administrators and moderators</p>
        </div>
        <div style={styles.headerActions} className="header-actions">
          <div style={styles.downloadGroup}>
            <select aria-label="Download format" value={downloadFormat} onChange={(event) => setDownloadFormat(event.target.value)} style={styles.formatSelect}>
              <option value="html">HTML</option>
              <option value="pdf">PDF (Print)</option>
              <option value="doc">Word Document</option>
            </select>
            <button type="button" onClick={handleDownload} style={styles.downloadBtn}><FiDownload size={16} /> Download</button>
          </div>
          <button type="button" onClick={() => window.print()} style={styles.printBtn}><FiPrinter size={16} /> Print</button>
        </div>
      </div>

      <div style={styles.searchContainer} className="search-container">
        <FiSearch size={18} style={styles.searchIcon} />
        <input type="search" placeholder="Search manual sections..." value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)} style={styles.searchInput} />
      </div>

      <nav style={styles.navContainer} className="nav-container" aria-label="Manual quick navigation">
        <h3 style={styles.navTitle}>Quick Navigation</h3>
        <div style={styles.navGrid} className="nav-grid">
          {filteredSections.map((section) => (
            <button type="button" key={section.id} onClick={() => openSection(section.id)} style={styles.navButton}>
              <span style={styles.navIcon}>{section.icon}</span>
              <span><span style={styles.navButtonTitle}>{section.title}</span><span style={styles.navButtonDesc}>{section.description}</span></span>
            </button>
          ))}
          {filteredSections.length === 0 && <p style={styles.emptyState}>No manual sections match your search.</p>}
        </div>
      </nav>

      <main id="manual-content" style={styles.contentContainer}>
        {filteredSections.map((section) => {
          const expanded = Boolean(expandedSections[section.id]);
          return (
            <section id={section.id} key={section.id} style={styles.section} className="manual-section">
              <button type="button" style={styles.sectionHeader} className="section-header"
                onClick={() => toggleSection(section.id)} aria-expanded={expanded}>
                <span style={styles.sectionTitleRow}>
                  <span style={styles.sectionIcon}>{section.icon}</span>
                  <span style={styles.sectionTitle}>{section.title}</span>
                </span>
                <span style={styles.toggleIcon}>{expanded ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}</span>
              </button>
              <AnimatePresence initial={false}>
                {expanded && <motion.div style={styles.sectionContent} className="section-content"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                  <SectionBody id={section.id} />
                </motion.div>}
              </AnimatePresence>
            </section>
          );
        })}
        <footer style={styles.footer}>
          <p>© {new Date().getFullYear()} ZUCA Portal | Built for Unity &amp; Faith</p>
          <p>Portal Built By | CHRISTECH WEBSYS</p>
          <p>Version 2.0 | Last Updated: {new Date().toLocaleDateString()}</p>
        </footer>
      </main>

      <style>{`
        @media print {
          .search-container,.nav-container,.header-actions {display:none!important}
          .manual-section {break-inside:avoid;border:1px solid #cbd5e1;margin-bottom:12px}
          .section-content {height:auto!important;opacity:1!important;overflow:visible!important;display:block!important}
          .section-header {background:#f1f5f9!important}
          body {background:#fff!important}
        }
        @media (max-width:768px) {
          .security-manual-container {padding:14px!important;margin-top:12px!important}
          .manual-header {flex-direction:column!important;align-items:stretch!important}
          .header-actions {justify-content:flex-start!important}
          .nav-grid {grid-template-columns:1fr!important}
          .role-grid {grid-template-columns:1fr!important}
          .section-title {font-size:16px!important}
          .section-content {padding:16px!important}
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f8fafc", padding: "24px", marginTop: "30px", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1e293b" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" },
  title: { fontSize: "28px", fontWeight: "700", color: "#123665", margin: "0 0 6px 0" },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  headerActions: { display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" },
  downloadGroup: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  formatSelect: { padding: "9px 13px", borderRadius: "9px", border: "1px solid #dbe2ea", background: "#fff", color: "#1e293b", fontSize: "13px", cursor: "pointer" },
  downloadBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", padding: "9px 16px", borderRadius: "9px", border: "none", background: "#123665", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  printBtn: { display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px", borderRadius: "9px", border: "1px solid #dbe2ea", background: "#fff", color: "#334155", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  searchContainer: { position: "relative", marginBottom: "24px" },
  searchIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" },
  searchInput: { boxSizing: "border-box", width: "100%", padding: "12px 16px 12px 44px", borderRadius: "10px", border: "1px solid #dbe2ea", background: "#fff", fontSize: "14px", outline: "none" },
  navContainer: { background: "#fff", borderRadius: "14px", padding: "20px", marginBottom: "24px", border: "1px solid #e2e8f0" },
  navTitle: { fontSize: "15px", fontWeight: "700", color: "#123665", margin: "0 0 14px" },
  navGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "9px" },
  navButton: { display: "flex", alignItems: "center", gap: "11px", padding: "11px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", textAlign: "left", color: "#334155", minWidth: 0 },
  navIcon: { display: "flex", alignItems: "center", justifyContent: "center", color: "#123665", flexShrink: 0, fontSize: "19px" },
  navButtonTitle: { display: "block", fontSize: "13px", fontWeight: "650", color: "#1e293b" },
  navButtonDesc: { display: "block", fontSize: "11px", color: "#64748b", marginTop: "3px" },
  contentContainer: { display: "flex", flexDirection: "column", gap: "11px" },
  section: { background: "#fff", borderRadius: "13px", border: "1px solid #e2e8f0", overflow: "hidden", scrollMarginTop: "24px" },
  sectionHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "16px 19px", cursor: "pointer", backgroundColor: "#fff", border: 0, textAlign: "left" },
  sectionTitleRow: { display: "flex", alignItems: "center", gap: "9px", minWidth: 0 },
  sectionIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#123665", fontSize: "19px", flexShrink: 0 },
  sectionTitle: { fontSize: "16px", fontWeight: "650", color: "#1e293b", margin: 0 },
  toggleIcon: { display: "inline-flex", color: "#64748b", flexShrink: 0 },
  sectionContent: { padding: "18px 20px 20px", color: "#334155", fontSize: "13px", lineHeight: 1.65, overflow: "hidden", borderTop: "1px solid #eef2f6" },
  roleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "11px", margin: "17px 0 4px" },
  roleCard: { background: "#f8fafc", borderRadius: "10px", padding: "14px", textAlign: "left", border: "1px solid #e2e8f0" },
  roleIcon: { display: "flex", color: "#123665", fontSize: "22px", marginBottom: "8px" },
  tableWrap: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", margin: "12px 0", fontSize: "12px", textAlign: "left" },
  list: { margin: "12px 0", paddingLeft: "20px" },
  tip: { background: "#eff6ff", borderLeft: "3px solid #315f91", padding: "12px 14px", borderRadius: "7px", margin: "14px 0" },
  warning: { background: "#fff7ed", borderLeft: "3px solid #c47b28", padding: "12px 14px", borderRadius: "7px", margin: "14px 0" },
  faqItem: { marginBottom: "10px", padding: "13px 14px", background: "#f8fafc", border: "1px solid #e8edf3", borderRadius: "9px" },
  troubleItem: { marginBottom: "10px", padding: "13px 14px", background: "#fffaf5", borderRadius: "9px", border: "1px solid #f1e5d8", borderLeft: "3px solid #c47b28" },
  footer: { textAlign: "center", padding: "22px", color: "#94a3b8", fontSize: "11px", borderTop: "1px solid #e2e8f0", marginTop: "12px" },
  inlineIcon: { display: "inline-flex", alignItems: "center", verticalAlign: "middle" },
  detailRow: { display: "grid", gridTemplateColumns: "minmax(145px, 190px) minmax(0,1fr)", gap: "12px", padding: "9px 0", borderBottom: "1px solid #f1f5f9" },
  path: { marginTop: 0, color: "#475569" },
  emptyState: { color: "#64748b", fontSize: "13px", gridColumn: "1 / -1" }
};
