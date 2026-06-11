const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helper: Check if user is treasurer or admin
async function isTreasurerOrAdmin(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, specialRole: true }
  });
  return user?.role === "admin" || user?.specialRole === "treasurer";
}

// ==================== 1. CAMPAIGN SUMMARY ====================
router.get("/campaign-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    // Get all contribution campaigns
    const campaigns = await prisma.contributionType.findMany({
      include: {
        pledges: {
          select: {
            amountPaid: true,
            pendingAmount: true,
            userId: true
          }
        },
        jumuia: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    // Calculate stats per campaign
    const campaignStats = campaigns.map(campaign => {
      const pledges = campaign.pledges || [];
      const totalCollected = pledges.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const totalPending = pledges.reduce((sum, p) => sum + (p.pendingAmount || 0), 0);
      const paidMembers = pledges.filter(p => (p.amountPaid || 0) > 0).length;
      const totalMembers = pledges.length;
      const completion = campaign.amountRequired > 0 ? (totalCollected / campaign.amountRequired) * 100 : 0;
      
      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        target: campaign.amountRequired,
        collected: totalCollected,
        pending: totalPending,
        paidMembers,
        totalMembers,
        completion: Math.min(completion, 100),
        jumuia: campaign.jumuia?.name || null,
        deadline: campaign.deadline,
        status: completion >= 100 ? "Completed" : totalCollected > 0 ? "Active" : "Not Started"
      };
    });
    
    // Calculate grand totals
    const grandTotalCollected = campaignStats.reduce((sum, c) => sum + c.collected, 0);
    const grandTotalPending = campaignStats.reduce((sum, c) => sum + c.pending, 0);
    const grandTotalTarget = campaignStats.reduce((sum, c) => sum + c.target, 0);
    const overallCompletion = grandTotalTarget > 0 ? (grandTotalCollected / grandTotalTarget) * 100 : 0;
    
    res.json({
      success: true,
      campaigns: campaignStats,
      summary: {
        totalCampaigns: campaignStats.length,
        totalCollected: grandTotalCollected,
        totalPending: grandTotalPending,
        totalTarget: grandTotalTarget,
        overallCompletion: overallCompletion.toFixed(1),
        activeCampaigns: campaignStats.filter(c => c.status === "Active").length,
        completedCampaigns: campaignStats.filter(c => c.status === "Completed").length
      }
    });
    
  } catch (err) {
    console.error("Error fetching campaign summary:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 2. MEMBER CONTRIBUTION SUMMARY ====================
router.get("/member-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const { search, jumuiaId, statusFilter } = req.query;
    
    // Build where clause - EXCLUDE admin users and system account
    let whereClause = {
      AND: [
        { role: { not: "admin" } },  // Exclude admin role
        { NOT: { email: { contains: "zucaportal", mode: "insensitive" } } }, // Exclude system email
        { NOT: { fullName: { contains: "ZUCA SYSTEM", mode: "insensitive" } } } // Exclude system name
      ]
    };
    
    if (search) {
      whereClause.AND.push({
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { membership_number: { contains: search, mode: "insensitive" } }
        ]
      });
    }
    if (jumuiaId && jumuiaId !== "all") {
      whereClause.jumuiaId = jumuiaId;
    }
    
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        email: true,
        membership_number: true,
        phone: true,
        jumuiaId: true,
        role: true,
        homeJumuia: { select: { name: true } },
        pledges: {
          select: {
            amountPaid: true,
            pendingAmount: true,
            contributionType: {
              select: {
                id: true,
                title: true,
                amountRequired: true
              }
            }
          }
        }
      },
      orderBy: { fullName: "asc" }
    });
    
    // Calculate member stats
    const memberStats = users.map(user => {
      let totalPaid = 0;
      let totalPending = 0;
      let campaignsParticipated = 0;
      let campaigns = [];
      
      user.pledges.forEach(pledge => {
        totalPaid += pledge.amountPaid || 0;
        totalPending += pledge.pendingAmount || 0;
        if ((pledge.amountPaid || 0) > 0 || (pledge.pendingAmount || 0) > 0) {
          campaignsParticipated++;
        }
        campaigns.push({
          campaignId: pledge.contributionType.id,
          title: pledge.contributionType.title,
          amountPaid: pledge.amountPaid || 0,
          pendingAmount: pledge.pendingAmount || 0,
          required: pledge.contributionType.amountRequired
        });
      });
      
      const status = totalPaid > 0 
        ? (totalPending > 0 ? "Partial" : "Completed") 
        : (totalPending > 0 ? "Pledged" : "No Pledge");
      
      return {
        id: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        membershipNumber: user.membership_number,
        jumuia: user.homeJumuia?.name || "None",
        role: user.role,
        total_paid: totalPaid,
        total_pending: totalPending,
        campaigns_participated: campaignsParticipated,
        status: status,
        campaigns: campaigns.slice(0, 10)
      };
    });
    
    // Filter by status if requested
    let filteredMembers = memberStats;
    if (statusFilter && statusFilter !== "all") {
      filteredMembers = memberStats.filter(m => m.status === statusFilter);
    }
    
    // Calculate totals
    const totalAllPaid = memberStats.reduce((sum, m) => sum + m.total_paid, 0);
    const totalAllPending = memberStats.reduce((sum, m) => sum + m.total_pending, 0);
    const membersWithPledges = memberStats.filter(m => m.total_paid > 0 || m.total_pending > 0).length;
    
    res.json({
      success: true,
      members: filteredMembers,
      summary: {
        totalMembers: memberStats.length,
        membersWithPledges,
        totalCollected: totalAllPaid,
        totalPending: totalAllPending,
        averagePerMember: membersWithPledges > 0 ? totalAllPaid / membersWithPledges : 0
      }
    });
    
  } catch (err) {
    console.error("Error fetching member summary:", err);
    res.status(500).json({ error: err.message });
  }
});
// ==================== 3. LEDGER TRANSACTIONS ====================
router.get("/ledger", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const { startDate, endDate, type, category } = req.query;
    
    let whereClause = {};
    
    if (startDate) {
      whereClause.date = { gte: new Date(startDate) };
    }
    if (endDate) {
      whereClause.date = { lte: new Date(endDate) };
    }
    if (type && type !== "all") {
      whereClause.type = type;
    }
    if (category && category !== "all") {
      whereClause.category = category;
    }
    
    const transactions = await prisma.treasurerTransaction.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        user: { select: { id: true, fullName: true } }
      }
    });
    
    // Calculate running balance (oldest to newest)
    let balance = 0;
    const transactionsWithBalance = [...transactions].reverse().map(t => {
      if (t.type === "IN") balance += t.amount;
      else balance -= t.amount;
      return { ...t, runningBalance: balance };
    }).reverse();
    
    // Calculate totals
    const totalIn = transactions
      .filter(t => t.type === "IN")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalOut = transactions
      .filter(t => t.type === "OUT")
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Group by category
    const byCategory = {};
    transactions.forEach(t => {
      if (!byCategory[t.category]) {
        byCategory[t.category] = { in: 0, out: 0 };
      }
      if (t.type === "IN") byCategory[t.category].in += t.amount;
      else byCategory[t.category].out += t.amount;
    });
    
    res.json({
      success: true,
      transactions: transactionsWithBalance,
      summary: {
        totalIn,
        totalOut,
        balance: totalIn - totalOut,
        count: transactions.length
      },
      byCategory
    });
    
  } catch (err) {
    console.error("Error fetching ledger:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 4. CREATE LEDGER TRANSACTION ====================
router.post("/ledger", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const { date, description, category, type, amount, reference, notes } = req.body;
    
    if (!description || !amount || !category || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    
    const transaction = await prisma.treasurerTransaction.create({
      data: {
        date: new Date(date),
        description,
        category,
        type,
        amount: parseFloat(amount),
        reference: reference || null,
        notes: notes || null,
        createdBy: userId
      },
      include: {
        user: { select: { id: true, fullName: true } }
      }
    });
    
    res.status(201).json({ success: true, transaction });
    
  } catch (err) {
    console.error("Error creating transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 5. UPDATE LEDGER TRANSACTION ====================
router.put("/ledger/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const { date, description, category, type, amount, reference, notes } = req.body;
    
    const existingTransaction = await prisma.treasurerTransaction.findUnique({
      where: { id }
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    const transaction = await prisma.treasurerTransaction.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        description: description || undefined,
        category: category || undefined,
        type: type || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        reference: reference || null,
        notes: notes || null,
        updatedAt: new Date()
      },
      include: {
        user: { select: { id: true, fullName: true } }
      }
    });
    
    res.json({ success: true, transaction });
    
  } catch (err) {
    console.error("Error updating transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 6. DELETE LEDGER TRANSACTION ====================
router.delete("/ledger/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    const existingTransaction = await prisma.treasurerTransaction.findUnique({
      where: { id }
    });
    
    if (!existingTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    await prisma.treasurerTransaction.delete({
      where: { id }
    });
    
    res.json({ success: true, message: "Transaction deleted" });
    
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 7. DASHBOARD SUMMARY (All in one) ====================
router.get("/dashboard-summary", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAuthorized = await isTreasurerOrAdmin(userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized" });
    }
    
    // Get campaign summary
    const campaigns = await prisma.contributionType.findMany({
      include: {
        pledges: {
          select: {
            amountPaid: true,
            pendingAmount: true
          }
        }
      }
    });
    
    const totalCollected = campaigns.reduce((sum, c) => 
      sum + c.pledges.reduce((s, p) => s + (p.amountPaid || 0), 0), 0);
    
    const totalPending = campaigns.reduce((sum, c) => 
      sum + c.pledges.reduce((s, p) => s + (p.pendingAmount || 0), 0), 0);
    
    // Get ledger summary (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = await prisma.treasurerTransaction.findMany({
      where: {
        date: { gte: thirtyDaysAgo }
      }
    });
    
    const ledgerIn = recentTransactions
      .filter(t => t.type === "IN")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const ledgerOut = recentTransactions
      .filter(t => t.type === "OUT")
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Get member count
    const totalMembers = await prisma.user.count();
    const membersWithPledges = await prisma.pledge.groupBy({
      by: ["userId"],
      where: {
        OR: [
          { amountPaid: { gt: 0 } },
          { pendingAmount: { gt: 0 } }
        ]
      }
    });
    
    res.json({
      success: true,
      campaigns: {
        totalCollected,
        totalPending,
        totalCampaigns: campaigns.length,
        completionRate: totalCollected + totalPending > 0 
          ? (totalCollected / (totalCollected + totalPending)) * 100 
          : 0
      },
      ledger: {
        totalIn: ledgerIn,
        totalOut: ledgerOut,
        netChange: ledgerIn - ledgerOut
      },
      members: {
        total: totalMembers,
        activeContributors: membersWithPledges.length
      }
    });
    
  } catch (err) {
    console.error("Error fetching dashboard summary:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;