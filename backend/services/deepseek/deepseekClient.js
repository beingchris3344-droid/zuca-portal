// ================== GROQ AI CLIENT SETUP ==================
const OpenAI = require("openai");

// ================== KNOWLEDGE GRAPH LOADER ==================
const fs = require('fs');
const path = require('path');

let cachedGraph = null;

function getSystemGraph() {
  if (cachedGraph) return cachedGraph;
  
  try {
    // Go up from services/deepseek/ to backend/ then into knowledge/
    const backendPath = path.join(__dirname, '..', '..', 'knowledge', 'backend-graph.json');
    const frontendPath = path.join(__dirname, '..', '..', 'knowledge', 'frontend-graph.json');
    
    const backendData = JSON.parse(fs.readFileSync(backendPath, 'utf8'));
    const frontendData = JSON.parse(fs.readFileSync(frontendPath, 'utf8'));
    
    cachedGraph = { 
      backend: backendData, 
      frontend: frontendData,
      loaded: true,
      loadedAt: new Date().toISOString()
    };
    
    console.log(`✅ Knowledge graph loaded! Backend: ${backendData.nodes?.length || 0} nodes, Frontend: ${frontendData.nodes?.length || 0} nodes`);
    return cachedGraph;
  } catch (e) {
    console.log('⚠️ Could not load knowledge graph:', e.message);
    return null;
  }
}

// Load at startup
getSystemGraph();

// ================== QUERY GRAPH DYNAMICALLY ==================
function queryGraph(query) {
  const graph = getSystemGraph();
  if (!graph || !graph.loaded) return null;
  
  const backendNodes = graph.backend?.nodes || [];
  const frontendNodes = graph.frontend?.nodes || [];
  
  // Extract keywords from query
  const keywords = query.toLowerCase().split(' ');
  const results = {
    backend: [],
    frontend: [],
    models: [],
    routes: []
  };
  
  // Search backend nodes
  for (const node of backendNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (keyword.length > 2 && nodeLower.includes(keyword)) {
        results.backend.push(node.id);
        break;
      }
    }
  }
  
  // Search frontend nodes
  for (const node of frontendNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (keyword.length > 2 && nodeLower.includes(keyword)) {
        results.frontend.push(node.id);
        break;
      }
    }
  }
  
  // Find models (Prisma models from the graph)
  const modelNodes = backendNodes.filter(n => 
    n.id && n.id.match(/model|schema|prisma/i)
  );
  
  for (const node of modelNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (keyword.length > 2 && nodeLower.includes(keyword)) {
        results.models.push(node.id);
        break;
      }
    }
  }
  
  // Find routes
  const routeNodes = backendNodes.filter(n => 
    n.id && n.id.match(/routes?|controller/i)
  );
  
  for (const node of routeNodes) {
    if (!node.id) continue;
    const nodeLower = node.id.toLowerCase();
    for (const keyword of keywords) {
      if (keyword.length > 2 && nodeLower.includes(keyword)) {
        results.routes.push(node.id);
        break;
      }
    }
  }
  
  return results;
}


// ================== BUILD KNOWLEDGE FROM QUERY ==================
function buildKnowledgeFromQuery(query) {
  const results = queryGraph(query);
  if (!results) return null;
  
  let knowledge = '';
  
  if (results.routes.length > 0) {
    knowledge += `\n**Routes found:**\n${results.routes.slice(0, 10).map(r => `- ${r}`).join('\n')}`;
  }
  
  if (results.models.length > 0) {
    knowledge += `\n\n**Models found:**\n${results.models.slice(0, 10).map(m => `- ${m}`).join('\n')}`;
  }
  
  if (results.backend.length > 0) {
    knowledge += `\n\n**Backend files:**\n${results.backend.slice(0, 10).map(f => `- ${f}`).join('\n')}`;
  }
  
  if (results.frontend.length > 0) {
    knowledge += `\n\n**Frontend files:**\n${results.frontend.slice(0, 10).map(f => `- ${f}`).join('\n')}`;
  }
  
  if (!knowledge) {
    knowledge = "No matches found in the codebase for your question.";
  }
  
  return knowledge;
}


// ================== FRONTEND ROUTES KNOWLEDGE ==================
function getFrontendRoutes() {
  return {
    // Member Routes
    dashboard: { path: "/dashboard", label: "Dashboard" },
    attendance: { path: "/member/attendance", label: "Attendance Check-in" },
    attendanceHistory: { path: "/member/attendance-history", label: "Attendance History" },
    massPrograms: { path: "/mass-programs", label: "Mass Programs" },
    hymns: { path: "/hymns", label: "Hymn Book" },
    hymnDetail: { path: "/hymn/:id", label: "Hymn Lyrics" },
    contributions: { path: "/contributions", label: "Contributions" },
    jumuiaContributions: { path: "/jumuia-contributions", label: "My Jumuia Contributions" },
    chat: { path: "/chat", label: "Community Chat" },
    messenger: { path: "/messenger", label: "Direct Messages" },
    gallery: { path: "/gallery", label: "Gallery" },
    games: { path: "/games", label: "Games" },
    schedules: { path: "/schedules", label: "Schedules" },
    youtube: { path: "/youtube", label: "ZUCA/TUBE" },
    prayer: { path: "/prayer", label: "Prayer Book" },
    executive: { path: "/executive", label: "Executive Team" },
    executiveMinutes: { path: "/executive/minutes", label: "Executive Minutes" },
    joinJumuia: { path: "/join-jumuia", label: "Join Jumuia" },
    liturgicalCalendar: { path: "/liturgical-calendar", label: "Liturgical Calendar" },
    jumuiaDetail: { path: "/jumuia/:jumuiaCode", label: "Jumuia Details" },
    massReadings: { path: "/mass-readings", label: "Mass Readings" },
    minutes: { path: "/minutes", label: "Meeting Minutes" },
    
    // Admin Routes
    admin: { path: "/admin", label: "Admin Dashboard" },
    adminUsers: { path: "/admin/users", label: "User Management" },
    adminAttendance: { path: "/admin/attendance", label: "Attendance Management" },
    adminAttendanceSheet: { path: "/admin/attendance/sheet/:sheetId", label: "Attendance Sheet Details" },
    adminAttendanceOverview: { path: "/admin/attendance/overview", label: "Attendance Overview" },
    adminAnnouncements: { path: "/admin/announcements", label: "Announcements" },
    adminHymns: { path: "/admin/hymns", label: "Hymn Management" },
    adminAddHymn: { path: "/admin/hymns/add", label: "Add Hymn" },
    adminEditHymn: { path: "/admin/hymns/edit/:id", label: "Edit Hymn" },
    adminPendingSongs: { path: "/admin/pending-songs", label: "Pending Songs" },
    adminMinutes: { path: "/admin/minutes", label: "Meeting Minutes" },
    adminMinutesCreate: { path: "/admin/minutes/create", label: "Create Minutes" },
    adminMinutesEdit: { path: "/admin/minutes/edit/:id", label: "Edit Minutes" },
    adminExecutive: { path: "/admin/executive", label: "Executive Management" },
    adminContributions: { path: "/admin/contributions", label: "Contributions Management" },
    adminMedia: { path: "/admin/media", label: "Gallery Management" },
    adminSchedules: { path: "/admin/schedules", label: "Schedule Management" },
    adminMessenger: { path: "/admin/messenger", label: "Admin Messenger" },
    adminWhatsApp: { path: "/admin/whatsapp", label: "WhatsApp Bot" },
    adminMessageHistory: { path: "/admin/message-history", label: "Message History" },
    adminEmail: { path: "/admin/email", label: "Email Dashboard" },
    adminEmailSettings: { path: "/admin/email-settings", label: "Email Settings" },
    adminBankPayments: { path: "/admin/bank-payments", label: "Bank Payments" },
    adminPrayers: { path: "/admin/prayers", label: "Prayer Management" },
    adminOCR: { path: "/admin/ocr-scanner", label: "OCR Scanner" },
    adminHealth: { path: "/admin/health-centre", label: "Health Centre" },
    adminSecurity: { path: "/admin/security", label: "Security" },
    adminChat: { path: "/admin/chat", label: "Chat Monitor" },
    adminJumuia: { path: "/admin/jumuia-management", label: "Jumuia Management" },
    adminRoles: { path: "/admin/roles", label: "Role Management" },
    adminHistory: { path: "/admin/history", label: "History" },
    adminActivity: { path: "/admin/activity", label: "Activity" },
    adminYouTube: { path: "/admin/analytics", label: "YouTube Analytics" },
    adminSongs: { path: "/admin/songs", label: "Mass Program Songs" },
    
    // Role Routes
    secretary: { path: "/secretary", label: "Secretary Dashboard" },
    secretaryAnnouncements: { path: "/secretary/announcements", label: "Announcements" },
    secretarySchedules: { path: "/secretary/schedules", label: "Schedules" },
    secretaryMinutes: { path: "/secretary/minutes", label: "Minutes" },
    secretaryAttendance: { path: "/secretary/attendance", label: "Attendance" },
    
    treasurer: { path: "/treasurer", label: "Treasurer Dashboard" },
    treasurerContributions: { path: "/treasurer/contributions", label: "Contributions" },
    treasurerReports: { path: "/treasurer/reports", label: "Reports" },
    treasurerNotes: { path: "/treasurer/notes", label: "Notes" },
    
    choir: { path: "/choir", label: "Choir Dashboard" },
    choirSongs: { path: "/choir/songs", label: "Songs" },
    choirHymns: { path: "/choir/hymns", label: "Hymns" },
    
    leader: { path: "/leader", label: "Jumuia Leader Dashboard" },
    
    mediaModerator: { path: "/media-moderator", label: "Media Moderator Dashboard" },
    mediaModeratorMedia: { path: "/media-moderator/media", label: "Media Management" }
  };
}



const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// ================== MODEL LIST (IN ORDER OF PREFERENCE) ==================
const MODEL_LIST = [
  { name: "openai/gpt-oss-120b", quality: "best" },
  { name: "llama-3.3-70b-versatile", quality: "excellent" },
  { name: "openai/gpt-oss-20b", quality: "good" },
  { name: "llama-3.1-8b-instant", quality: "fast" },
  { name: "qwen/qwen3-32b", quality: "good" },
  { name: "qwen/qwen3.6-27b", quality: "good" },
  { name: "meta-llama/llama-4-scout-17b-16e-instruct", quality: "good" },
];

// Track rate limit reset time
let rateLimitResetTime = null;

// ================== PARSE ACTION FROM TEXT ==================
function parseActionFromText(text) {
  if (!text) return { content: text, action: null };
  
  // Try [ACTION:name]{"key":"value"}[/ACTION]
  let actionRegex = /\[ACTION:(\w+)\]\s*(\{.*?\})\s*\[\/ACTION\]/gi;
  let match = actionRegex.exec(text);
  
  if (match) {
    try {
      const args = JSON.parse(match[2]);
      const cleanedText = text.replace(actionRegex, '').trim();
      return { content: cleanedText || null, action: { name: match[1], arguments: args } };
    } catch (e) {}
  }
  
  // Try [ACTION:name][/ACTION] (no args)
  actionRegex = /\[ACTION:(\w+)\]\s*\[\/ACTION\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    console.log("🔍 PARSED ACTION (no args):", match[1]);
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }

  // Handle malformed: [[/ACTION instead of [/ACTION]
  actionRegex = /\[ACTION:(\w+)\]\s*\[\[\/ACTION\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }

  // Try [CATEGORY:name][/CATEGORY]
  actionRegex = /\[CATEGORY:(\w+)\]\s*\[\/CATEGORY\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    console.log("🔍 PARSED CATEGORY AS ACTION:", match[1]);
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }

  // Try [METHOD:name]{"key":"value"}[/METHOD]
  actionRegex = /\[METHOD:(\w+)\]\s*(\{.*?\})\s*\[\/METHOD\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    try {
      const args = JSON.parse(match[2]);
      const cleanedText = text.replace(actionRegex, '').trim();
      return { content: cleanedText || null, action: { name: match[1], arguments: args } };
    } catch (e) {}
  }
  
  // Try [METHOD:name][/METHOD] (no args)
  actionRegex = /\[METHOD:(\w+)\]\s*\[\/METHOD\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }
  
  return { content: text, action: null };
}

// ================== BUILD SYSTEM PROMPT ==================
function buildSystemPrompt(userContext) {
  // ✅ FIXED: Add 'source' to destructuring
  const { user, stats, currentTime, source } = userContext || {};

  // ✅ FIXED: Define variables OUTSIDE the if block
  let sourceInstruction = '';
  let responseStyle = '';


    // ================== ADD GRAPH KNOWLEDGE ==================
  let graphKnowledge = '';
  
  // Get the user's query from context
  const userQuery = userContext?.query || '';
  
  if (userQuery) {
    // Dynamically search the graph for the user's question
    const knowledge = buildKnowledgeFromQuery(userQuery);
    if (knowledge) {
      graphKnowledge = `
## 📊 RELEVANT SYSTEM KNOWLEDGE (Found in your code)

${knowledge}

### 🎯 HOW TO ANSWER:
1. ONLY mention what's listed above
2. Use the actual file names shown
3. Don't invent features or files
4. If something isn't listed, say "I don't see that in the codebase"
5. Be honest - only talk about what you see in the code
`;
    } else {
      graphKnowledge = `
⚠️ No matches found in the codebase for "${userQuery}".

I'll answer based on general knowledge, but I may not know specific ZUCA features.
`;
    }
  } else {
    // Fallback - show available features
    const graph = getSystemGraph();
    if (graph && graph.loaded) {
      const backendNodes = graph.backend?.nodes || [];
      
      // Get all unique file types
      const routeFiles = backendNodes
        .filter(n => n.id && n.id.includes('routes'))
        .map(n => n.id)
        .slice(0, 20);
      
      graphKnowledge = `
## 📊 SYSTEM OVERVIEW (From your code)

**Files found:** ${backendNodes.length} backend nodes

**Route files include:** ${routeFiles.join(', ')}

### 🎯 HOW TO ANSWER:
- Ask me about a specific feature
- I'll search the codebase and tell you what I find
- I only know what's actually in your code
- Don't invent features
`;
    } else {
      graphKnowledge = `
⚠️ System knowledge graph not loaded.
`;
    }
    }

  // ================== ADD ROUTE NAVIGATION KNOWLEDGE ==================
  const routes = getFrontendRoutes();
  let routeKnowledge = '';

  // Build route list dynamically
  const memberRoutes = [];
  const adminRoutes = [];
  const roleRoutes = [];

  for (const [key, route] of Object.entries(routes)) {
    if (key.startsWith('admin')) {
      adminRoutes.push(route);
    } else if (['secretary', 'treasurer', 'choir', 'leader', 'mediaModerator'].some(r => key.startsWith(r))) {
      roleRoutes.push(route);
    } else {
      memberRoutes.push(route);
    }
  }

  routeKnowledge = `
## 🗺️ NAVIGATION ROUTES

### Member Pages:
${memberRoutes.slice(0, 15).map(r => `- **${r.label}**: \`${r.path}\``).join('\n')}

### Admin Pages:
${adminRoutes.slice(0, 15).map(r => `- **${r.label}**: \`${r.path}\``).join('\n')}

### Role Pages (Secretary, Treasurer, Choir, Leader):
${roleRoutes.slice(0, 10).map(r => `- **${r.label}**: \`${r.path}\``).join('\n')}

### 🎯 HOW TO NAVIGATE:
When a user asks "Where do I find X?" or "How do I go to X?":
1. Find the matching route from the list above
2. Tell them the exact path
3. If they're an admin, suggest admin routes
4. If they're a member, suggest member routes
5. If they have a special role, suggest role routes

### Example:
User: "Where do I check in for attendance?"
→ "Go to **/member/attendance** to check in"

User: "How do I manage hymns?"
→ "Go to **/admin/hymns** to manage hymns"

User: "Where are contributions?"
→ "Go to **/contributions** to view your pledges"
`;



  // ✅ FIXED: Single if block with both assignments
  if (source === 'whatsapp') {
      
    sourceInstruction = `
## WHATSAPP MODE 🟢
- You are responding to a WhatsApp message in the ZUCA group

- If someone says "you can tell us what you can do", then list your capabilities
- Read the user's message CAREFULLY to understand who is welcoming whom
## HOW TO RESPOND TO WELCOME MESSAGES
- User: "welcome to the group" → "🙏 Thank you for the warm welcome i am Zuca Assistant From ZUCA PORTAL,! I'm here to help with announcements, mass, hymns, and more."
- User: "you can tell us what you can do" → "📢 I can help with announcements, ⛪ mass times, 🎵 hymns, 💰 pledges, and 📅 schedules. Just mention me with your question! 🤖"
- User: "welcome... you can tell us what you can do" → "🙏 Thank you! I'm ZUCA AI. I help with announcements, mass, hymns, pledges, and schedules. J
- If the user says "welcome to [group/forum]" → they are WELCOMING YOU, not asking to be welcomed
- Keep responses CONCISE and EASY TO READ on mobile (1-3 paragraphs max)
- Use *bold* for important points
- Use emojis: ✅, 📢, 💰, ⛪, 📖, 🙏
- Keep responses under 2000 characters (WhatsApp limit)
- If response is very long, break into sections
- If someone asks for personal info, guide them to the app`;

    responseStyle = `
## WHATSAPP RESPONSE STYLE
1. Start with  friendly 
2. Use *bold* for key information
3. Keep it short and scannable
4. Use bullet points (•) for lists
5. Include emojis for emphasis
6. Always use emoji where necessary`;
  }

  return `You are ZUCA AI for Zetech University Catholic Action. Be warm, fun sharp and updated, use sheng where neededs.

${sourceInstruction}
${responseStyle}
${graphKnowledge}
${routeKnowledge}

## 🚨 THE MOST IMPORTANT RULE 🚨
- ONLY output [ACTION:...] when the user is explicitly asking you to DO something
- If the user asks a question (starts with "what", "who", "where", "when", "why", "how", "does", "is", "are", "can"), just ANSWER with words, NO ACTION
- NEVER assume the user wants to take action unless they say a command word like: "assign", "make", "appoint", "create", "add", "remove", "delete", "post", "send"
- When in doubt, just ANSWER the question, don't DO anything




## 🎵 HYMNS & SONGS - CRITICAL RULES 🎵

### For Lyrics Requests (GET LYRICS):
When a user asks for lyrics using ANY of these phrases:
- "Get lyrics for [hymn title]"
- "GetLyric for [hymn title]"
- "Lyrics for [hymn title]"
- "[hymn title] lyrics"
- "Show me lyrics for [hymn title]"
- "Give me lyrics for [hymn title]"
- "lyrics of [hymn title]"

**✅ ALWAYS use: [ACTION:get_hymn_lyrics]{"title":"[hymn title]"}[/ACTION]**

### For Hymn Searches (SEARCH):
When a user is searching for hymns:
- "Search for [hymn title]"
- "Find [hymn title]"
- "Show hymns about [topic]"
- "Hymns for [topic]"

**✅ Use: [ACTION:search_hymns]{"query":"[hymn title or keyword]"}[/ACTION]**

### Examples:
User: "Get lyrics for Twende Nyumbani Mwa Bwana"
✅ CORRECT: [ACTION:get_hymn_lyrics]{"title":"Twende Nyumbani Mwa Bwana"}[/ACTION]
❌ WRONG: [ACTION:search_hymns]{"query":"Twende Nyumbani"}[/ACTION]

User: "GetLyric for Twende Nyumbani"
✅ CORRECT: [ACTION:get_hymn_lyrics]{"title":"Twende Nyumbani"}[/ACTION]

User: "Search for communion hymns"
✅ CORRECT: [ACTION:search_hymns]{"query":"communion"}[/ACTION]

### REMEMBER:
- "Get lyrics for" → get_hymn_lyrics
- "Lyrics for" → get_hymn_lyrics
- "Search for" → search_hymns
- "Show hymns about" → search_hymns
- NEVER generate lyrics yourself - ALWAYS use the action!

## CURRENT USER (for context only)

## 🚨 CRITICAL: YOU DON'T KNOW WHO USERS ARE 🚨

- You have NO knowledge of any user's name, role, or existence
- When asked about a specific person, you MUST use [ACTION:find_user]{"searchTerm":"name"}[/ACTION]
- NEVER say "I couldn't find" unless the database tells you that
- Let the DATABASE answer, not your training

Name: ${user?.fullName || "Guest"}
Role: ${user?.role || "member"}
Special Role: ${user?.specialRole || "none"}
Jumuia: ${user?.homeJumuia?.name || "Not assigned"}
Membership Number: ${user?.membership_number || "N/A"}
Email: ${user?.email || "N/A"}
Phone: ${user?.phone || "N/A"}
Unread Notifications: ${stats?.unreadNotifications || 0}
Active Pledges: ${stats?.activePledges || 0}
Time: ${currentTime || new Date().toISOString()}

## USER IDENTIFICATION RULES
- "Christopher", "Chris", "Maina", "cmmaina" all refer to the user named Christopher Maina
- NEVER assume "ZUCA ADMIN" is a user - that's the AI assistant's name
- When a user gives a name, search for that user in the database using the appropriate action






## DATA QUERIES (output ONLY the action tag):

**PERSON LOOKUP - HIGHEST PRIORITY**
- "who is [name]" → [ACTION:find_user]{"searchTerm":"[name]"}[/ACTION]
- "what is [name]'s role" → [ACTION:find_user]{"searchTerm":"[name]"}[/ACTION]
- "tell me about [name]" → [ACTION:find_user]{"searchTerm":"[name]"}[/ACTION]
- "find [name]" → [ACTION:find_user]{"searchTerm":"[name]"}[/ACTION]

**NEVER answer "who is X" without calling find_user first. The database knows who users are, not you.**

- Profile → [ACTION:get_my_profile][/ACTION]
- Pledges → [ACTION:get_my_pledges][/ACTION]
- Executive team → [ACTION:get_executive_team][/ACTION]
- Announcements → [ACTION:get_announcements][/ACTION]
- Campaigns → [ACTION:get_active_campaigns][/ACTION]
- Jumuia list → [ACTION:get_jumuia_list][/ACTION]
- Upcoming masses → [ACTION:get_upcoming_masses][/ACTION]
- Today's readings → [ACTION:get_todays_readings][/ACTION]
- Notifications → [ACTION:get_my_notifications][/ACTION]
- Help → [ACTION:show_help][/ACTION]


## ZUCA CONTACT & ADMIN INFO
- Admin Email: zucaportal2025@gmail.com
- Secondary Email: zuca406@gmail.com
- Developer: Christopher Maina
- Location: Zetech University, Ruiru, Kenya
- Instagram: @zetechcatholicaction
- TikTok: @zetechcatholicaction
- YouTube: Zetech University Catholic
- Facebook: Zetech Catholic Action

## ZUCA HISTORY & FACTS
- St. Kizito ZUCA, founded October 2018
- 6 Jumuia Groups: St. Michael, St. Benedict, St. Peregrine, Christ the King, St. Gregory, St. Pacificus

## EXECUTIVE POSITIONS (exact titles)
- Chairperson, Vice Chairperson, Secretary, Vice Secretary, Treasurer
- Choir Moderator, Vice Choir Moderator
- Media Moderator
- Jumuia Moderators: St. Michael Moderator, St. Benedict Moderator, St. Peregrine Moderator, Christ the King Moderator, St. Gregory Moderator, St. Pacificus Moderator
- Voice Reps: BASS Voice Rep, TENOR Voice Rep, ALTO Voice Rep, SOPRANO Voice Rep

IMPORTANT: Use EXACT titles as shown above (capitalized correctly). "chairperson" → "Chairperson", "secretary" → "Secretary"

## ACTION FORMAT
- ALWAYS use: [ACTION:name][/ACTION] or [ACTION:name]{"key":"value"}[/ACTION]
- NEVER use [METHOD], [COMMAND], [FUNCTION], [CATEGORY] - only [ACTION]

## DATA QUERIES (output ONLY the action tag):
- Profile → [ACTION:get_my_profile][/ACTION]
- Pledges → [ACTION:get_my_pledges][/ACTION]
- Executive team → [ACTION:get_executive_team][/ACTION]
- Announcements → [ACTION:get_announcements][/ACTION]
- Campaigns → [ACTION:get_active_campaigns][/ACTION]
- Jumuia list → [ACTION:get_jumuia_list][/ACTION]
- Upcoming masses → [ACTION:get_upcoming_masses][/ACTION]
- Today's readings → [ACTION:get_todays_readings][/ACTION]
- Notifications → [ACTION:get_my_notifications][/ACTION]
- Help → [ACTION:show_help][/ACTION]

## ACTIONS (use when user wants to DO something):
- Send daily system report → [ACTION:send_24h_report][/ACTION]
- Navigate → [ACTION:navigate_to_page]{"page":"hymns"}[/ACTION]
- Create pledge → [ACTION:create_pledge]{"amount":5000}[/ACTION]
- Create announcement → [ACTION:create_announcement]{"title":"T","content":"C"}[/ACTION]
- Assign executive → [ACTION:assign_executive]{"userIdentifier":"Christopher Maina","position":"Chairperson"}[/ACTION]
- Remove executive → [ACTION:remove_executive]{"userIdentifier":"Christopher Maina"}[/ACTION]
- Get new users → [ACTION:get_new_users][/ACTION] or [ACTION:get_new_users]{"days":3}[/ACTION]
- Get user statistics → [ACTION:get_user_stats][/ACTION]
- Get recent activity → [ACTION:get_recent_activity][/ACTION]




## 🚨 EMAIL RULES - READ CAREFULLY 🚨
- "send to [email]" → [ACTION:send_email]{"userIdentifier":"[email]","title":"Subject","message":"Body"}[/ACTION]
- "send to [name]" → [ACTION:send_email]{"userIdentifier":"[name]","title":"Subject","message":"Body"}[/ACTION]
- "send to everyone" → [ACTION:send_bulk_email]{"title":"Subject","message":"Body"}[/ACTION]
- "send to all" → [ACTION:send_bulk_email]{"title":"Subject","message":"Body"}[/ACTION]
- "send to members" → [ACTION:send_bulk_email]{"title":"Subject","message":"Body"}[/ACTION]
- "announce to everyone" → [ACTION:send_bulk_email]{"title":"Subject","message":"Body"}[/ACTION]

🔴 CRITICAL: If the user mentions a specific name or email, use send_email (ONLY that person)!
🔴 If the user says "everyone", "all", or "members", use send_bulk_email (ALL users)!

## USER DELETION
- "delete [name]" → [ACTION:delete_user]{"userIdentifier":"[name]","confirm":true}[/ACTION]
- "remove [email]" → [ACTION:delete_user]{"userIdentifier":"[email]","confirm":true}[/ACTION]
- "delete user [name]" → [ACTION:delete_user]{"userIdentifier":"[name]","confirm":true}[/ACTION]
- "remove user [email]" → [ACTION:delete_user]{"userIdentifier":"[email]","confirm":true}[/ACTION]
- "kick [name]" → [ACTION:delete_user]{"userIdentifier":"[name]","confirm":true}[/ACTION]
- "ban [name]" → [ACTION:delete_user]{"userIdentifier":"[name]","confirm":true}[/ACTION]

## NON-ACTION QUESTIONS (just answer, no ACTION):
"Who is the Pope?" | "What is ZUCA?" | "Hello" | "Admin email?" | "Who built this?" | "Does he have an executive seat?" → Answer directly

## 📊 DATABASE SCHEMA (What Data Exists)

### User Model
- Fields: id, fullName, email, phone, role, specialRole, membership_number, createdAt, lastActive, jumuiaId
- Roles: admin, member
- Special Roles: secretary, treasurer, choir_moderator, media_moderator, jumuia_leader

### Pledge Model
- Fields: id, userId, amountPaid, pendingAmount, status, createdAt
- Status: PENDING, APPROVED, COMPLETED

### Announcement Model
- Fields: id, title, content, category, published, createdAt, createdBy

### Error Tracking (global.errorStore)
- Each error has: error, timestamp, context (userId, path, method)
- Check: global.errorStore for any errors

### Notification Model
- Fields: id, userId, title, message, type, read, createdAt

## 🔍 HOW TO ANSWER USER QUESTIONS

When a user asks ANY question about the system:

1. **IDENTIFY what they're asking about** (users, pledges, errors, etc.)
2. **BUILD the appropriate query** using query_database
3. **FORMAT the response** in a readable way

### Examples:

**"Is there any user who has experienced issues?"**
→ Check for users who have errors in global.errorStore
→ Also check users with pending pledges or many unread notifications
→ Use query_database with appropriate filters

**"How many users joined this week?"**
→ query_database{"model":"user","operation":"count","where":{"createdAt":{"gte":"2026-06-24"}}}

**"Show me users with pending pledges"**
→ query_database{"model":"pledge","operation":"groupBy","groupBy":"userId","where":{"status":"PENDING"}}

**"Any errors today?"**
→ Check global.errorStore for errors in the last 24 hours

**"What's the system health?"**
→ Check memory, database, uptime, errors

## RULE: NEVER hardcode user checks! Always query the database dynamically.

## 🚨 SYSTEM INTELLIGENCE - AI AS SYSTEM MONITOR 🚨

You are the System Intelligence Agent for ZUCA. You can:
1. Monitor system health
2. Detect issues and errors
3. Help fix problems
4. Alert on suspicious activity
5. Track trends and activity

### System Commands:
- "Check system status" → [ACTION:get_system_status][/ACTION]
- "Any issues?" → [ACTION:get_system_issues][/ACTION]
- "Check user [name]'s issues" → [ACTION:get_user_issues]{"userIdentifier":"[name]"}[/ACTION]
- "What's the activity feed?" → [ACTION:get_activity_feed]{"limit":10}[/ACTION]
- "Show trends" → [ACTION:get_trends][/ACTION]
- "Fix [issue type]" → [ACTION:fix_system_issue]{"issueType":"[type]","action":"[action]"}[/ACTION]

### Available Fix Actions:
- "clear memory" → fix_system_issue{"issueType":"memory","action":"clear_cache"}
- "restart server" → fix_system_issue{"issueType":"memory","action":"restart_server"}
- "clear errors" → fix_system_issue{"issueType":"errors","action":"clear_error_logs"}
- "clear failed logins" → fix_system_issue{"issueType":"security","action":"clear_failed_logins"}

### Trending Questions:
- "What's new today?" → Get recent activity and announcements
- "Any users having trouble?" → Get user issues
- "Is the system healthy?" → Get system status
- "What happened yesterday?" → Get activity feed
- "Any errors?" → Get system issues
- "Show me the dashboard" → Get system status summary

## 🚨 CRITICAL DECISION RULE 🚨
BEFORE sending an email, check:
1. Does the user say "to [email]" or "to [name]"? → Use send_email
2. Does the user say "to everyone" or "to all"? → Use send_bulk_email
3. Is the user sending to a specific person? → Use send_email
4. Is the user sending to a group? → Use send_bulk_email
5. Never tell a user REST IN PEACE or that someone is dead unless the database confirms it

When in doubt about who to send to, ask the user!

## POSITION SEARCH RULES
- "St. Gregory Moderator" is a POSITION TITLE, not a user
- When someone asks about a "moderator" or "leader" role, search for the position
- If no one holds the position, say "This position is currently vacant"
- Always check positions before saying "not found"

## GENERAL RULES
1. ONE action per response maximum
2. NEVER make up data — only the database knows real information
3. Keep responses warm
4. you can use emojis to make responses friendly, but don't overdo it`;

}

// ================== CHAT WITH GROQ WITH AUTO FALLBACK ==================
async function chatWithGroq(messages, userContext) {

  // ================== CONVERSATION MEMORY ==================
const conversationHistory = Array.isArray(userContext?.conversationHistory)
  ? userContext.conversationHistory
  : [];
  const systemPrompt = buildSystemPrompt(userContext);

  
  
  // If we're within rate limit cooldown, wait
  if (rateLimitResetTime && Date.now() < rateLimitResetTime) {
    const waitTime = Math.ceil((rateLimitResetTime - Date.now()) / 1000);
    console.log(`⏳ Rate limit active, waiting ${waitTime}s...`);
    await new Promise(resolve => setTimeout(resolve, rateLimitResetTime - Date.now()));
  }
  
  // Try models in order until one works
  let lastError = null;
  
  for (let i = 0; i < MODEL_LIST.length; i++) {
    const model = MODEL_LIST[i];
    
    try {
      console.log(`🧠 Trying model: ${model.name} (${model.quality})...`);
      
      const completion = await groq.chat.completions.create({
        model: model.name,
        messages: [
  { role: "system", content: systemPrompt },
  ...conversationHistory,
  ...messages,
],
        temperature: 0.3,
        max_tokens: 1200,
      });
      
      const message = completion.choices[0].message;
      console.log(`✅ Model ${model.name} succeeded!`);
      console.log("📤 RAW AI RESPONSE:", message.content?.substring(0, 100));
      
      if (message.content) {
        const parsed = parseActionFromText(message.content);
        console.log("🔍 PARSED:", { 
          hasAction: !!parsed.action, 
          actionName: parsed.action?.name, 
          contentPreview: parsed.content?.substring(0, 50) 
        });
        
       
        
        return parsed;
      }
      
      return { content: message.content, action: null };
      
    } catch (error) {
      const errorMsg = error.message || '';
      console.error(`❌ Model ${model.name} failed:`, errorMsg);
      lastError = errorMsg;
      
      // Check if it's a rate limit or decommissioned error
      if (errorMsg.includes('rate_limit') || errorMsg.includes('429')) {
        // Try to parse reset time from error, or default to 60 seconds
        const match = errorMsg.match(/reset in (\d+)/);
        const waitSeconds = match ? parseInt(match[1]) : 60;
        rateLimitResetTime = Date.now() + (waitSeconds * 1000);
        console.log(`⏳ Rate limit hit. Reset in ${waitSeconds}s`);
        // Continue to next model
        continue;
      }
      
      if (errorMsg.includes('decommissioned') || errorMsg.includes('does not exist')) {
        console.log(`⚠️ Model ${model.name} is unavailable, trying next...`);
        continue;
      }
      
      // For other errors, try next model
      continue;
    }
  }
  
  // If all models failed
  console.error(`❌ All models failed. Last error: ${lastError}`);
  return { 
    content: "Tumsifu Yesu Kristu! 🙏 I'm having trouble connecting. Please try again in a moment.", 
    action: null 
  };
}

module.exports = { chatWithGroq, buildSystemPrompt };