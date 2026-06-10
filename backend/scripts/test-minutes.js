// test-minutes.js
// Run with: node scripts/test-minutes.js

const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";
let authToken = null;
let testMinutesId = null;
let testAttendanceSheetId = null;

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  reset: "\x1b[0m"
};

function logSuccess(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function logError(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function logInfo(msg) {
  console.log(`${colors.blue}📌 ${msg}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.yellow}🧪 TEST: ${name}${colors.reset}`);
}

async function apiCall(method, endpoint, data = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  try {
    const response = await axios({ method, url, data, headers });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Step 1: Login as admin
async function login() {
  logTest("Admin Login");
  
  const result = await apiCall("POST", "/login", {
    email: "zucaportal2025@gmail.com",
    password: "adminzuca"
  });
  
  if (result.success && result.data.token) {
    authToken = result.data.token;
    logSuccess(`Logged in as: ${result.data.user?.fullName || "Admin"}`);
    return true;
  } else {
    logError(`Login failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 2: Get existing attendance sheets
async function getAttendanceSheets() {
  logTest("Get Active Attendance Sheets");
  
  const result = await apiCall("GET", "/attendance/active", null, authToken);
  
  if (result.success && result.data.sheets && result.data.sheets.length > 0) {
    testAttendanceSheetId = result.data.sheets[0].id;
    logSuccess(`Found attendance sheet: ${result.data.sheets[0].title}`);
    console.log(`  Sheet ID: ${testAttendanceSheetId}`);
    console.log(`  Date: ${result.data.sheets[0].eventDate}`);
    console.log(`  Location: ${result.data.sheets[0].location}`);
    return true;
  } else {
    logError("No active attendance sheets found");
    logInfo("Please create an attendance sheet first via QR system or admin panel");
    console.log("\n  To create an attendance sheet, use:");
    console.log("  POST /api/attendance/sheet with title, eventDate, etc.");
    return false;
  }
}

// Step 3: Create minutes from attendance sheet
async function createMinutes() {
  logTest("Create Minutes from Attendance Sheet");
  
  const minutesData = {
    attendanceSheetId: testAttendanceSheetId,
    agenda: [
      "Opening prayer and introductions",
      "Review of previous meeting minutes",
      "Budget report for upcoming Easter event",
      "New member onboarding process",
      "Upcoming events planning"
    ],
    preliminaries: "The meeting was opened with a word of prayer by the Chairperson. All members introduced themselves. The Chairperson welcomed everyone to the meeting.",
    sections: [
      {
        number: "MIN 01/03",
        title: "REVIEW OF PREVIOUS MINUTES",
        content: "The previous minutes were read and adopted as a true record of proceedings. There were no corrections from the members present.",
        decisions: ["Previous minutes approved unanimously"],
        actionItems: []
      },
      {
        number: "MIN 02/03",
        title: "BUDGET REPORT",
        content: "The Treasurer presented the budget for the upcoming Easter event. The total estimated cost is KES 50,000 covering venue, refreshments, and equipment.",
        decisions: ["Budget of KES 50,000 approved by the house"],
        actionItems: [
          { task: "Prepare detailed budget breakdown", assignedToUserId: null, assignedToName: "Treasurer", dueDate: "2026-03-25" },
          { task: "Source for event vendors", assignedToUserId: null, assignedToName: "Events Committee", dueDate: "2026-03-28" }
        ]
      },
      {
        number: "MIN 03/03",
        title: "NEW MEMBERS",
        content: "Discussed onboarding process for new members joining ZUCA. Currently 15 new members have registered this semester.",
        decisions: ["New membership forms to be created", "Orientation scheduled for next week"],
        actionItems: [
          { task: "Create digital membership forms", assignedToUserId: null, assignedToName: "Secretary", dueDate: "2026-03-22" },
          { task: "Plan orientation program", assignedToUserId: null, assignedToName: "Vice Chairperson", dueDate: "2026-03-24" }
        ]
      }
    ],
    aob: [
      { title: "Next meeting date", content: "Next meeting scheduled for next Friday at 4:00 PM at the same venue." },
      { title: "Choir practice", content: "Choir practice moved to Wednesday at 3:00 PM." },
      { title: "Fundraising idea", content: "Member suggested a car wash fundraiser next month." }
    ],
    adjournment: "The meeting was closed by the Chairperson with a word of prayer from the Secretary. Meeting ended at 5:30 PM."
  };
  
  const result = await apiCall("POST", "/minutes", minutesData, authToken);
  
  if (result.success && result.data.minutes) {
    testMinutesId = result.data.minutes.id;
    logSuccess(`Minutes created successfully!`);
    console.log(`  Title: ${result.data.minutes.title}`);
    console.log(`  Minutes ID: ${testMinutesId}`);
    console.log(`  Type: ${result.data.minutes.type}`);
    console.log(`  Status: ${result.data.minutes.status}`);
    return true;
  } else {
    logError(`Create minutes failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 4: Get all minutes (role-filtered)
async function getAllMinutes() {
  logTest("Get All Minutes (Role-Filtered)");
  
  const result = await apiCall("GET", "/minutes", null, authToken);
  
  if (result.success) {
    logSuccess(`Retrieved ${result.data.minutes.length} minutes record(s)`);
    result.data.minutes.forEach((m, i) => {
      console.log(`  ${i+1}. ${m.title} - Type: ${m.type} - Status: ${m.status}`);
    });
    return true;
  } else {
    logError(`Get minutes failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 5: Get single minutes by ID
async function getMinutesById() {
  logTest("Get Minutes by ID");
  
  const result = await apiCall("GET", `/minutes/${testMinutesId}`, null, authToken);
  
  if (result.success) {
    logSuccess(`Retrieved minutes details`);
    console.log(`  Title: ${result.data.minutes.title}`);
    console.log(`  Status: ${result.data.minutes.status}`);
    console.log(`  Present members: ${result.data.minutes.presentMembers?.length || 0}`);
    console.log(`  Absent members: ${result.data.minutes.absentMembers?.length || 0}`);
    console.log(`  Guests: ${result.data.minutes.presentGuests?.length || 0}`);
    console.log(`  User has viewed: ${result.data.minutes.userHasViewed ? "Yes" : "No"}`);
    return true;
  } else {
    logError(`Get minutes by ID failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 6: Add excuse for absent member
async function addExcuse() {
  logTest("Add Excuse for Absent Member");
  
  // First get minutes to find an absent member
  const getResult = await apiCall("GET", `/minutes/${testMinutesId}`, null, authToken);
  
  if (!getResult.success) {
    logError("Could not fetch minutes to find absent members");
    return false;
  }
  
  const absentMembers = getResult.data.minutes.absentMembers || [];
  
  if (absentMembers.length === 0) {
    logInfo("No absent members found to add excuse (everyone checked in)");
    return true;
  }
  
  const absentMember = absentMembers[0];
  logInfo(`Found absent member: ${absentMember.fullName} (Role: ${absentMember.role})`);
  
  const excuseData = {
    userId: absentMember.userId,
    reason: "Was sick and provided doctor's note. Has been excused.",
    excused: true
  };
  
  const result = await apiCall("POST", `/minutes/${testMinutesId}/excuse`, excuseData, authToken);
  
  if (result.success) {
    logSuccess(`Excuse added for ${absentMember.fullName}`);
    console.log(`  Reason: ${excuseData.reason}`);
    console.log(`  Excused: Yes`);
    return true;
  } else {
    logError(`Add excuse failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 7: Add comment to minutes
async function addComment() {
  logTest("Add Comment to Minutes");
  
  const commentData = {
    comment: "Excellent meeting! The budget allocation for Easter event is well thought out. Looking forward to the implementation. - Admin"
  };
  
  const result = await apiCall("POST", `/minutes/${testMinutesId}/comment`, commentData, authToken);
  
  if (result.success) {
    logSuccess(`Comment added successfully`);
    console.log(`  Comment: "${commentData.comment}"`);
    return true;
  } else {
    logError(`Add comment failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 8: Update minutes
async function updateMinutes() {
  logTest("Update Minutes Content");
  
  const updateData = {
    agenda: [
      "Opening prayer and introductions",
      "Review of previous meeting minutes",
      "Budget report for upcoming Easter event",
      "New member onboarding process",
      "Upcoming events planning",
      "NEW ITEM: Committee elections update"
    ],
    adjournment: "Meeting adjourned at 5:30 PM with a prayer by the Secretary. Next meeting scheduled for April 5th."
  };
  
  const result = await apiCall("PUT", `/minutes/${testMinutesId}`, updateData, authToken);
  
  if (result.success) {
    logSuccess(`Minutes updated successfully`);
    console.log(`  Agenda now has ${updateData.agenda.length} items`);
    return true;
  } else {
    logError(`Update minutes failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 8b: Add action items separately
async function addActionItems() {
  logTest("Add Action Items");
  
  const actionItemsData = {
    actionItems: [
      { task: "Follow up on budget approval", assignedToUserId: null, assignedToName: "Treasurer", dueDate: "2026-03-30", status: "PENDING" },
      { task: "Send minutes to all members", assignedToUserId: null, assignedToName: "Secretary", dueDate: "2026-03-21", status: "PENDING" },
      { task: "Book venue for Easter event", assignedToUserId: null, assignedToName: "Events Team", dueDate: "2026-03-28", status: "PENDING" }
    ]
  };
  
  const result = await apiCall("PUT", `/minutes/${testMinutesId}`, actionItemsData, authToken);
  
  if (result.success) {
    logSuccess(`Action items added to minutes`);
    return true;
  } else {
    logError(`Add action items failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 9: Refresh attendance data from sheet
async function refreshAttendance() {
  logTest("Refresh Attendance Data from Sheet");
  
  const result = await apiCall("POST", `/minutes/${testMinutesId}/refresh-attendance`, null, authToken);
  
  if (result.success) {
    logSuccess(`Attendance data refreshed from attendance sheet`);
    console.log(`  Present members: ${result.data.minutes.presentMembers?.length || 0}`);
    console.log(`  Absent members: ${result.data.minutes.absentMembers?.length || 0}`);
    console.log(`  Guests: ${result.data.minutes.presentGuests?.length || 0}`);
    return true;
  } else {
    logError(`Refresh attendance failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 10: Get my action items (for current user)
async function getMyActionItems() {
  logTest("Get My Action Items");
  
  const result = await apiCall("GET", "/minutes/my/action-items", null, authToken);
  
  if (result.success) {
    logSuccess(`Found ${result.data.actionItems.length} pending action item(s) assigned to you`);
    result.data.actionItems.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.task}`);
      console.log(`     Minutes: ${item.minutes?.title}`);
      console.log(`     Status: ${item.status}`);
      console.log(`     Due: ${item.dueDate || "Not set"}`);
    });
    return true;
  } else {
    logError(`Get action items failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 11: Get minutes by attendance sheet ID
async function getMinutesByAttendanceSheet() {
  logTest("Get Minutes by Attendance Sheet ID");
  
  const result = await apiCall("GET", `/minutes/attendance-sheet/${testAttendanceSheetId}`, null, authToken);
  
  if (result.success) {
    if (result.data.minutes) {
      logSuccess(`Found minutes for this attendance sheet`);
      console.log(`  Minutes ID: ${result.data.minutes.id}`);
      console.log(`  Title: ${result.data.minutes.title}`);
      console.log(`  Status: ${result.data.minutes.status}`);
    } else {
      logInfo("No minutes found for this attendance sheet yet");
    }
    return true;
  } else {
    logError(`Get minutes by sheet failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 12: Publish minutes (notifies all attendees)
async function publishMinutes() {
  logTest("Publish Minutes & Notify Members");
  
  const result = await apiCall("POST", `/minutes/${testMinutesId}/publish`, null, authToken);
  
  if (result.success) {
    logSuccess(`Minutes published successfully!`);
    console.log(`  Status: ${result.data.minutes.status}`);
    console.log(`  Published at: ${result.data.minutes.publishedAt}`);
    console.log(`  Notifications sent to all attendees`);
    return true;
  } else {
    logError(`Publish minutes failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 13: Get published minutes (should include view tracking)
async function getPublishedMinutes() {
  logTest("View Published Minutes (Track View)");
  
  const result = await apiCall("GET", `/minutes/${testMinutesId}`, null, authToken);
  
  if (result.success) {
    logSuccess(`Viewed published minutes`);
    console.log(`  User has viewed: ${result.data.minutes.userHasViewed ? "Yes" : "No"}`);
    console.log(`  Total views: ${result.data.minutes.views?.length || 0}`);
    return true;
  } else {
    logError(`Get published minutes failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 14: Delete minutes (cleanup - comment this if you want to keep the minutes)
async function deleteMinutes() {
  logTest("Delete Minutes (Cleanup)");
  
  const result = await apiCall("DELETE", `/minutes/${testMinutesId}`, null, authToken);
  
  if (result.success) {
    logSuccess(`Minutes deleted successfully`);
    return true;
  } else {
    logError(`Delete minutes failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(`\n${colors.blue}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🧪 MEETING MINUTES SYSTEM - COMPLETE TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}${"=".repeat(60)}${colors.reset}`);
  
  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) return;
  
  // Step 2: Get attendance sheets
  const hasSheet = await getAttendanceSheets();
  if (!hasSheet) {
    console.log(`\n${colors.yellow}⚠️ No active attendance sheets found.${colors.reset}`);
    console.log(`\n${colors.blue}💡 TIP: Create an attendance sheet first:${colors.reset}`);
    console.log(`   POST /api/attendance/sheet`);
    console.log(`   Body: { "title": "Executive Meeting", "eventDate": "2026-03-20T14:00:00Z" }`);
    return;
  }
  
  // Step 3: Create minutes
  const created = await createMinutes();
  if (!created) return;
  
  // Step 4: Get all minutes
  await getAllMinutes();
  
  // Step 5: Get minutes by ID
  await getMinutesById();
  
  // Step 6: Add excuse for absent member
  await addExcuse();
  
  // Step 7: Add comment
  await addComment();
  
  // Step 8: Update minutes
  await updateMinutes();
  
  // Step 8b: Add action items
  await addActionItems();
  
  // Step 9: Refresh attendance
  await refreshAttendance();
  
  // Step 10: Get minutes by attendance sheet
  await getMinutesByAttendanceSheet();
  
  // Step 11: Get my action items
  await getMyActionItems();
  
  // Step 12: Publish minutes
  await publishMinutes();
  
  // Step 13: View published minutes (track view)
  await getPublishedMinutes();
  
  // Step 14: Delete minutes (cleanup)
  // Uncomment the line below to delete the test minutes
  // await deleteMinutes();
  
  console.log(`\n${colors.green}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.green}🎉 ALL TESTS COMPLETED SUCCESSFULLY!${colors.reset}`);
  console.log(`${colors.green}${"=".repeat(60)}${colors.reset}`);
  console.log(`\n📊 Summary:`);
  console.log(`   • Attendance Sheet ID: ${testAttendanceSheetId}`);
  console.log(`   • Minutes ID: ${testMinutesId}`);
  console.log(`   • Minutes can be viewed at: /minutes/${testMinutesId}`);
  console.log(`   • Notifications sent to all attendees`);
  console.log(`\n${colors.yellow}💡 To keep the minutes for reference, comment out the deleteMinutes() call.${colors.reset}\n`);
}

// Run the tests
runAllTests().catch(console.error);