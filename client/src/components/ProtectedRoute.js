import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any <Route element={...}> with this to require login.
// Pass adminOnly to also require role === "admin".
//
// Usage in App.js:
//   <Route path="/dashboard" element={
//     <ProtectedRoute><UserDashboard /></ProtectedRoute>
//   } />
function ProtectedRoute({ children, adminOnly = false }) {
  const { isLoggedIn, isAdmin, loading } = useAuth();

  // AuthContext is still checking localStorage / verifying the token
  // via GET /auth/me — don't redirect prematurely while that's pending.
  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading…</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;