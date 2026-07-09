import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Home from "./pages/home";
import About from "./pages/About";
import VisitorAbout from "./pages/VisitorAbout";
import VisitorSites from "./pages/VisitorSites";
import VisitorContactus from "./pages/VisitorContactus";
import Contact from "./pages/Contact";
import Sites from "./pages/Sites";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import ManageUsers from "./pages/ManageUsers";
import ManageDevices from "./pages/ManageDevices";
import AdminAlerts from "./pages/AdminAlerts";
import AdminMaps from "./pages/AdminMaps";
import AdminProfile from "./pages/AdminProfile";
import NegomboLagoon from "./pages/NegomboLagoon";

// Protected route — must be logged in
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;

  return children;
};

// Admin route — must be admin
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Pages — anyone can visit */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/visitor-about" element={<VisitorAbout />} />
        <Route path="/visitor-sites" element={<VisitorSites />} />
        <Route path="/visitor-contactus" element={<VisitorContactus />} />

        {/* User Pages — must be logged in */}
        <Route path="/dashboard" element={
          <ProtectedRoute><UserDashboard /></ProtectedRoute>
        } />
        <Route path="/sites" element={
          <ProtectedRoute><Sites /></ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute><Alerts /></ProtectedRoute>
        } />
        <Route path="/about" element={
          <ProtectedRoute><About /></ProtectedRoute>
        } />
        <Route path="/contact" element={
          <ProtectedRoute><Contact /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/negombo" element={
          <ProtectedRoute><NegomboLagoon /></ProtectedRoute>
        } />

        {/* Admin Pages — must be admin */}
        <Route path="/admin-dashboard" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />
        <Route path="/manage-users" element={
          <AdminRoute><ManageUsers /></AdminRoute>
        } />
        <Route path="/manage-devices" element={
          <AdminRoute><ManageDevices /></AdminRoute>
        } />
        <Route path="/admin-alerts" element={
          <AdminRoute><AdminAlerts /></AdminRoute>
        } />
        <Route path="/admin-maps" element={
          <AdminRoute><AdminMaps /></AdminRoute>
        } />
        <Route path="/admin-profile" element={
          <AdminRoute><AdminProfile /></AdminRoute>
        } />

        {/* Catch all — redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;