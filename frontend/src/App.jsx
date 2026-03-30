import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { io } from "socket.io-client";
import BASE_URL from "./api";

// Import Notification Manager and Badge Manager
import NotificationManager from "./components/NotificationManager";
import badgeManager from "./utils/badgeManager";
import pushService from "./services/pushService";

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

/* ===== ROLE LAYOUT ===== */
import RoleLayout from "./pages/role/RoleLayout";

// Create socket instance
const socket = io(BASE_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function App() {
  // Socket.IO connection setup
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        // Join the user's personal room for notifications
        socket.emit("join", userData.id);
        console.log("📡 Joined socket room for user:", userData.id);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    
    // Listen for new notifications
    socket.on("new_notification", (notification) => {
      console.log("🔔 New notification received:", notification);
      
      // Show in-app toast notification
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
      
      // Update badge count
      badgeManager.incrementBadge();
      
      // Also show browser notification if permission granted
      if (Notification.permission === "granted") {
        new Notification(notification.title || "New Notification", {
          body: notification.message,
          icon: "/android-chrome-192x192.png",
          badge: "/favicon.ico",
          tag: notification.id,
          vibrate: [200, 100, 200],
          data: {
            url: `/dashboard`,
            id: notification.id,
            type: notification.type,
            entityId: notification.entityId
          }
        });
      }
    });
    
    // Listen for batch notifications
    socket.on("new_notification_batch", (notifications) => {
      console.log("📦 Batch notifications received:", notifications?.length);
      // Refresh notifications or update badge
      badgeManager.loadCount();
    });
    
    // Cleanup on unmount
    return () => {
      socket.off("new_notification");
      socket.off("new_notification_batch");
    };
  }, []);
  
  // Initialize push notifications on app load
  useEffect(() => {
    const initPushNotifications = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await pushService.init();
          await pushService.registerServiceWorker();
          const permission = await pushService.requestPermission();
          if (permission) {
            await pushService.subscribe();
            console.log("✅ Push notifications enabled");
          }
          // Load badge count
          badgeManager.loadCount();
        } catch (err) {
          console.error("Failed to initialize push notifications:", err);
        }
      }
    };
    
    initPushNotifications();
  }, []);
  
  // Optional: Listen for user login/logout events
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      
      if (token && user) {
        try {
          const userData = JSON.parse(user);
          socket.emit("join", userData.id);
          // Re-initialize push notifications on login
          pushService.subscribe();
          badgeManager.loadCount();
        } catch (e) {}
      } else {
        socket.emit("leave-all");
        // Unsubscribe from push notifications on logout
        pushService.unsubscribe();
        badgeManager.updateBadgeCount(0);
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <NotificationManager>
      <BrowserRouter>
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

          {/* ================= ADMIN PORTAL (Full Access) ================= */}
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
            <Route path="roles" element={<RoleManagement />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="contributions" element={<ContributionsPage />} />
            <Route path="jumuia-management" element={<JumuiaManagement />} />
            <Route path="chat" element={<ChatMonitorPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="media" element={<AdminMediaPage />} />
          </Route>

          {/* ================= SECRETARY (Announcements only) ================= */}
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
          </Route>

          {/* ================= TREASURER (Contributions only) ================= */}
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

          {/* ================= CHOIR MODERATOR (Songs only) ================= */}
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

          {/* ================= JUMUIA LEADER (Single dashboard page) ================= */}
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

          {/* ================= MEDIA MODERATOR (Media management only) ================= */}
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
      </BrowserRouter>
    </NotificationManager>
  );
}

export default App;