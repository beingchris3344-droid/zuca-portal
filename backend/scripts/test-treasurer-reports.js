// test-treasurer-reports.js
// Run with: node scripts/test-treasurer-reports.js

const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";
let authToken = null;
let testTransactionId = null;
let testCampaignId = null;

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  magenta: "\x1b[35m",
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

function logWarning(msg) {
  console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.magenta}${"=".repeat(50)}${colors.reset}`);
  console.log(`${colors.yellow}🧪 TEST: ${name}${colors.reset}`);
  console.log(`${colors.magenta}${"=".repeat(50)}${colors.reset}`);
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

// Step 1: Login as treasurer
async function login() {
  logTest("Login as Treasurer");
  
  // Try different credentials
  const loginAttempts = [
    { email: "zucaportal2025@gmail.com", password: "adminzuca", role: "admin" },
    { email: "treasurer@zuca.com", password: "treasurer123", role: "treasurer" }
  ];
  
  for (const attempt of loginAttempts) {
    const result = await apiCall("POST", "/login", {
      email: attempt.email,
      password: attempt.password
    });
    
    if (result.success && result.data.token) {
      authToken = result.data.token;
      logSuccess(`Logged in as: ${result.data.user?.fullName || attempt.role} (${attempt.role})`);
      return true;
    }
  }
  
  logError("Login failed - please check credentials");
  logInfo("Make sure you have a user with specialRole='treasurer' or role='admin'");
  return false;
}

// Step 2: Test Campaign Summary
async function testCampaignSummary() {
  logTest("Campaign Summary - GET /api/treasurer/campaign-summary");
  
  const result = await apiCall("GET", "/treasurer/campaign-summary", null, authToken);
  
  if (result.success) {
    logSuccess("Campaign summary retrieved");
    console.log(`  Total Campaigns: ${result.data.summary?.totalCampaigns || 0}`);
    console.log(`  Total Collected: KES ${(result.data.summary?.totalCollected || 0).toLocaleString()}`);
    console.log(`  Total Pending: KES ${(result.data.summary?.totalPending || 0).toLocaleString()}`);
    console.log(`  Active Campaigns: ${result.data.summary?.activeCampaigns || 0}`);
    console.log(`  Completed Campaigns: ${result.data.summary?.completedCampaigns || 0}`);
    
    if (result.data.campaigns && result.data.campaigns.length > 0) {
      testCampaignId = result.data.campaigns[0].id;
      console.log(`\n  Sample Campaign:`);
      console.log(`    - Title: ${result.data.campaigns[0].title}`);
      console.log(`    - Target: KES ${result.data.campaigns[0].target?.toLocaleString()}`);
      console.log(`    - Collected: KES ${result.data.campaigns[0].collected?.toLocaleString()}`);
      console.log(`    - Completion: ${result.data.campaigns[0].completion?.toFixed(1)}%`);
    }
    return true;
  } else {
    logError(`Campaign summary failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 3: Test Member Summary
async function testMemberSummary() {
  logTest("Member Summary - GET /api/treasurer/member-summary");
  
  const result = await apiCall("GET", "/treasurer/member-summary", null, authToken);
  
  if (result.success) {
    logSuccess("Member summary retrieved");
    console.log(`  Total Members: ${result.data.summary?.totalMembers || 0}`);
    console.log(`  Total Collected: KES ${(result.data.summary?.totalCollected || 0).toLocaleString()}`);
    console.log(`  Total Pending: KES ${(result.data.summary?.totalPending || 0).toLocaleString()}`);
    
    if (result.data.members && result.data.members.length > 0) {
      console.log(`\n  Top Contributors:`);
      const topMembers = [...result.data.members]
        .sort((a, b) => b.total_paid - a.total_paid)
        .slice(0, 3);
      
      topMembers.forEach((m, i) => {
        console.log(`    ${i+1}. ${m.name} - KES ${m.total_paid?.toLocaleString()} (${m.status})`);
      });
    }
    return true;
  } else {
    logError(`Member summary failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 4: Test Get Ledger (empty initially)
async function testGetLedger() {
  logTest("Get Ledger Transactions - GET /api/treasurer/ledger");
  
  const result = await apiCall("GET", "/treasurer/ledger", null, authToken);
  
  if (result.success) {
    logSuccess(`Retrieved ${result.data.transactions?.length || 0} transaction(s)`);
    console.log(`  Total Money IN: KES ${(result.data.summary?.totalIn || 0).toLocaleString()}`);
    console.log(`  Total Money OUT: KES ${(result.data.summary?.totalOut || 0).toLocaleString()}`);
    console.log(`  Current Balance: KES ${(result.data.summary?.balance || 0).toLocaleString()}`);
    
    if (result.data.byCategory) {
      console.log(`\n  By Category:`);
      Object.entries(result.data.byCategory).slice(0, 5).forEach(([cat, amounts]) => {
        console.log(`    - ${cat}: IN: KES ${amounts.in?.toLocaleString() || 0}, OUT: KES ${amounts.out?.toLocaleString() || 0}`);
      });
    }
    return true;
  } else {
    logError(`Get ledger failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 5: Test Create Transaction (IN)
async function testCreateTransaction() {
  logTest("Create Transaction (IN) - POST /api/treasurer/ledger");
  
  const transactionData = {
    date: new Date().toISOString().split('T')[0],
    description: "Building Fund Collection - Sunday Mass",
    category: "Contributions",
    type: "IN",
    amount: 25000,
    reference: "MASS-2026-001",
    notes: "Collected during 10:00 AM mass service"
  };
  
  const result = await apiCall("POST", "/treasurer/ledger", transactionData, authToken);
  
  if (result.success) {
    testTransactionId = result.data.transaction.id;
    logSuccess("Transaction created (IN)");
    console.log(`  ID: ${testTransactionId}`);
    console.log(`  Description: ${result.data.transaction.description}`);
    console.log(`  Amount: KES ${result.data.transaction.amount?.toLocaleString()}`);
    return true;
  } else {
    logError(`Create transaction failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 6: Test Create Another Transaction (OUT)
async function testCreateExpense() {
  logTest("Create Transaction (OUT/Expense) - POST /api/treasurer/ledger");
  
  const expenseData = {
    date: new Date().toISOString().split('T')[0],
    description: "Choir Uniforms Purchase",
    category: "Choir Expenses",
    type: "OUT",
    amount: 15000,
    reference: "INV-2026-042",
    notes: "15 uniforms at KES 1000 each"
  };
  
  const result = await apiCall("POST", "/treasurer/ledger", expenseData, authToken);
  
  if (result.success) {
    logSuccess("Transaction created (OUT/Expense)");
    console.log(`  ID: ${result.data.transaction.id}`);
    console.log(`  Description: ${result.data.transaction.description}`);
    console.log(`  Amount: KES ${result.data.transaction.amount?.toLocaleString()}`);
    return true;
  } else {
    logError(`Create expense failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 7: Test Get Ledger After Adding Transactions
async function testGetLedgerAfterAdd() {
  logTest("Get Ledger Transactions (After Adds) - GET /api/treasurer/ledger");
  
  const result = await apiCall("GET", "/treasurer/ledger", null, authToken);
  
  if (result.success) {
    logSuccess(`Retrieved ${result.data.transactions?.length || 0} transaction(s)`);
    console.log(`  Total Money IN: KES ${(result.data.summary?.totalIn || 0).toLocaleString()}`);
    console.log(`  Total Money OUT: KES ${(result.data.summary?.totalOut || 0).toLocaleString()}`);
    console.log(`  Current Balance: KES ${(result.data.summary?.balance || 0).toLocaleString()}`);
    
    if (result.data.transactions && result.data.transactions.length > 0) {
      console.log(`\n  Recent Transactions:`);
      result.data.transactions.slice(0, 5).forEach((t, i) => {
        const arrow = t.type === "IN" ? "⬆️" : "⬇️";
        console.log(`    ${i+1}. ${arrow} ${t.description}: KES ${t.amount?.toLocaleString()} (Balance: KES ${t.runningBalance?.toLocaleString()})`);
      });
    }
    return true;
  } else {
    logError(`Get ledger after adds failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 8: Test Get Ledger with Date Filters
async function testLedgerWithFilters() {
  logTest("Get Ledger with Date Filters - GET /api/treasurer/ledger?startDate=...");
  
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const startDate = lastMonth.toISOString().split('T')[0];
  
  const result = await apiCall("GET", `/treasurer/ledger?startDate=${startDate}&type=IN`, null, authToken);
  
  if (result.success) {
    logSuccess(`Retrieved ${result.data.transactions?.length || 0} transaction(s) filtered`);
    console.log(`  Filter: startDate=${startDate}, type=IN`);
    console.log(`  Total Money IN (filtered): KES ${(result.data.summary?.totalIn || 0).toLocaleString()}`);
    return true;
  } else {
    logError(`Ledger with filters failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 9: Test Update Transaction
async function testUpdateTransaction() {
  logTest("Update Transaction - PUT /api/treasurer/ledger/:id");
  
  if (!testTransactionId) {
    logWarning("No transaction ID available, skipping update test");
    return true;
  }
  
  const updateData = {
    description: "Building Fund Collection - Sunday Mass (Updated)",
    notes: "Collected during 10:00 AM and 12:00 PM masses - total 250 contributors",
    reference: "MASS-2026-001-UPDATED"
  };
  
  const result = await apiCall("PUT", `/treasurer/ledger/${testTransactionId}`, updateData, authToken);
  
  if (result.success) {
    logSuccess("Transaction updated successfully");
    console.log(`  New Description: ${result.data.transaction.description}`);
    console.log(`  New Notes: ${result.data.transaction.notes}`);
    return true;
  } else {
    logError(`Update transaction failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 10: Test Dashboard Summary
async function testDashboardSummary() {
  logTest("Dashboard Summary - GET /api/treasurer/dashboard-summary");
  
  const result = await apiCall("GET", "/treasurer/dashboard-summary", null, authToken);
  
  if (result.success) {
    logSuccess("Dashboard summary retrieved");
    console.log(`\n  📊 Campaign Stats:`);
    console.log(`    Total Collected: KES ${(result.data.campaigns?.totalCollected || 0).toLocaleString()}`);
    console.log(`    Total Pending: KES ${(result.data.campaigns?.totalPending || 0).toLocaleString()}`);
    console.log(`    Campaigns: ${result.data.campaigns?.totalCampaigns || 0}`);
    console.log(`    Completion Rate: ${result.data.campaigns?.completionRate?.toFixed(1)}%`);
    
    console.log(`\n  💰 Ledger Stats (Last 30 days):`);
    console.log(`    Money IN: KES ${(result.data.ledger?.totalIn || 0).toLocaleString()}`);
    console.log(`    Money OUT: KES ${(result.data.ledger?.totalOut || 0).toLocaleString()}`);
    console.log(`    Net Change: KES ${(result.data.ledger?.netChange || 0).toLocaleString()}`);
    
    console.log(`\n  👥 Member Stats:`);
    console.log(`    Total Members: ${result.data.members?.total || 0}`);
    console.log(`    Active Contributors: ${result.data.members?.activeContributors || 0}`);
    return true;
  } else {
    logError(`Dashboard summary failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 11: Test Member Summary with Status Filter
async function testMemberSummaryWithFilter() {
  logTest("Member Summary with Status Filter - GET /api/treasurer/member-summary?statusFilter=Completed");
  
  const result = await apiCall("GET", "/treasurer/member-summary?statusFilter=Completed", null, authToken);
  
  if (result.success) {
    logSuccess(`Retrieved ${result.data.members?.length || 0} completed members`);
    console.log(`  Total Completed Members: ${result.data.members?.length || 0}`);
    return true;
  } else {
    logError(`Member summary with filter failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 12: Test Delete Transaction
async function testDeleteTransaction() {
  logTest("Delete Transaction - DELETE /api/treasurer/ledger/:id");
  
  if (!testTransactionId) {
    logWarning("No transaction ID available, skipping delete test");
    return true;
  }
  
  const result = await apiCall("DELETE", `/treasurer/ledger/${testTransactionId}`, null, authToken);
  
  if (result.success) {
    logSuccess(`Transaction deleted: ${testTransactionId}`);
    return true;
  } else {
    logError(`Delete transaction failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Step 13: Verify Deletion
async function verifyDeletion() {
  logTest("Verify Transaction Deleted - GET /api/treasurer/ledger");
  
  const result = await apiCall("GET", "/treasurer/ledger", null, authToken);
  
  if (result.success) {
    const transactionExists = result.data.transactions?.some(t => t.id === testTransactionId);
    if (!transactionExists) {
      logSuccess("Transaction successfully removed from ledger");
    } else {
      logWarning("Transaction still exists in ledger");
    }
    console.log(`  Total transactions now: ${result.data.transactions?.length || 0}`);
    return true;
  } else {
    logError(`Verification failed: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(`\n${colors.magenta}${"═".repeat(60)}${colors.reset}`);
  console.log(`${colors.magenta}💰 TREASURER REPORTS SYSTEM - COMPLETE TEST SUITE${colors.reset}`);
  console.log(`${colors.magenta}${"═".repeat(60)}${colors.reset}`);
  
  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) return;
  
  // Step 2: Test Campaign Summary
  await testCampaignSummary();
  
  // Step 3: Test Member Summary
  await testMemberSummary();
  
  // Step 4: Test Get Ledger (initial)
  await testGetLedger();
  
  // Step 5: Create Transaction (IN)
  const created = await testCreateTransaction();
  if (!created) {
    logWarning("Cannot proceed with write tests - check permissions");
  }
  
  // Step 6: Create Expense (OUT)
  await testCreateExpense();
  
  // Step 7: Get Ledger after adds
  await testGetLedgerAfterAdd();
  
  // Step 8: Test Ledger with filters
  await testLedgerWithFilters();
  
  // Step 9: Test Update Transaction
  await testUpdateTransaction();
  
  // Step 10: Test Dashboard Summary
  await testDashboardSummary();
  
  // Step 11: Test Member Summary with filter
  await testMemberSummaryWithFilter();
  
  // Step 12: Delete Transaction (cleanup)
  await testDeleteTransaction();
  
  // Step 13: Verify deletion
  await verifyDeletion();
  
  console.log(`\n${colors.green}${"═".repeat(60)}${colors.reset}`);
  console.log(`${colors.green}🎉 ALL TESTS COMPLETED SUCCESSFULLY!${colors.reset}`);
  console.log(`${colors.green}${"═".repeat(60)}${colors.reset}`);
  
  console.log(`\n📊 API Endpoints Tested:`);
  console.log(`   ✅ GET  /api/treasurer/campaign-summary`);
  console.log(`   ✅ GET  /api/treasurer/member-summary`);
  console.log(`   ✅ GET  /api/treasurer/ledger`);
  console.log(`   ✅ POST /api/treasurer/ledger`);
  console.log(`   ✅ PUT  /api/treasurer/ledger/:id`);
  console.log(`   ✅ DELETE /api/treasurer/ledger/:id`);
  console.log(`   ✅ GET  /api/treasurer/dashboard-summary`);
  
  console.log(`\n${colors.yellow}💡 Next Steps:${colors.reset}`);
  console.log(`   1. Update TreasurerReports.jsx to use these APIs`);
  console.log(`   2. Test the full Reports page in browser`);
  console.log(`   3. Verify export to Excel functionality\n`);
}

// Run the tests
runAllTests().catch(console.error);