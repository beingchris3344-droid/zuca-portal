// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

/* ===== LAYOUTS & ROUTES ===== */
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

/* ===== MEMBER PAGES ===== */
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Announcements from "./pages/Announcements";
import MassPrograms from "./pages/MassPrograms";
import Contributions from "./pages/Contributions";
import Chat from "./pages/Chat";
import JoinJumuiya from "./pages/JoinJumuiya"; // <- import fixed
import Login from "./pages/Login";
import Register from "./pages/Register";

/* ===== ADMIN PAGES ===== */
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import ActivityPage from "./pages/admin/ActivityPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import SongsPage from "./pages/admin/SongsPage";
import AnnouncementsPage from "./pages/admin/AnnouncementsPage";
import ContributionsPage from "./pages/admin/ContributionsPage";
import ChatMonitorPage from "./pages/admin/ChatMonitorPage";
import SecurityPage from "./pages/admin/SecurityPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= LANDING PAGE ================= */}
        <Route path="/" element={<Landing />} />

        {/* ================= PUBLIC ROUTES ================= */}
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          <Route path="/join-jumuiya" element={<JoinJumuiya />} />
          <Route path="/contributions" element={<Contributions />} />
          <Route path="/chat" element={<Chat />} />
        </Route>

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
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="songs" element={<SongsPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="contributions" element={<ContributionsPage />} />
          <Route path="chat" element={<ChatMonitorPage />} />
          <Route path="security" element={<SecurityPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;