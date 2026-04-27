import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import BASE_URL from "./api";

// Import Notification Manager and Badge Manager
import badgeManager from "./utils/badgeManager";
import pushService from "./services/pushService";

// Import AI Assistants
import ZucaAIAssistant from "./components/ZucaAIAssistant";
import AdminAIAssistant from "./components/AdminAIAssistant";

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

// GAMES
import TicTacToe from "./pages/games/TicTacToe";
import Snake from "./pages/games/Snake";
import BibleTrivia from "./pages/games/BibleTrivia";

// ===== EXECUTIVE SYSTEM IMPORTS =====
import ExecutivePage from "./pages/ExecutivePage";
import AdminExecutivePage from "./pages/admin/AdminExecutivePage";

/* ===== ADMIN IMPORTS ===== */
import AdminLayout from "./pages/admin/AdminLayout";
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

// Create a wrapper component that has access to navigate
function AppContent() {
  const navigate = useNavigate();
  const [showAI, setShowAI] = useState(false);
  const [isAIFullPage, setIsAIFullPage] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  // ========== CRITICAL FIX: Validate user on app start ==========
  useEffect(() => {
    const validateAndSetUser = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!token || !storedUser) {
        setIsValidating(false);
        return;
      }
      
      try {
        // Decode token to check role
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const userData = JSON.parse(storedUser);
        
        console.log('🔐 Token validation:', {
          tokenRole: decoded.role,
          storedRole: userData.role,
          userId: decoded.userId
        });
        
        // If token role doesn't match stored user role, refresh user data from server
        if (decoded.role !== userData.role) {
          console.log('⚠️ Role mismatch! Refreshing user data from server...');
          
          const response = await fetch(`${BASE_URL}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const freshUser = await response.json();
            localStorage.setItem('user', JSON.stringify(freshUser));
            setCurrentUser(freshUser);
            console.log('✅ User data refreshed, role:', freshUser.role);
          } else {
            // Token invalid, clear everything
            console.log('❌ Token invalid, clearing storage');
            localStorage.clear();
            setCurrentUser(null);
          }
        } else {
          // Roles match, use stored user
          setCurrentUser(userData);
          console.log('✅ User validated, role:', userData.role);
        }
      } catch (err) {
        console.error('❌ Token validation failed:', err);
        localStorage.clear();
        setCurrentUser(null);
      }
      
      setIsValidating(false);
    };
    
    validateAndSetUser();
  }, []);

  // ========== Reload user data when app comes to foreground ==========
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            console.log('🔄 App resumed, refreshing user data...');
            const response = await fetch(`${BASE_URL}/api/me`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              const freshUser = await response.json();
              const currentStored = localStorage.getItem('user');
              const currentUserData = currentStored ? JSON.parse(currentStored) : null;
              
              // Only update if role changed
              if (!currentUserData || currentUserData.role !== freshUser.role) {
                console.log('🔄 Role changed from', currentUserData?.role, 'to', freshUser.role);
                localStorage.setItem('user', JSON.stringify(freshUser));
                setCurrentUser(freshUser);
                
                // Force reload to apply new role
                if (currentUserData && currentUserData.role !== freshUser.role) {
                  window.location.reload();
                }
              } else {
                setCurrentUser(freshUser);
              }
            } else {
              // Token invalid, redirect to login
              localStorage.clear();
              setCurrentUser(null);
              navigate('/login');
            }
          } catch(e) {
            console.error('Failed to refresh user:', e);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [navigate]);

  // Listen for User AI open events
  useEffect(() => {
    const handleOpenUserAI = (event) => {
      console.log("👤 Opening User AI");
      setShowAI(true);
      setIsAIFullPage(event.detail?.fullPage || true);
    };
    window.addEventListener('openZUCAI', handleOpenUserAI);
    
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

  // Update user when storage changes (from other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        const newUser = e.newValue ? JSON.parse(e.newValue) : null;
        setCurrentUser(newUser);
        console.log('📦 User updated from storage:', newUser?.role);
      }
      if (e.key === 'token' && !e.newValue) {
        setCurrentUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ SERVICE WORKER UPDATE DETECTION - Auto refresh
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('🔄 New version available! Refreshing...');
        setTimeout(() => window.location.reload(), 500);
      });
      
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          console.log('⏳ Update waiting, applying...');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🆕 New service worker found');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ Update ready, refreshing...');
              setUpdateAvailable(true);
              setTimeout(() => newWorker.postMessage({ type: 'SKIP_WAITING' }), 2000);
            }
          });
        });
      });
      
      const checkForUpdates = async () => {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
      };
      
      const interval = setInterval(checkForUpdates, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  // Socket.IO connection setup
  useEffect(() => {
    if (currentUser?.id) {
      socket.emit("join", currentUser.id);
      console.log("📡 Joined socket room for user:", currentUser.id);
    }
    
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
          data: notification.data
        });
      }
      
      if (Notification.permission === "granted" && document.hidden) {
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
  }, [currentUser?.id]);
  
  // Initialize push notifications
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
  
  // Handle service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Message from service worker:', event.data);
        
        const { type, data } = event.data || {};
        
        if (type === 'GAME_INVITE_ACCEPTED') {
          window.dispatchEvent(new CustomEvent('acceptGameInvite', { detail: data }));
        }
        
        if (type === 'GAME_INVITE_DECLINED') {
          window.dispatchEvent(new CustomEvent('declineGameInvite', { detail: data }));
        }
        
        if (type === 'PLEDGE_PAYMENT') {
          window.dispatchEvent(new CustomEvent('openPledgePayment', { detail: data }));
        }
      });
    }
  }, []);

  // Check if user is admin (FIXED - uses currentUser state)
  const isAdmin = currentUser?.role === "admin";
  const isSecretary = currentUser?.specialRole === "secretary";
  const isTreasurer = currentUser?.specialRole === "treasurer";

  // Show loading while validating
  if (isValidating) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a1e 0%, #1a0033 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "#00c6ff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }} />
          <p>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* ================= LANDING PAGE ================= */}
        <Route path="/" element={<Landing2 />} />
        
        {/* ================= PUBLIC ROUTES ================= */}
        <Route path="/home" element={<Home />} />
        <Route path="/readings/:date" element={<FullReadings />} />
        <Route path="/liturgical-calendar" element={<LiturgicalCalendar />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/user-manual" element={<UserManual />} />
        
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
          <Route path="/mass-programs" element={<MassPrograms />} />
          <Route path="/contributions" element={<Contributions />} />
          <Route path="/jumuia-contributions" element={<JumuiaDashboard />} /> 
                
          <Route path="/join-jumuia" element={<JoinJumuia />} />
          <Route path="/hymns" element={<HymnBook />} />
          <Route path="/hymn/:id" element={<HymnLyrics />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/games" element={<Games />} />
          <Route path="/schedules" element={<UserSchedules />} />

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

// Main App component with Router wrapper
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;