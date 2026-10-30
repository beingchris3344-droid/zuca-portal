import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import SEO from "./components/SEO";
import { lazy, Suspense, useEffect, useState } from "react";
import { io } from "socket.io-client";
import BASE_URL from "./api";
import "./index.css";
import { initializeDark } from "./utils/darkReader";
import { MessengerProvider } from "./contexts/MessengerContext";

/* ===== Notification managers (small, keep eager) ===== */
import badgeManager from "./utils/badgeManager";
import pushService from "./services/pushService";

/* ===== EAGER: routing shell + landing page ===== */
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import RoleRoute from "./components/RoleRoute";
import JumuiaRoute from "./components/routing/JumuiaRoute";
import Landing2 from "./pages/landing2";
import Login from "./pages/Login";

/* ===== LAZY: public pages ===== */
const Home = lazy(() => import("./pages/Home"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiesPolicy = lazy(() => import("./pages/CookiesPolicy"));
const HelpFaq = lazy(() => import("./pages/HelpFaq"));
const FullReadings = lazy(() => import("./pages/FullReadings"));
const LiturgicalCalendar = lazy(() => import("./pages/LiturgicalCalendar"));
const Prayer = lazy(() => import("./pages/Prayer"));
const GalleryPage = lazy(() => import("./pages/gallery"));
const Landing = lazy(() => import("./pages/Landing"));
const UserManual = lazy(() => import("./pages/UserManual"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const LinkCheckin = lazy(() => import("./components/admin/attendance/LinkCheckin"));
const ScanPage = lazy(() => import("./pages/ScanPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));

/* ===== LAZY: member pages ===== */
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Announcements = lazy(() => import("./pages/Announcements"));
const MassPrograms = lazy(() => import("./pages/MassPrograms"));
const Contributions = lazy(() => import("./pages/Contributions"));
const Chat = lazy(() => import("./pages/Chat"));
const MessengerPage = lazy(() => import("./pages/MessengerPage"));
const Games = lazy(() => import("./pages/Games"));
const UserSchedules = lazy(() => import("./pages/UserSchedules"));
const UserYoutubeHub = lazy(() => import("./pages/UserYoutubeHub"));
const MySemester = lazy(() => import("./pages/MySemester"));
const HymnBook = lazy(() => import("./pages/HymnBook"));
const HymnLyrics = lazy(() => import("./pages/HymnLyrics"));
const JumuiaDashboard = lazy(() => import("./pages/JumuiaDashboard"));
const JoinJumuia = lazy(() => import("./pages/JoinJumuia"));
const JumuiaDetailPage = lazy(() => import("./pages/jumuia/JumuiaDetailPage"));
const ExecutivePage = lazy(() => import("./pages/ExecutivePage"));
const ExecutiveMinutes = lazy(() => import("./pages/ExecutiveMinutes"));
const ExecutiveMinutesView = lazy(() => import("./pages/ExecutiveMinutesView"));
const Feedback = lazy(() => import("./pages/Feedback"));
const FeedbackHistory = lazy(() => import("./pages/FeedbackHistory"));
const FeedbackDetail = lazy(() => import("./pages/FeedbackDetail"));
const MassReadingsPage = lazy(() => import("./pages/MassReadingsPage"));
const MassReadingDetail = lazy(() => import("./pages/MassReadingDetail"));
const MassReadingUpload = lazy(() => import("./pages/MassReadingUpload"));
const MassReadingEdit = lazy(() => import("./pages/MassReadingEdit"));
const MemberAttendance = lazy(() => import("./pages/member/MemberAttendance"));
const MemberAttendanceHistory = lazy(() => import("./pages/member/MemberAttendanceHistory"));
const MemberSheetPage = lazy(() => import("./pages/member/MemberSheetPage"));
const MinutesList = lazy(() => import("./pages/admin/minutes/MinutesList"));

/* ===== LAZY: games ===== */
const TicTacToe = lazy(() => import("./pages/games/TicTacToe"));
const Snake = lazy(() => import("./pages/games/Snake"));
const BibleTrivia = lazy(() => import("./pages/games/BibleTrivia"));
const Chess = lazy(() => import("./pages/games/Chess"));

/* ===== LAZY: PDF tools ===== */
const PdfToolHub = lazy(() => import("./tools/pdf/PdfToolHub"));
const ImageToPdfTool = lazy(() => import("./tools/pdf/tools/ImageToPdfTool"));
const MergeTool = lazy(() => import("./tools/pdf/tools/MergeTool"));
const RotateTool = lazy(() => import("./tools/pdf/tools/RotateTool"));
const PageNumbersTool = lazy(() => import("./tools/pdf/tools/PageNumbersTool"));
const WatermarkTool = lazy(() => import("./tools/pdf/tools/WatermarkTool"));
const SplitTool = lazy(() => import("./tools/pdf/tools/SplitTool"));
const ProtectTool = lazy(() => import("./tools/pdf/tools/ProtectTool"));
const FillSignTool = lazy(() => import("./tools/pdf/tools/FillSignTool"));

/* ===== LAZY: admin ===== */
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminHealthCentre = lazy(() => import("./pages/admin/AdminHealthCentre"));
const AdminHistory = lazy(() => import("./pages/admin/AdminHistory"));
const AdminMediaPage = lazy(() => import("./pages/admin/MediaPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const RoleManagement = lazy(() => import("./pages/admin/RoleManagement"));
const ActivityPage = lazy(() => import("./pages/admin/ActivityPage"));
const YoutubeAnalyticsPage = lazy(() => import("./pages/admin/YoutubeAnalyticsPage"));
const SongsPage = lazy(() => import("./pages/admin/SongsPage"));
const AdminHymns = lazy(() => import("./pages/admin/Hymns"));
const AnnouncementsPage = lazy(() => import("./pages/admin/AnnouncementsPage"));
const ContributionsPage = lazy(() => import("./pages/admin/ContributionsPage"));
const JumuiaManagement = lazy(() => import("./pages/admin/JumuiaManagement"));
const ChatMonitorPage = lazy(() => import("./pages/admin/ChatMonitorPage"));
const SecurityPage = lazy(() => import("./pages/admin/SecurityPage"));
const PendingSongs = lazy(() => import("./pages/admin/PendingSongs"));
const OCRScannerPage = lazy(() => import("./pages/admin/OCRScanner"));
const AddHymn = lazy(() => import("./pages/admin/AddHymn"));
const AdminSchedules = lazy(() => import("./pages/admin/AdminSchedules"));
const AdminMessenger = lazy(() => import("./pages/admin/AdminMessenger"));
const AdminAttendance = lazy(() => import("./components/admin/attendance/AdminAttendance"));
const AdminAttendanceDetails = lazy(() => import("./pages/admin/AdminAttendanceDetails"));
const AdminPrayers = lazy(() => import("./pages/admin/AdminPrayers"));
const MinutesCreatePage = lazy(() => import("./pages/admin/minutes/MinutesCreatePage"));
const MinutesEditPage = lazy(() => import("./pages/admin/minutes/MinutesEditPage"));
const MinutesViewPage = lazy(() => import("./pages/admin/minutes/MinutesViewPage"));
const AddMemberPage = lazy(() => import("./pages/admin/attendance/AddMemberPage"));
const AdminAttendanceOverview = lazy(() => import("./pages/admin/attendance/AdminAttendanceOverview"));
const AdminMemberDetail = lazy(() => import("./pages/admin/attendance/AdminMemberDetail"));
const EmailManagement = lazy(() => import("./pages/admin/EmailManagement"));
const EmailDashboard = lazy(() => import("./pages/admin/EmailDashboard"));
const WhatsAppBot = lazy(() => import("./pages/admin/WhatsAppBot"));
const MessageHistory = lazy(() => import("./pages/admin/MessageHistory"));
const AdminFeedback = lazy(() => import("./pages/admin/AdminFeedback"));
const AdminFeedbackDetail = lazy(() => import("./pages/admin/AdminFeedbackDetail"));
const CountdownSettings = lazy(() => import("./pages/admin/CountdownSettings"));
const Advertisements = lazy(() => import("./pages/admin/Advertisements"));
const BirthdayManagement = lazy(() => import("./pages/admin/BirthdayManagement"));
const TickerManager = lazy(() => import("./pages/admin/TickerManager"));
const AdminSemesterPage = lazy(() => import("./pages/admin/AdminSemesterPage"));
const AdminExecutivePage = lazy(() => import("./pages/admin/AdminExecutivePage"));
const BankPayments = lazy(() => import("./pages/BankPayments"));

/* ===== LAZY: role layouts & pages ===== */
const RoleLayout = lazy(() => import("./pages/role/RoleLayout"));
const TreasurerReports = lazy(() => import("./pages/treasurer/TreasurerReports"));
const TreasurerNotes = lazy(() => import("./pages/treasurer/TreasurerNotes"));
const ChoirWhatsAppBroadcast = lazy(() => import("./pages/choir/ChoirWhatsAppBroadcast"));

/* ===== LAZY: AI assistants (heavy) ===== */
const ZucaAIAssistant = lazy(() => import("./components/ZucaAIAssistant"));
const AdminAIAssistant = lazy(() => import("./components/AdminAIAssistant"));

/* ===== LAZY: global update notifier ===== */
const UpdateNotification = lazy(() => import("./components/UpdateNotification"));

/* ===== Page loader ===== */
function PageLoader() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        color: "#64748b",
      }}
    >
      Loading…
    </div>
  );
}

/* ===== Singleton socket — created lazily, SAME config as before ===== */
let socketInstance = null;
function getSocket() {
  if (!socketInstance) {
    socketInstance = io(BASE_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socketInstance;
}

function AppContent() {
  const navigate = useNavigate();
  const [showAI, setShowAI] = useState(false);
  const [isAIFullPage, setIsAIFullPage] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  /* ✅ SERVICE WORKER UPDATE DETECTION - SILENT MODE (unchanged) */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      });
    }
  }, []);

  /* Listen for User AI open events (unchanged) */
  useEffect(() => {
    const handleOpenUserAI = (event) => {
      console.log("👤 Opening User AI");
      setShowAI(true);
      setIsAIFullPage(event.detail?.fullPage || true);
    };
    window.addEventListener("openZUCAI", handleOpenUserAI);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }

    return () => window.removeEventListener("openZUCAI", handleOpenUserAI);
  }, []);

  /* Listen for Admin AI open events (unchanged) */
  useEffect(() => {
    const handleOpenAdminAI = (event) => {
      console.log("👑 Opening Admin AI");
      setShowAI(true);
      setIsAIFullPage(event.detail?.fullPage || true);
    };
    window.addEventListener("openAdminAI", handleOpenAdminAI);
    return () => window.removeEventListener("openAdminAI", handleOpenAdminAI);
  }, []);

  /* Update user when storage changes (unchanged) */
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  /* Socket.IO connection setup — SAME logic, just uses getSocket() */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      try {
        const userData = JSON.parse(user);
        getSocket().emit("join", userData.id);
        console.log("📡 Joined socket room for user:", userData.id);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }

    const socket = getSocket();

    socket.on("new_notification", (notification) => {
      console.log("🔔 New notification received:", notification);
      badgeManager.increment();

      if (window.showInAppToast) {
        window.showInAppToast({
          title: notification.title || "New Notification",
          message: notification.message,
          body: notification.message,
          type: notification.type,
          id: notification.id,
          entityId: notification.entityId,
          createdAt: notification.createdAt,
          data: notification.data,
        });
      }

      if (Notification.permission === "granted" && document.hidden) {
        const notificationOptions = {
          body: notification.message,
          icon: "/android-chrome-192x192.png",
          badge: "/badge-icon.png",
          tag: notification.id || `notif-${Date.now()}`,
          vibrate: [200, 100, 200],
          requireInteraction:
            notification.type === "game_invite" ||
            notification.type === "event_reminder",
          renotify: true,
          data: {
            url:
              notification.data?.url ||
              (notification.type === "attendance_reminder"
                ? "/member/attendance"
                : notification.type === "game_invite"
                ? "/games"
                : notification.type === "event_reminder"
                ? "/mass-programs"
                : notification.type === "announcement"
                ? "/announcements"
                : notification.type === "message"
                ? "/messenger"
                : notification.type === "contribution_reminder"
                ? "/contributions"
                : "/dashboard"),
            id: notification.id,
            type: notification.type,
            entityId: notification.entityId,
            timestamp: Date.now(),
          },
          actions: [],
        };

        if (notification.type === "game_invite") {
          notificationOptions.actions = [
            { action: "accept", title: "🎮 Accept" },
            { action: "decline", title: "❌ Decline" },
          ];
        } else if (
          notification.type === "pledge_approved" ||
          notification.type === "payment_added"
        ) {
          notificationOptions.actions = [
            { action: "view", title: "💰 View Pledge" },
            { action: "dismiss", title: "Dismiss" },
          ];
        } else if (notification.type === "event_reminder") {
          notificationOptions.actions = [
            { action: "view", title: "📅 View Event" },
            { action: "dismiss", title: "Dismiss" },
          ];
        } else {
          notificationOptions.actions = [
            { action: "view", title: "📖 View Details" },
            { action: "dismiss", title: "Dismiss" },
          ];
        }

        new Notification(notification.title || "New Notification", notificationOptions);
      }
    });

    socket.on("new_notification_batch", (notifications) => {
      console.log("📦 Batch notifications received:", notifications?.length);
      badgeManager.loadCount();
    });

    socket.on("minutes_published", (data) => {
      console.log("📋 New minutes published:", data);
      badgeManager.increment();
      if (window.showInAppToast) {
        window.showInAppToast({
          title: "📋 New Minutes Published",
          message: data.title,
          type: "minutes",
          data: { minutesId: data.id },
        });
      }
    });

    socket.on("push_subscription_refresh", async (data) => {
      console.log("🔄 Push subscription refresh requested:", data);
      if (data.reason === "expired" || data.reason === "migration") {
        await pushService.unsubscribe();
        await pushService.subscribe();
      }
    });

    socket.on("chess_invite_received", (data) => {
      console.log("📨 Chess invite received:", data);
      if (window.confirm(`♟️ ${data.fromName} challenged you to Chess!\n\nAccept?`)) {
        sessionStorage.setItem("chess_invite", JSON.stringify(data));
        window.location.href = "/games/chess";
      }
    });

    return () => {
      socket.off("new_notification");
      socket.off("new_notification_batch");
      socket.off("minutes_published");
      socket.off("push_subscription_refresh");
      socket.off("chess_invite_received");
    };
  }, []);

  /* Initialize push notifications (unchanged) */
  useEffect(() => {
    const initPushNotifications = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await pushService.init();
          await pushService.registerServiceWorker();
          const permission = await pushService.requestPermission();
          if (permission) {
            const subscribed = await pushService.subscribe();
            if (subscribed) {
              setPushEnabled(true);
              console.log("✅ Push notifications enabled successfully");
            }
          } else {
            console.log("⚠️ Notification permission not granted");
          }
          await badgeManager.loadCount();
        } catch (err) {
          console.error("Failed to initialize push notifications:", err);
        }
      }
    };
    initPushNotifications();
  }, []);

  /* Service worker messages (unchanged) */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("📨 Message from service worker:", event.data);
        const { type, data } = event.data || {};
        if (type === "GAME_INVITE_ACCEPTED") {
          window.dispatchEvent(new CustomEvent("acceptGameInvite", { detail: data }));
        }
        if (type === "GAME_INVITE_DECLINED") {
          window.dispatchEvent(new CustomEvent("declineGameInvite", { detail: data }));
        }
        if (type === "PLEDGE_PAYMENT") {
          window.dispatchEvent(new CustomEvent("openPledgePayment", { detail: data }));
        }
      });
    }
  }, []);

  /* Login/logout listener (unchanged) */
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");

      if (token && user) {
        try {
          const userData = JSON.parse(user);
          getSocket().emit("join", userData.id);
          pushService.setupForUser();
          badgeManager.loadCount();
          setCurrentUser(userData);
        } catch (e) {}
      } else {
        getSocket().emit("leave-all");
        pushService.unsubscribe();
        badgeManager.updateBadgeCount(0);
        setCurrentUser(null);
        setPushEnabled(false);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const isAdmin =
    currentUser?.role === "admin" ||
    currentUser?.specialRole === "admin" ||
    currentUser?.specialRole === "secretary" ||
    currentUser?.specialRole === "treasurer";

  return (
    <>
      <SEO />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ================= LANDING PAGE ================= */}
          <Route path="/" element={<Landing2 />} />

          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/home" element={<Home />} />
          <Route path="/readings/:date" element={<FullReadings />} />
          <Route path="/liturgical-calendar" element={<LiturgicalCalendar />} />

          {/* Legal pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookiesPolicy />} />
          <Route path="/help" element={<HelpFaq />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/prayer" element={<Prayer />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/gallery/:id" element={<GalleryPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/user-manual" element={<UserManual />} />
          <Route path="/pay/:slug" element={<PaymentPage />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/pay/campaign/:campaignId" element={<PaymentPage />} />
          <Route path="/attendance/link/:token" element={<LinkCheckin />} />
          <Route path="/scan/:token" element={<ScanPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* ================= MEMBER PORTAL ================= */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="member/attendance" element={<MemberAttendance />} />
            <Route
              path="member/attendance/sheet/:sheetId"
              element={<MemberSheetPage />}
            />
            <Route
              path="member/attendance-history"
              element={<MemberAttendanceHistory />}
            />
            <Route path="/mass-programs" element={<MassPrograms />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/jumuia-contributions" element={<JumuiaDashboard />} />
            <Route path="/join-jumuia" element={<JoinJumuia />} />

            {/* ✅ DUPLICATE REMOVED: /hymns and /hymn/:id only here now */}
            <Route path="/hymns" element={<HymnBook />} />
            <Route path="/hymn/:id" element={<HymnLyrics />} />

            <Route path="/chat" element={<Chat />} />
            <Route path="/messenger" element={<MessengerPage />} />
            <Route path="/games" element={<Games />} />
            <Route path="/schedules" element={<UserSchedules />} />
            <Route path="/semester-registration" element={<MySemester />} />

            {/* PDF TOOLS */}
            <Route path="/tools/pdf" element={<PdfToolHub />} />
            <Route path="/tools/pdf/image-to-pdf" element={<ImageToPdfTool />} />
            <Route path="/tools/pdf/merge" element={<MergeTool />} />
            <Route path="/tools/pdf/rotate" element={<RotateTool />} />
            <Route path="/tools/pdf/page-numbers" element={<PageNumbersTool />} />
            <Route path="/tools/pdf/watermark" element={<WatermarkTool />} />
            <Route path="/tools/pdf/protect" element={<ProtectTool />} />
            <Route path="/tools/pdf/split" element={<SplitTool />} />
            <Route path="/tools/pdf/fill-sign" element={<FillSignTool />} />

            <Route path="/youtube" element={<UserYoutubeHub />} />
            <Route path="/executive" element={<ExecutivePage />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/feedback/history" element={<FeedbackHistory />} />
            <Route path="/feedback/:id" element={<FeedbackDetail />} />

            {/* MASS READINGS */}
            <Route path="/mass-readings" element={<MassReadingsPage />} />
            <Route path="/mass-readings/:id" element={<MassReadingDetail />} />
            <Route path="/mass-readings/upload" element={<MassReadingUpload />} />
            <Route path="/mass-readings/edit/:id" element={<MassReadingEdit />} />

            <Route path="/executive/minutes" element={<ExecutiveMinutes />} />
            <Route
              path="/executive/minutes/:id"
              element={<ExecutiveMinutesView />}
            />

            <Route
              path="/profile-settings"
              element={
                <ProfileSettings
                  user={JSON.parse(localStorage.getItem("user") || "{}")}
                  onUserUpdate={(updated) =>
                    console.log("User updated:", updated)
                  }
                />
              }
            />

            {/* GAMES */}
            <Route path="/games/tictactoe" element={<TicTacToe />} />
            <Route path="/games/snake" element={<Snake />} />
            <Route path="/games/trivia" element={<BibleTrivia />} />
            <Route path="/games/chess" element={<Chess />} />
            <Route path="/minutes" element={<MinutesList />} />
          </Route>

          {/* ================= JUMUIA DETAIL PAGE ================= */}
          <Route
            path="/jumuia/:jumuiaCode"
            element={
              <ProtectedRoute>
                <JumuiaRoute>
                  <JumuiaDetailPage />
                </JumuiaRoute>
              </ProtectedRoute>
            }
          />

          {/* ================= ADMIN PORTAL ================= */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="messenger" element={<AdminMessenger />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="/admin/analytics" element={<YoutubeAnalyticsPage />} />
            <Route path="minutes" element={<MinutesList />} />
            <Route path="songs" element={<SongsPage />} />
            <Route path="/admin/hymns" element={<AdminHymns />} />
            <Route path="/admin/hymns/edit/:id" element={<AddHymn />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="contributions" element={<ContributionsPage />} />
            <Route path="jumuia-management" element={<JumuiaManagement />} />
            <Route path="/admin/schedules" element={<AdminSchedules />} />
            <Route path="chat" element={<ChatMonitorPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="media" element={<AdminMediaPage />} />
            <Route path="/admin/hymns/add" element={<AddHymn />} />
            <Route path="/admin/pending-songs" element={<PendingSongs />} />
            <Route path="/admin/ocr-scanner" element={<OCRScannerPage />} />
            <Route path="/admin/health-centre" element={<AdminHealthCentre />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route
              path="attendance/sheet/:sheetId"
              element={<AdminAttendanceDetails />}
            />
            <Route path="minutes/:id" element={<MinutesViewPage />} />
            <Route path="/admin/prayers" element={<AdminPrayers />} />
            <Route path="minutes/create" element={<MinutesCreatePage />} />
            <Route path="minutes/edit/:id" element={<MinutesEditPage />} />
            <Route path="/admin/history" element={<AdminHistory />} />
            <Route
              path="/admin/attendance/add-member/:sheetId"
              element={<AddMemberPage />}
            />
            <Route
              path="/admin/attendance/overview"
              element={<AdminAttendanceOverview />}
            />
            <Route
              path="attendance/member/:userId"
              element={<AdminMemberDetail />}
            />
            <Route path="email-settings" element={<EmailManagement />} />
            <Route path="bank-payments" element={<BankPayments />} />
            <Route path="/admin/email" element={<EmailDashboard />} />
            <Route path="/admin/whatsapp" element={<WhatsAppBot />} />
            <Route path="/admin/message-history" element={<MessageHistory />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route
              path="/admin/feedback/:id"
              element={<AdminFeedbackDetail />}
            />
            <Route
              path="/admin/countdown-settings"
              element={<CountdownSettings />}
            />
            <Route path="/admin/advertisements" element={<Advertisements />} />
            <Route path="semesters" element={<AdminSemesterPage />} />
            <Route path="/admin/birthday" element={<BirthdayManagement />} />
            <Route path="/admin/ticker" element={<TickerManager />} />
            <Route path="executive" element={<AdminExecutivePage />} />
          </Route>

          {/* ================= SECRETARY ================= */}
          <Route
            path="/secretary"
            element={
              <RoleRoute allowedRoles={["secretary"]}>
                <RoleLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="announcements" replace />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="schedules" element={<AdminSchedules />} />
            <Route path="minutes" element={<MinutesList />} />
            <Route path="minutes/:id" element={<MinutesViewPage />} />
            <Route path="minutes/create" element={<MinutesCreatePage />} />
            <Route path="minutes/edit/:id" element={<MinutesEditPage />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route
              path="attendance/sheet/:sheetId"
              element={<AdminAttendanceDetails />}
            />
            <Route path="history" element={<AdminHistory />} />
            <Route
              path="attendance/add-member/:sheetId"
              element={<AddMemberPage />}
            />
          </Route>

          {/* ================= TREASURER ================= */}
          <Route
            path="/treasurer"
            element={
              <RoleRoute allowedRoles={["treasurer", "admin"]}>
                <RoleLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="contributions" replace />} />
            <Route path="contributions" element={<ContributionsPage />} />
            <Route path="reports" element={<TreasurerReports />} />
            <Route path="/treasurer/notes/new" element={<TreasurerNotes />} />
            <Route path="bank-payments" element={<BankPayments />} />
            <Route path="/treasurer/notes" element={<TreasurerNotes />} />
          </Route>

          {/* ================= CHOIR MODERATOR ================= */}
          <Route
            path="/choir"
            element={
              <RoleRoute allowedRoles={["choir_moderator"]}>
                <RoleLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="songs" replace />} />
            <Route path="songs" element={<SongsPage />} />
            <Route path="hymns" element={<AdminHymns />} />
            <Route path="hymns/add" element={<AddHymn />} />
            <Route path="hymns/edit/:id" element={<AddHymn />} />
            <Route path="ocr-scanner" element={<OCRScannerPage />} />
            <Route path="pending-songs" element={<PendingSongs />} />
            <Route
              path="/choir/whatsapp-broadcast"
              element={<ChoirWhatsAppBroadcast />}
            />
          </Route>

          {/* ================= JUMUIA LEADER ================= */}
          <Route
            path="/leader"
            element={
              <RoleRoute allowedRoles={["jumuia_leader"]}>
                <RoleLayout />
              </RoleRoute>
            }
          >
            <Route index element={<JumuiaManagement />} />
          </Route>

          {/* ================= MEDIA MODERATOR ================= */}
          <Route
            path="/media-moderator"
            element={
              <RoleRoute allowedRoles={["media_moderator"]}>
                <RoleLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="media" replace />} />
            <Route path="media" element={<AdminMediaPage />} />
            <Route path="advertisements" element={<Advertisements />} />
          </Route>

          {/* ================= CATCH ALL ================= */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Overlays — lazy, but wrapped so they don't block page render */}
      <Suspense fallback={null}>
        <UpdateNotification />

        {showAI && currentUser &&
          (isAdmin ? (
            <AdminAIAssistant
              user={currentUser}
              onClose={() => {
                setShowAI(false);
                setIsAIFullPage(false);
              }}
              isOpen={showAI}
              isFullPage={isAIFullPage}
              onBack={() => setIsAIFullPage(false)}
              navigate={navigate}
            />
          ) : (
            <ZucaAIAssistant
              user={currentUser}
              onClose={() => {
                setShowAI(false);
                setIsAIFullPage(false);
              }}
              isOpen={showAI}
              isFullPage={isAIFullPage}
              onBack={() => setIsAIFullPage(false)}
              navigate={navigate}
            />
          ))}
      </Suspense>
    </>
  );
}

function App() {
  useEffect(() => {
    initializeDark();
  }, []);

  return (
    <HelmetProvider>
      <BrowserRouter>
        <MessengerProvider>
          <AppContent />
        </MessengerProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;