import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any <Route element={...}> with this to require login.
// Pass adminOnly to require role === "admin", or allowedRoles array (e.g. ["admin", "site_engineer"]).
function ProtectedRoute({ children, adminOnly = false, allowedRoles = null }) {
  const { user, isLoggedIn, isAdmin, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading…</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;