import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/navbar";
import mangrove from "../assests/mangrove.png";
import "./ResetPassword.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");

    try {
      const user = await resetPassword(token, password);
      // Password reset also logs the user in (backend returns a fresh token)
      if (user.role === "admin") navigate("/admin-dashboard");
      else navigate("/dashboard");
    } catch (err) {
      setStatus("error");
      setMessage(
        err.response?.data?.message ||
          "This reset link is invalid or has expired. Please request a new one."
      );
    }
  };

  return (
    <div
      className="reset-password-page"
      style={{ backgroundImage: `url(${mangrove})` }}
    >
      <Navbar />

      <div className="reset-password-overlay">
        <div className="reset-password-card">
          <h2>Reset Password</h2>
          <p className="subtitle">Enter a new password for your account.</p>

          <form onSubmit={handleSubmit}>
            <label>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button type="submit" className="submit-btn" disabled={status === "loading"}>
              {status === "loading" ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          {message && <p className="status-message error">{message}</p>}

          <p className="back-link">
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
