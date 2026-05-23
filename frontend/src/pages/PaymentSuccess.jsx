// frontend/src/pages/PaymentSuccess.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaCheckCircle, 
  FaEnvelope, 
  FaReceipt, 
  FaHome, 
  FaArrowRight,
  FaDownload,
  FaPrint,
  FaShare,
  FaWhatsapp
} from "react-icons/fa";
import logo from "../assets/zuca-logo.png";

function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentData, setPaymentData] = useState(null);
  
  useEffect(() => {
    // Get payment data from URL params or location state
    const params = new URLSearchParams(location.search);
    const receipt = params.get("receipt");
    const amount = params.get("amount");
    const campaign = params.get("campaign");
    
    if (receipt || location.state) {
      setPaymentData({
        receiptNumber: receipt || location.state?.receiptNumber,
        amount: amount || location.state?.amount,
        campaignTitle: campaign || location.state?.campaignTitle,
        timestamp: new Date().toLocaleString(),
        date: new Date(),
      });
    } else {
      // Fallback - try to get from localStorage
      const lastPayment = localStorage.getItem("lastPayment");
      if (lastPayment) {
        setPaymentData(JSON.parse(lastPayment));
      }
    }
  }, [location]);
  
  // Generate and download receipt as PDF
  const downloadReceipt = () => {
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ZUCA Payment Receipt</title>
        <meta charset="utf-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            background: #fff;
            padding: 40px;
            color: #333;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .receipt-header {
            background: linear-gradient(135deg, #1e3a8a, #2563eb);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .logo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin-bottom: 15px;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 14px;
            opacity: 0.9;
          }
          .receipt-body {
            padding: 30px;
          }
          .thankyou {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #1e3a8a;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .details-table tr {
            border-bottom: 1px solid #eee;
          }
          .details-table td {
            padding: 12px 8px;
          }
          .label {
            font-weight: bold;
            width: 40%;
            color: #555;
          }
          .value {
            color: #333;
          }
          .receipt-number {
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            letter-spacing: 1px;
          }
          .amount {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
          }
          .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
          }
          .signature {
            margin-top: 40px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .blessing {
            font-size: 16px;
            font-style: italic;
            color: #1e3a8a;
            margin-top: 20px;
            text-align: center;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="receipt-header">
            <img src="${logo}" alt="ZUCA Logo" class="logo" style="width:80px;height:80px;border-radius:50%;" />
            <div class="title">ZETECH UNIVERSITY CATHOLIC ACTION</div>
            <div class="subtitle">(Z.U.C.A)</div>
            <div class="subtitle">Official Payment Receipt</div>
          </div>
          
          <div class="receipt-body">
            <div class="thankyou">
              🙏 Thank You for Your Contribution! 🙏
            </div>
            
            <table class="details-table">
              <tr>
                <td class="label">📅 Date & Time:</td>
                <td class="value">${paymentData?.timestamp || new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">🏷️ Campaign:</td>
                <td class="value">${paymentData?.campaignTitle || "Contribution"}</td>
              </tr>
              <tr>
                <td class="label">💰 Amount Paid:</td>
                <td class="value amount">KES ${(paymentData?.amount || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">📱 M-PESA Receipt No.:</td>
                <td class="value receipt-number">${paymentData?.receiptNumber || "N/A"}</td>
              </tr>
              <tr>
                <td class="label">🏦 Payment Method:</td>
                <td class="value">M-PESA (Lipa Na M-PESA)</td>
              </tr>
              <tr>
                <td class="label">✅ Payment Status:</td>
                <td class="value" style="color:#10b981; font-weight:bold;">COMPLETED</td>
              </tr>
            </table>
            
            <div class="blessing">
              "God loves a cheerful giver." — 2 Corinthians 9:7
            </div>
            
            <div class="signature">
              <div>_______________________________</div>
              <div>ZUCA Treasurer / Administrator</div>
              <div style="font-size: 11px; margin-top: 5px;">Official Stamp</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Zetech University Catholic Action | Ruiru, Kenya</p>
            <p>Email: zucaportal2025@gmail.com | Website: zuca-portal.com</p>
            <p>This is an electronically generated receipt. No signature required.</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Create blob and download
    const blob = new Blob([receiptHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ZUCA_Receipt_${paymentData?.receiptNumber || Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Print receipt
  const printReceipt = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head>
        <title>ZUCA Payment Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          @media print {
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        ${document.querySelector(".receipt-content")?.innerHTML || ""}
        <script>window.print();window.close();<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // Share on WhatsApp
  const shareOnWhatsApp = () => {
    const message = `🙏 ZUCA Payment Confirmation 🙏\n\nCampaign: ${paymentData?.campaignTitle}\nAmount: KES ${(paymentData?.amount || 0).toLocaleString()}\nReceipt No: ${paymentData?.receiptNumber}\nDate: ${paymentData?.timestamp}\n\nThank you for your contribution! Tumsifu Yesu Kristu!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };
  
  return (
    <div style={styles.container}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        style={styles.card}
      >
        {/* Success Icon */}
        <div style={styles.iconContainer}>
          <FaCheckCircle style={styles.successIcon} />
        </div>
        
        <h1 style={styles.title}>Payment Successful! 🎉</h1>
        <p style={styles.subtitle}>Your contribution has been received</p>
        
        {/* ZUCA Logo */}
        <div style={styles.logoContainer}>
          <img src={logo} alt="ZUCA Logo" style={styles.logo} />
          <span style={styles.logoText}>ZUCA</span>
        </div>
        
        {/* Payment Details */}
        <div className="receipt-content" style={styles.detailsCard}>
          <h3 style={styles.detailsTitle}>Payment Details</h3>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Campaign:</span>
            <span style={styles.detailValue}>{paymentData?.campaignTitle || "Contribution"}</span>
          </div>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Amount Paid:</span>
            <span style={styles.detailValueAmount}>KES {paymentData?.amount?.toLocaleString() || "0"}</span>
          </div>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>M-PESA Receipt:</span>
            <span style={styles.detailValueCode}>{paymentData?.receiptNumber || "Processing..."}</span>
          </div>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Date & Time:</span>
            <span style={styles.detailValue}>{paymentData?.timestamp || new Date().toLocaleString()}</span>
          </div>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Payment Method:</span>
            <span style={styles.detailValue}>M-PESA (Lipa Na M-PESA)</span>
          </div>
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Status:</span>
            <span style={styles.statusBadge}>✅ COMPLETED</span>
          </div>
        </div>
        
        {/* Download Buttons */}
        <div style={styles.downloadButtons}>
          <button onClick={downloadReceipt} style={styles.downloadBtn}>
            <FaDownload /> Download Receipt
          </button>
          <button onClick={printReceipt} style={styles.printBtn}>
            <FaPrint /> Print Receipt
          </button>
          <button onClick={shareOnWhatsApp} style={styles.whatsappBtn}>
            <FaWhatsapp /> Share
          </button>
        </div>
        
        {/* Email Confirmation Message */}
        <div style={styles.emailCard}>
          <FaEnvelope style={styles.emailIcon} />
          <div>
            <p style={styles.emailText}>
              <strong>Email confirmation sent!</strong>
            </p>
            <p style={styles.emailSubtext}>
              A receipt has been sent to your registered email address.
              Please check your inbox (and spam folder).
            </p>
          </div>
        </div>
        
        {/* What Happens Next */}
        <div style={styles.nextSteps}>
          <h4 style={styles.nextStepsTitle}>What happens next?</h4>
          <ul style={styles.nextStepsList}>
            <li>✓ Your pledge has been automatically updated</li>
            <li>✓ The admin and treasurer have been notified</li>
            <li>✓ You can view your updated pledge in your dashboard</li>
          </ul>
        </div>
        
        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          <Link to="/contributions" style={styles.primaryBtn}>
            <FaHome /> View My Contributions
          </Link>
          <Link to="/dashboard" style={styles.secondaryBtn}>
            Go to Dashboard <FaArrowRight />
          </Link>
        </div>
        
        {/* Redirect Timer */}
        <p style={styles.timerText}>
          Redirecting to contributions page in 10 seconds...
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    position: "relative",
    overflow: "hidden",
  },
  card: {
    maxWidth: "550px",
    width: "100%",
    background: "white",
    borderRadius: "32px",
    padding: "40px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: "20px",
  },
  successIcon: {
    fontSize: "80px",
    color: "#10b981",
    animation: "float 2s ease-in-out infinite",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#64748b",
    marginBottom: "24px",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #e2e8f0",
  },
  logo: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "bold",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  detailsCard: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
    textAlign: "left",
  },
  detailsTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "16px",
    borderLeft: "3px solid #10b981",
    paddingLeft: "12px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "8px",
  },
  detailLabel: {
    fontSize: "14px",
    color: "#64748b",
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e293b",
  },
  detailValueAmount: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#10b981",
  },
  detailValueCode: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#10b981",
    fontFamily: "monospace",
    background: "#d1fae5",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  statusBadge: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#10b981",
  },
  downloadButtons: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  downloadBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#1e293b",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  printBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#475569",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  whatsappBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#25D366",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  emailCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    background: "#eff6ff",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
    textAlign: "left",
  },
  emailIcon: {
    fontSize: "24px",
    color: "#3b82f6",
    flexShrink: 0,
  },
  emailText: {
    fontSize: "14px",
    color: "#1e293b",
    marginBottom: "4px",
  },
  emailSubtext: {
    fontSize: "12px",
    color: "#64748b",
  },
  nextSteps: {
    background: "#fef3c7",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
    textAlign: "left",
  },
  nextStepsTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#92400e",
    marginBottom: "12px",
  },
  nextStepsList: {
    fontSize: "13px",
    color: "#78350f",
    listStyle: "none",
    paddingLeft: "0",
    lineHeight: "1.8",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  primaryBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    textDecoration: "none",
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "14px",
    transition: "transform 0.2s",
  },
  secondaryBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 20px",
    background: "#f1f5f9",
    color: "#1e293b",
    textDecoration: "none",
    borderRadius: "12px",
    fontWeight: "600",
    fontSize: "14px",
    transition: "transform 0.2s",
  },
  timerText: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "16px",
  },
};

// Add global animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;
document.head.appendChild(styleSheet);

export default PaymentSuccess;