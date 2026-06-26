const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");

const IBM_API_KEY = process.env.IBM_API_KEY || "your-secret-key-here";
const { sendPersonalizedEmail } = require("../services/mailer");

async function createNotification({ userId, type, title, message, data = {} }) {
  const notif = await prisma.notification.create({
    data: {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      data: data
    }
  });
  return notif;
}

function authenticateIBM(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === IBM_API_KEY) {
    return next();
  }
  res.status(401).json({
    resultCode: 1,
    message: "Authentication failed. Invalid API key.",
  });
}

function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.post("/webhook", authenticateIBM, async (req, res) => {
  try {
    const { paymentType, amount, currency, transactionReference, transactionDate, additions } = req.body;

    const mpesaCode = additions?.externalRefNumber || transactionReference;
    const payerName = additions?.payerName || null;
    const payerPhone = additions?.payerMobileNumber || null;

    if (!mpesaCode || !amount) {
      return res.status(400).json({
        resultCode: 1,
        resultDesc: "Missing required fields: mpesaCode or amount",
        erpRefId: null,
      });
    }

    const existing = await prisma.bankPayment.findUnique({
      where: { mpesaCode },
    });

    if (existing) {
      return res.status(200).json({
        resultCode: 0,
        resultDesc: "Payment already recorded",
        erpRefId: existing.id,
      });
    }

    let userId = null;
    let status = "UNCLAIMED";

    if (payerPhone) {
      const user = await prisma.user.findFirst({
        where: { phone: payerPhone },
      });
      if (user) {
        userId = user.id;
        status = "AUTO_MATCHED";
      }
    }

    const bankPayment = await prisma.bankPayment.create({
      data: {
        mpesaCode,
        amount,
        payerName,
        payerPhone,
        paymentDate: new Date(transactionDate || Date.now()),
        paymentType: paymentType || "MPESA",
        status,
        userId,
      },
    });

    if (userId && status === "AUTO_MATCHED") {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    const io = req.app.get("io");

    // SAVE TO DATABASE
    await createNotification({
      userId: userId,
      type: "payment_received",
      title: "💰 Payment Received!",
      message: `We received KES ${amount} from you. Go to Contributions page to claim it.`,
      data: { amount, code: mpesaCode }
    });

    // SEND EMAIL TO USER
    if (user.email) {
      (async () => {
        try {
          await sendPersonalizedEmail(
            { email: user.email, fullName: user.fullName },
            "payment_received",
            `💰 Payment Received - KES ${amount}`,
            `Dear ${user.fullName},\n\nWe have received KES ${amount} from you.\n\nTo claim this payment, please:\n1. Log in to ZUCA Portal\n2. Go to Contributions page\n3. Paste this M-PESA code: ${mpesaCode}\n\nTumsifu Yesu Kristu! 🙏`,
            { amount, code: mpesaCode }
          );
        } catch (err) {
          console.error("Failed to send email:", err.message);
        }
      })();
    }

    // SOCKET.IO NOTIFICATIONS
    if (io) {
      setTimeout(() => {
        try {
          io.to(userId).emit("new_notification", {
            type: "payment_received",
            title: "💰 Payment Received!",
            message: `We received KES ${amount} from you. Go to Contributions page to claim it.`,
            data: { amount, code: mpesaCode },
            createdAt: new Date().toISOString(),
          });

          // Admins
          const notifyAdmins = async () => {
            const admins = await prisma.user.findMany({
              where: { role: "admin" },
              select: { id: true },
            });
            for (const admin of admins) {
              io.to(admin.id).emit("new_notification", {
                type: "payment_received_admin",
                title: "💰 New Payment Received",
                message: `${user.fullName} paid KES ${amount} (Code: ${mpesaCode})`,
                data: { amount, code: mpesaCode, userId, payerName: user.fullName },
                createdAt: new Date().toISOString(),
              });
            }
          };
          notifyAdmins();

          // Treasurers
          const notifyTreasurers = async () => {
            const treasurers = await prisma.user.findMany({
              where: { specialRole: "treasurer" },
              select: { id: true },
            });
            for (const treasurer of treasurers) {
              io.to(treasurer.id).emit("new_notification", {
                type: "payment_received_admin",
                title: "💰 New Payment Received",
                message: `${user.fullName} paid KES ${amount} (Code: ${mpesaCode})`,
                data: { amount, code: mpesaCode, userId, payerName: user.fullName },
                createdAt: new Date().toISOString(),
              });
            }
          };
          notifyTreasurers();

        } catch (err) {
          console.error("Webhook notification error:", err);
        }
      }, 100);
    }
  }
}

    res.status(201).json({
      resultCode: 0,
      resultDesc: "Payment received successfully",
      erpRefId: bankPayment.id,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({
      resultCode: 1,
      resultDesc: "Internal server error",
      erpRefId: null,
    });
  }
});

router.post("/validate", authenticateIBM, async (req, res) => {
  try {
    const { customerRef } = req.body;

    if (!customerRef) {
      return res.status(400).json({
        resultCode: 1,
        message: "customerRef is required",
        customerName: "",
        customerRef: "",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ membership_number: customerRef }, { id: customerRef }],
      },
    });

    if (user) {
      res.json({
        resultCode: 0,
        message: "Customer found",
        customerName: user.fullName,
        customerRef: user.membership_number || user.id,
      });
    } else {
      res.status(404).json({
        resultCode: 1,
        message: "Customer not found",
        customerName: "",
        customerRef: "",
      });
    }
  } catch (err) {
    console.error("Validate error:", err);
    res.status(500).json({
      resultCode: 1,
      message: "Internal server error",
      customerName: "",
      customerRef: "",
    });
  }
});

router.get("/check-code/:code", authenticateUser, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user.userId;

   const bankPayment = await prisma.bankPayment.findFirst({
  where: {
    mpesaCode: code,
  },
});

if (!bankPayment) {
  return res.status(404).json({
    success: false,
    message: "No payment found with this code or code already claimed",
  });
}

// Check if already claimed
if (bankPayment.status === "CLAIMED") {
  return res.status(400).json({
    success: false,
    message: "This code has already been used. Please check your contributions.",
  });
}

    if (bankPayment.userId && bankPayment.userId !== userId) {
      return res.json({
        exists: false,
        message: "This payment is linked to a different user",
      });
    }

    res.json({
      exists: true,
      amount: bankPayment.amount,
      payerName: bankPayment.payerName,
      status: bankPayment.status,
      paymentId: bankPayment.id,
    });
  } catch (err) {
    console.error("Check code error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/claim", authenticateUser, async (req, res) => {
  try {
    const { code, contributionTypeId } = req.body;
    const userId = req.user.userId;

    if (!code || !contributionTypeId) {
      return res.status(400).json({
        success: false,
        message: "Code and contributionTypeId are required",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const bankPayment = await tx.bankPayment.findFirst({
        where: {
          mpesaCode: code,
          status: { in: ["UNCLAIMED", "AUTO_MATCHED"] },
        },
      });

      if (!bankPayment) {
        throw new Error("No payment found with this code or code already claimed");
      }

      if (bankPayment.userId && bankPayment.userId !== userId) {
        throw new Error("This payment is linked to a different user");
      }

      const campaign = await tx.contributionType.findUnique({
        where: { id: contributionTypeId },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      let pledge = await tx.pledge.findFirst({
        where: {
          userId,
          contributionTypeId,
        },
      });

      if (!pledge) {
        pledge = await tx.pledge.create({
          data: {
            userId,
            contributionTypeId,
            amountPaid: 0,
            pendingAmount: 0,
            status: "PENDING",
          },
        });
      }

      const newAmountPaid = pledge.amountPaid + bankPayment.amount;
      let newStatus = "APPROVED";
      if (newAmountPaid >= campaign.amountRequired) {
        newStatus = "COMPLETED";
      }

      const updatedPledge = await tx.pledge.update({
        where: { id: pledge.id },
        data: {
          amountPaid: newAmountPaid,
          pendingAmount: 0,
          status: newStatus,
        },
      });

      await tx.contributionType.update({
        where: { id: contributionTypeId },
        data: {
          collectedAmount: {
            increment: bankPayment.amount,
          },
        },
      });

      const existingPayment = await tx.payment.findFirst({
        where: { mpesaReceiptNumber: bankPayment.mpesaCode },
      });

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            amount: bankPayment.amount,
            phoneNumber: bankPayment.payerPhone || "",
            mpesaReceiptNumber: bankPayment.mpesaCode,
            status: "SUCCESS",
            userId,
            contributionTypeId,
            pledgeId: pledge.id,
            completedAt: new Date(),
          },
        });
      }

      await tx.bankPayment.update({
        where: { id: bankPayment.id },
        data: {
          status: "CLAIMED",
          userId,
          contributionTypeId,
        },
      });

      return { updatedPledge, campaignTitle: campaign.title, amount: bankPayment.amount, user: await tx.user.findUnique({ where: { id: userId } }) };
    });

    const io = req.app.get("io");

    // Get the user who claimed
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // 1. Notify the user who claimed
    await createNotification({
      userId: userId,
      type: "claim_success",
      title: "✅ Payment Claimed!",
      message: `KES ${result.amount} added to ${result.campaignTitle}`,
      data: { amount: result.amount, campaign: result.campaignTitle }
    });

    if (io) {
      io.to(userId).emit("pledge_updated", result.updatedPledge);
      io.to(userId).emit("new_notification", {
        type: "claim_success",
        title: "✅ Payment Claimed!",
        message: `KES ${result.amount} added to ${result.campaignTitle}`,
        data: { amount: result.amount, campaign: result.campaignTitle },
        createdAt: new Date().toISOString(),
      });
    }

    // Send email to user
    if (user && user.email) {
      (async () => {
        try {
          await sendPersonalizedEmail(
            { email: user.email, fullName: user.fullName },
            "payment_claimed",
            `✅ Payment Claimed: ${result.campaignTitle}`,
            `Dear ${user.fullName},\n\nYou have successfully claimed KES ${result.amount} for "${result.campaignTitle}".\n\nThank you for your contribution!\n\nTumsifu Yesu Kristu! 🙏`,
            { amount: result.amount, campaign: result.campaignTitle }
          );
        } catch (err) {
          console.error("Failed to send user email:", err.message);
        }
      })();
    }

    // 2. Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true, fullName: true, email: true }
    });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "payment_claimed_admin",
        title: "💰 Payment Claimed",
        message: `${user?.fullName || 'A user'} claimed KES ${result.amount} for "${result.campaignTitle}"`,
        data: { amount: result.amount, campaign: result.campaignTitle, userId: userId }
      });

      if (io) {
        io.to(admin.id).emit("new_notification", {
          type: "payment_claimed_admin",
          title: "💰 Payment Claimed",
          message: `${user?.fullName || 'A user'} claimed KES ${result.amount} for "${result.campaignTitle}"`,
          data: { amount: result.amount, campaign: result.campaignTitle, userId: userId },
          createdAt: new Date().toISOString(),
        });
      }

      // Send email to admin
      if (admin.email) {
        (async () => {
          try {
            await sendPersonalizedEmail(
              { email: admin.email, fullName: admin.fullName },
              "payment_claimed_admin",
              `💰 Payment Claimed: ${result.campaignTitle}`,
              `Dear ${admin.fullName},\n\n${user?.fullName || 'A user'} has claimed KES ${result.amount} for "${result.campaignTitle}".\n\nTumsifu Yesu Kristu! 🙏`,
              { amount: result.amount, campaign: result.campaignTitle, user: user?.fullName || 'A user' }
            );
          } catch (err) {
            console.error("Failed to send admin email:", err.message);
          }
        })();
      }
    }

    // 3. Notify all treasurers
    const treasurers = await prisma.user.findMany({
      where: { specialRole: "treasurer" },
      select: { id: true, fullName: true, email: true }
    });

    for (const treasurer of treasurers) {
      await createNotification({
        userId: treasurer.id,
        type: "payment_claimed_treasurer",
        title: "💰 Payment Claimed",
        message: `${user?.fullName || 'A user'} claimed KES ${result.amount} for "${result.campaignTitle}"`,
        data: { amount: result.amount, campaign: result.campaignTitle, userId: userId }
      });

      if (io) {
        io.to(treasurer.id).emit("new_notification", {
          type: "payment_claimed_treasurer",
          title: "💰 Payment Claimed",
          message: `${user?.fullName || 'A user'} claimed KES ${result.amount} for "${result.campaignTitle}"`,
          data: { amount: result.amount, campaign: result.campaignTitle, userId: userId },
          createdAt: new Date().toISOString(),
        });
      }

      // Send email to treasurer
      if (treasurer.email) {
        (async () => {
          try {
            await sendPersonalizedEmail(
              { email: treasurer.email, fullName: treasurer.fullName },
              "payment_claimed_treasurer",
              `💰 Payment Claimed: ${result.campaignTitle}`,
              `Dear ${treasurer.fullName},\n\n${user?.fullName || 'A user'} has claimed KES ${result.amount} for "${result.campaignTitle}".\n\nTumsifu Yesu Kristu! 🙏`,
              { amount: result.amount, campaign: result.campaignTitle, user: user?.fullName || 'A user' }
            );
          } catch (err) {
            console.error("Failed to send treasurer email:", err.message);
          }
        })();
      }
    }

    console.log(`✅ All notifications sent for claim ${result.amount}`);

    res.json({
      success: true,
      message: `KES ${result.amount} added to ${result.campaignTitle}`,
      pledge: result.updatedPledge,
    });
  } catch (err) {
    console.error("Claim error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
module.exports = router;