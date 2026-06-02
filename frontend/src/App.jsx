import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import BASE_URL from "./api";
import './index.css'

// Import Notification Manager and Badge Manager
import badgeManager from "./utils/badgeManager";
import pushService from "./services/pushService";

// Import AI Assistants
import ZucaAIAssistant from "./components/ZucaAIAssistant";
import AdminAIAssistant from "./components/AdminAIAssistant";
import TreasurerNotes from './pages/treasurer/TreasurerNotes';
import Layout from "./components/Layout";
import 'react-image-crop/dist/ReactCrop.css';
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import RoleRoute from "./components/RoleRoute";
import JumuiaRoute from "./components/routing/JumuiaRoute";
import Landing2 from "./pages/landing2";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Announcements from "./pages/Announcements";
import MassPrograms from "./pages/MassPrograms";
import Contributions from "./pages/Contributions";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import HymnBook from './pages/HymnBook';
import HymnLyrics from './pages/HymnLyrics';
import LiturgicalCalendar from './pages/LiturgicalCalendar';
import JumuiaDashboard from "./pages/JumuiaDashboard";
import JoinJumuia from "./pages/JoinJumuia";
import JumuiaDetailPage from "./pages/jumuia/JumuiaDetailPage";
import FullReadings from './pages/FullReadings';
import GalleryPage from "./pages/gallery";
import Landing from "./pages/Landing";
import UserManual from './pages/UserManual';
import Games from "./pages/Games";
import UserSchedules from "./pages/UserSchedules";
import UserYoutubeHub from "./pages/UserYoutubeHub";
import Prayer from "./pages/Prayer";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import MessengerPage from './pages/MessengerPage';
import { MessengerProvider } from './contexts/MessengerContext';
import MemberAttendance from './pages/member/MemberAttendance';
import MemberAttendanceHistory from './pages/member/MemberAttendanceHistory';
import LinkCheckin from './components/admin/attendance/LinkCheckin';

// GAMES
import TicTacToe from "./pages/games/TicTacToe";
import Snake from "./pages/games/Snake";
import BibleTrivia from "./pages/games/BibleTrivia";

// ===== EXECUTIVE SYSTEM IMPORTS =====
import ExecutivePage from "./pages/ExecutivePage";
import AdminExecutivePage from "./pages/admin/AdminExecutivePage";

/* ===== ADMIN IMPORTS ===== */
import AdminLayout from "./pages/admin/AdminLayout";
import AdminHealthCentre from './pages/admin/AdminHealthCentre';
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMediaPage from "./pages/admin/MediaPage";
import UsersPage from "./pages/admin/UsersPage";
import RoleManagement from "./pages/admin/RoleManagement";
import ActivityPage from "./pages/admin/ActivityPage";
import YoutubeAnalyticsPage from './pages/admin/YoutubeAnalyticsPage';
import SongsPage from "./pages/admin/SongsPage";
import AdminHymns from './pages/admin/Hymns';
import AnnouncementsPage from "./pages/admin/AnnouncementsPage";
import ContributionsPage from "./pages/admin/ContributionsPage";
import JumuiaManagement from "./pages/admin/JumuiaManagement";
import ChatMonitorPage from "./pages/admin/ChatMonitorPage";
import SecurityPage from "./pages/admin/SecurityPage";
import PendingSongs from "./pages/admin/PendingSongs";
import OCRScannerPage from "./pages/admin/OCRScanner";
import AddHymn from './pages/admin/AddHymn';
import AdminSchedules from "./pages/admin/AdminSchedules";
import AdminMessenger from './pages/admin/AdminMessenger';
import AdminAttendance from './components/admin/attendance/AdminAttendance';
import AdminAttendanceDetails from './pages/admin/AdminAttendanceDetails';

/* ===== ROLE LAYOUT ===== */
import RoleLayout from "./pages/role/RoleLayout";

// Create socket instance with better configuration
const socket = io(BASE_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});


// ===== NOTIFICATION CHECK COMPONENT (PWA only) =====
function NotificationGate({ children }) {
  const [notificationStatus, setNotificationStatus] = useState('checking'); // checking, granted, denied, not_needed

  useEffect(() => {
    checkIfPWAAndPermission();
  }, []);

  // Function to detect if app is installed as PWA
  const isPWAInstalled = () => {
    // Check display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    // Check for iOS PWA
    if (window.navigator.standalone === true) {
      return true;
    }
    return false;
  };

  const checkIfPWAAndPermission = () => {
    // If NOT installed as PWA, don't require notifications
    if (!isPWAInstalled()) {
      console.log("Running in browser - notifications not required");
      setNotificationStatus('not_needed');
      return;
    }

    console.log("Running as installed PWA - notifications required");
    
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications. Please use a modern browser for the PWA.');
      setNotificationStatus('not_needed'); // Allow access but warn
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationStatus('granted');
    } 
    else if (Notification.permission === 'denied') {
      setNotificationStatus('denied');
      showBlockedModal();
    } 
    else {
      // Not asked yet - show request modal
      showRequestModal();
    }
  };

  const showRequestModal = () => {
    const modal = document.getElementById('notification-required-modal');
    if (modal) {
      modal.style.display = 'flex';
      
      const enableBtn = document.getElementById('enable-notifications-btn');
      if (enableBtn) {
        const newBtn = enableBtn.cloneNode(true);
        enableBtn.parentNode.replaceChild(newBtn, enableBtn);
        
        newBtn.onclick = async () => {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            modal.style.display = 'none';
            setNotificationStatus('granted');
            // Re-register push after permission granted
            if (window.pushService) {
              window.pushService.subscribe();
            }
          } else {
            modal.style.display = 'none';
            setNotificationStatus('denied');
            showBlockedModal();
          }
        };
      }
    } else {
      // Fallback: use browser prompt directly
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          setNotificationStatus('granted');
        } else {
          setNotificationStatus('denied');
        }
      });
    }
  };

  const showBlockedModal = () => {
    const modal = document.getElementById('notifications-blocked-modal');
    if (modal) {
      modal.style.display = 'flex';
      
      const refreshBtn = document.getElementById('refresh-after-enable-btn');
      if (refreshBtn) {
        const newBtn = refreshBtn.cloneNode(true);
        refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
        newBtn.onclick = () => window.location.reload();
      }
    }
  };

  // Loading state
  if (notificationStatus === 'checking') {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  // If denied in PWA - show blocked screen
  if (notificationStatus === 'denied') {
    return null; // Modal is already showing
  }

  // For browser users or granted - show app normally
  return children;
}
// ===== END NOTIFICATION GATE =====

// Create a wrapper component that has access to navigate
function AppContent() {
  const navigate = useNavigate();
  const [showAI, setShowAI] = useState(false);
  const [isAIFullPage, setIsAIFullPage] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // ✅ SERVICE WORKER UPDATE DETECTION - SILENT MODE (no user distraction)
useEffect(() => {
  if ('serviceWorker' in navigator) {
    // Just log silently, no refresh, no notifications
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        // Silently skip waiting - no user interaction
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Silently activate new worker without refreshing
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    });
  }
}, []);

  // Listen for User AI open events
  useEffect(() => {
    const handleOpenUserAI = (event) => {
      console.log("👤 Opening User AI");
      setShowAI(true);
      setIsAIFullPage(event.detail?.fullPage || true);
    };
    window.addEventListener('openZUCAI', handleOpenUserAI);
    
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    return () => window.removeEventListener('openZUCAI', handleOpenUserAI);
  }, []);

  // Listen for Admin AI open events
  useEffect(() => {
    const handleOpenAdminAI = (event) => {
      console.log("👑 Opening Admin AI");
      setShowAI(true);
      setIsAIFullPage(event.detail?.fullPage || true);
    };
    window.addEventListener('openAdminAI', handleOpenAdminAI);
    
    return () => window.removeEventListener('openAdminAI', handleOpenAdminAI);
  }, []);

  // Update user when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      setCurrentUser(user);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Socket.IO connection setup with FCM compatibility
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        socket.emit("join", userData.id);
        console.log("📡 Joined socket room for user:", userData.id);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    
    socket.on("new_notification", (notification) => {
      console.log("🔔 New notification received:", notification);
      
      // Increment badge count
      badgeManager.increment();
      
      // Show in-app toast if available
      if (window.showInAppToast) {
        window.showInAppToast({
          title: notification.title || "New Notification",
          message: notification.message,
          body: notification.message,
          type: notification.type,
          id: notification.id,
          entityId: notification.entityId,
          createdAt: notification.createdAt,
          data: notification.data
        });
      }
      
      // Show browser notification if permitted and tab is hidden
      if (Notification.permission === "granted" && document.hidden) {
        // For FCM compatibility on Android, ensure proper notification format
        const notificationOptions = {
          body: notification.message,
          icon: "/android-chrome-192x192.png",
          badge: "/badge-icon.png",
          tag: notification.id || `notif-${Date.now()}`,
          vibrate: [200, 100, 200],
          requireInteraction: notification.type === 'game_invite' || notification.type === 'event_reminder',
          renotify: true,
          data: {
            url: notification.data?.url || `/dashboard`,
            id: notification.id,
            type: notification.type,
            entityId: notification.entityId,
            timestamp: Date.now()
          },
          actions: []
        };
        
        // Add action buttons based on notification type
        if (notification.type === 'game_invite') {
          notificationOptions.actions = [
            { action: 'accept', title: '🎮 Accept' },
            { action: 'decline', title: '❌ Decline' }
          ];
        } else if (notification.type === 'pledge_approved' || notification.type === 'payment_added') {
          notificationOptions.actions = [
            { action: 'view', title: '💰 View Pledge' },
            { action: 'dismiss', title: 'Dismiss' }
          ];
        } else if (notification.type === 'event_reminder') {
          notificationOptions.actions = [
            { action: 'view', title: '📅 View Event' },
            { action: 'dismiss', title: 'Dismiss' }
          ];
        } else {
          notificationOptions.actions = [
            { action: 'view', title: '📖 View Details' },
            { action: 'dismiss', title: 'Dismiss' }
          ];
        }
        
        new Notification(notification.title || "New Notification", notificationOptions);
      }
    });
    
    socket.on("new_notification_batch", (notifications) => {
      console.log("📦 Batch notifications received:", notifications?.length);
      badgeManager.loadCount();
    });
    
    // Listen for FCM subscription refresh events
    socket.on("push_subscription_refresh", async (data) => {
      console.log("🔄 Push subscription refresh requested:", data);
      if (data.reason === 'expired' || data.reason === 'migration') {
        await pushService.unsubscribe();
        await pushService.subscribe();
      }
    });
    
    return () => {
      socket.off("new_notification");
      socket.off("new_notification_batch");
      socket.off("push_subscription_refresh");
    };
  }, []);
  
  // Initialize push notifications with FCM compatibility
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
  
  // Handle service worker messages (for FCM)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Message from service worker:', event.data);
        
        const { type, data } = event.data || {};
        
        // Handle game invite accept/decline from notification actions
        if (type === 'GAME_INVITE_ACCEPTED') {
          window.dispatchEvent(new CustomEvent('acceptGameInvite', { detail: data }));
        }
        
        if (type === 'GAME_INVITE_DECLINED') {
          window.dispatchEvent(new CustomEvent('declineGameInvite', { detail: data }));
        }
        
        // Handle pledge payment from notification actions
        if (type === 'PLEDGE_PAYMENT') {
          window.dispatchEvent(new CustomEvent('openPledgePayment', { detail: data }));
        }
      });
    }
  }, []);
  
  // Listen for user login/logout events
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      
      if (token && user) {
        try {
          const userData = JSON.parse(user);
          socket.emit("join", userData.id);
          pushService.setupForUser(); // Use enhanced setup
          badgeManager.loadCount();
          setCurrentUser(userData);
        } catch (e) {}
      } else {
        socket.emit("leave-all");
        pushService.unsubscribe();
        badgeManager.updateBadgeCount(0);
        setCurrentUser(null);
        setPushEnabled(false);
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Check if user is admin
  const isAdmin = currentUser?.role === "admin" || 
                  currentUser?.specialRole === "secretary" || 
                  currentUser?.specialRole === "treasurer";

  return (
    <>
      <Routes>
        <Route path="/treasurer/notes" element={<TreasurerNotes />} />
        {/* ================= LANDING PAGE ================= */}
        <Route path="/" element={<Landing2 />} />
        
        {/* ================= PUBLIC ROUTES ================= */}
        <Route path="/home" element={<Home />} />
        <Route path="/readings/:date" element={<FullReadings />} />
        <Route path="/liturgical-calendar" element={<LiturgicalCalendar />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/prayer" element={<Prayer />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/user-manual" element={<UserManual />} />
        <Route path="/pay/:slug" element={<PaymentPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/pay/campaign/:campaignId" element={<PaymentPage />} /> 
                  <Route path="/attendance/link/:token" element={<LinkCheckin />} />

        
        {/* ================= EXECUTIVE SYSTEM - PUBLIC VIEW ================= */}
        <Route path="/executive" element={<ExecutivePage />} />

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
          <Route path="member/attendance-history" element={<MemberAttendanceHistory />} />
          
          <Route path="/mass-programs" element={<MassPrograms />} />
          <Route path="/contributions" element={<Contributions />} />
          <Route path="/jumuia-contributions" element={<JumuiaDashboard />} /> 
          <Route path="/join-jumuia" element={<JoinJumuia />} />
          <Route path="/hymns" element={<HymnBook />} />
          <Route path="/hymn/:id" element={<HymnLyrics />} />
          <Route path="/chat" element={<Chat />} />
           <Route path="/messenger" element={<MessengerPage />} />  
          <Route path="/games" element={<Games />} />
          <Route path="/schedules" element={<UserSchedules />} />
          <Route path="/youtube" element={<UserYoutubeHub />} />

          {/* GAMES */}
          <Route path="/games/tictactoe" element={<TicTacToe />} />
          <Route path="/games/snake" element={<Snake />} />
          <Route path="/games/trivia" element={<BibleTrivia />} />
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
          <Route path="/admin/messenger" element={<AdminMessenger />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="attendance/sheet/:sheetId" element={<AdminAttendanceDetails />} />
          
          {/* ===== EXECUTIVE SYSTEM - ADMIN ROUTES ===== */}
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
        </Route>

        {/* ================= TREASURER ================= */}
        <Route
          path="/treasurer"
          element={
            <RoleRoute allowedRoles={["treasurer"]}>
              <RoleLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="contributions" replace />} />
          <Route path="contributions" element={<ContributionsPage />} />
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
        </Route>

        {/* ================= CATCH ALL ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* ========== GLOBAL AI OVERLAY - CHOOSE BASED ON ROLE ========== */}
      {showAI && currentUser && (
        isAdmin ? (
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
        )
      )}
    </>
  );
}


function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkUserRole = () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setIsAdmin(currentUser.role === 'admin');
      setLoading(false);
    };
    
    checkUserRole();
    
    // Listen for login/logout changes
    window.addEventListener('storage', checkUserRole);
    return () => window.removeEventListener('storage', checkUserRole);
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
    return (
    <BrowserRouter>
      <NotificationGate>
        {!isAdmin ? (
          <MessengerProvider>
            <AppContent />
          </MessengerProvider>
        ) : (
          <AppContent />
        )}
      </NotificationGate>
    </BrowserRouter>
  );
}
export default App;