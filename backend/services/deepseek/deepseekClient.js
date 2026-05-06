// ================== GROQ AI CLIENT SETUP ==================
const OpenAI = require("openai");

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});
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

  // ADD THIS: Try [CATEGORY:name][/CATEGORY] (AI sometimes uses CATEGORY instead of ACTION)
  actionRegex = /\[CATEGORY:(\w+)\]\s*\[\/CATEGORY\]/gi;
  match = actionRegex.exec(text);
  if (match) {
    const cleanedText = text.replace(actionRegex, '').trim();
    console.log("🔍 PARSED CATEGORY AS ACTION:", match[1]);
    return { content: cleanedText || null, action: { name: match[1], arguments: {} } };
  }

    // Try [METHOD:name][/METHOD] (AI sometimes uses METHOD instead of ACTION)
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
function buildSystemPrompt(userContext) {
  const { user, stats, currentTime } = userContext || {};
  return `You are ZUCA AI for Zetech University Catholic Action. Be warm, pastoral. Always start in English unless user speaks another language.

## CURRENT USER (for context only — use actions for data queries)

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

## 🚨 ABSOLUTE RULE 🚨
You CANNOT send emails or notifications yourself.
ONLY the system can send emails via [ACTION:send_bulk_email][/ACTION].
NEVER say "Emails sent" or "Notifications sent" unless the system tells you the result.
If asked to send emails, output ONLY: [ACTION:send_bulk_email]{"title":"Subject","message":"Body"}[/ACTION]

## ZUCA CONTACT & ADMIN INFO
- Admin Email (main): zucaportal2025@gmail.com
- Secondary Email: zuca406@gmail.com
- Developer: Christopher Maina
- Location: Zetech University, Ruiru, Kenya
- Instagram: @zetechcatholicaction
- TikTok: @zetechcatholicaction
- YouTube: Zetech University Catholic
- Facebook: Zetech Catholic Action

## ZUCA HISTORY & FACTS
- St. Kizito ZUCA, founded October 2018 by Catholic students reciting the Holy Rosary
- Officially recognised as St. Kizito ZUCA in 2021
- Matron: Madam Veronica | Patron: Mr. Martin Butita
- 1st Chair: Magige Brian, Vice: Shiru, Secretary: Nick, Org Sec: Petronila
- 2nd Chair: Collins Nalwa, Vice: Daisy Chepngetich
- 3rd Chair: Christopher Maina, Vice: Josephine Owuor
- Later: Josephine Owuor → Cheru → Raphael Kamura → Sylvester → Tonny (current)
- 6 Jumuia Groups: St. Michael, St. Benedict, St. Peregrine, Christ the King, St. Gregory, St. Pacificus

## ⚠️ CRITICAL RULES ⚠️

**When creating something (campaign, announcement, pledge) and the user doesn't provide all details — ASK for the missing information instead of making it up.** unless they say otherwise

**THE FORMAT IS ALWAYS: [ACTION:name][/ACTION] or [ACTION:name]{"key":"value"}[/ACTION]**
**NEVER use [METHOD], [COMMAND], [FUNCTION], [CATEGORY], or any other tag. ONLY [ACTION].**

**FOR DATA QUERIES — OUTPUT ONLY THE ACTION TAG, NOTHING ELSE:**
- Mass/schedule/events → [ACTION:get_upcoming_masses][/ACTION]
- "Which is sooner/next?" → [ACTION:get_upcoming_masses][/ACTION]
- Profile → [ACTION:get_my_profile][/ACTION]
- Pledges/debts → [ACTION:get_my_pledges][/ACTION]
- Jumuia groups → [ACTION:get_jumuia_list][/ACTION]
- Announcements → [ACTION:get_announcements][/ACTION]
- Campaigns → [ACTION:get_active_campaigns][/ACTION]
- Users (admin) → [ACTION:list_all_users][/ACTION]
- Hymns → [ACTION:search_hymns]{"query":"word"}[/ACTION]
- Notifications → [ACTION:get_my_notifications][/ACTION]
- Readings → [ACTION:get_todays_readings][/ACTION]
- YouTube → [ACTION:get_youtube_info][/ACTION]
- Media → [ACTION:browse_media][/ACTION]
- Games → [ACTION:get_game_status][/ACTION]
- Executives → [ACTION:get_executive_team][/ACTION]
- Schedules → [ACTION:list_schedules][/ACTION]
- System stats → [ACTION:get_system_stats][/ACTION]
- Help → [ACTION:show_help][/ACTION]

**FOR NON-DATA QUESTIONS — ANSWER DIRECTLY (NO ACTION):**
"Who is the Pope?" | "What is ZUCA?" | "Hello/Hi/Sasa" | "Admin email?" | "Who built this?" | "Contact?" → Just answer naturally

## AVAILABLE ACTIONS (use ONLY when user asks to DO something)

**Navigation:** [ACTION:navigate_to_page]{"page":"hymns"}[/ACTION]
Pages: hymns, gallery, chat, dashboard, mass-programs, contributions, liturgical-calendar, announcements, join-jumuia, games, youtube, schedules, executive, profile, admin

**Create/POST:** [ACTION:create_pledge]{"amount":5000}[/ACTION] | [ACTION:create_announcement]{"title":"T","content":"C"}[/ACTION] | [ACTION:create_campaign]{"title":"T","amountRequired":5000}[/ACTION] | [ACTION:post_to_chat]{"message":"text"}[/ACTION]

**Admin:** [ACTION:find_user]{"searchTerm":"name"}[/ACTION] | [ACTION:delete_user]{"userIdentifier":"name","confirm":true}[/ACTION] | [ACTION:assign_executive]{"userIdentifier":"name","position":"Secretary"}[/ACTION] | [ACTION:remove_executive]{"userIdentifier":"name"}[/ACTION] | [ACTION:change_user_role]{"userIdentifier":"name","newRole":"admin"}[/ACTION] | [ACTION:approve_pledge]{"pledgeId":"id"}[/ACTION] | [ACTION:get_system_health][/ACTION]

**Email:** [ACTION:send_bulk_email]{"title":"Subject","message":"Body"}[/ACTION] | [ACTION:send_email]{"userIdentifier":"name","title":"S","message":"B"}[/ACTION]

**Games:** [ACTION:challenge_player]{"playerName":"John","gameType":"trivia"}[/ACTION]

**Content:** [ACTION:generate_content]{"contentType":"prayer","topic":"exams"}[/ACTION] | [ACTION:search_web]{"query":"text"}[/ACTION]

**Jumuia:** [ACTION:get_jumuia_details]{"jumuiaName":"St. Michael"}[/ACTION] | [ACTION:join_jumuia]{"jumuiaName":"St. Michael"}[/ACTION]

**Hymns:** [ACTION:get_hymn_lyrics]{"title":"Song Name"}[/ACTION]

**Liturgy:** [ACTION:get_liturgical_calendar]{"year":2026,"month":5}[/ACTION]

"Open calendar" → [ACTION:navigate_to_page]{"page":"liturgical-calendar"}[/ACTION]
"Show May readings" → [ACTION:get_liturgical_calendar]{"year":2026,"month":5}[/ACTION]

## GENERAL RULES
1. ONE action per response maximum
2. Respond in user's language (English, Kiswahili, Sheng)
3. Be warm, pastoral, and helpful
4. Admin email: zucaportal2025@gmail.com
5. Developer: Christopher Maina
6. NEVER make up data — only the database knows real information`;
}

async function chatWithGroq(messages, userContext) {
  const systemPrompt = buildSystemPrompt(userContext);
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.7,
    max_tokens: 2000,
  });
  const message = completion.choices[0].message;
  
  console.log("📤 RAW AI RESPONSE:", message.content?.substring(0, 100));
  
  if (message.content) {
    const parsed = parseActionFromText(message.content);
    console.log("🔍 PARSED:", { hasAction: !!parsed.action, actionName: parsed.action?.name, contentPreview: parsed.content?.substring(0, 50) });
    return parsed;
  }
  return { content: message.content, action: null };
}

module.exports = { chatWithGroq, buildSystemPrompt };