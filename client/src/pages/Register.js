import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import mangrove from "../assests/mangrove.png";
import { Clock, ShieldCheck, ArrowLeft, Mail, RefreshCw, AlertCircle } from "lucide-react";
import "./Register.css";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  // step: "form" | "verify" | "submitted"
  const [step, setStep] = useState("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredName, setRegisteredName] = useState("");

  // Verification state
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Resend state & countdown
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, verifyEmailCode, resendEmailCode } = useAuth();
  const navigate = useNavigate();

  // Timer for resend cooldown (60s countdown)
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (e) => {
    if (serverError) setServerError("");
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const validate = () => {
    let newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!form.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Please enter a valid email";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Minimum 6 characters";
    }

    return newErrors;
  };

  // Step 1: Submit register form -> Server checks duplicates & emails 6-digit code
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setLoading(true);
      try {
        const res = await register(form.name, form.email, form.password);

        // Security: clear password from memory immediately
        const savedEmail = (res.email || form.email).trim().toLowerCase();
        const savedName = form.name.trim();

        setRegisteredEmail(savedEmail);
        setRegisteredName(savedName);
        setForm({ name: savedName, email: savedEmail, password: "" });

        // Switch to verification step
        setVerificationCode("");
        setVerifyError("");
        setResendMessage("");
        setResendCooldown(60); // 60s cooldown for resending
        setStep("verify");
      } catch (err) {
        if (!err.response) {
          setServerError("Something went wrong. Please try again later.");
        } else {
          const msg = err.response.data?.message || "";
          if (
            (err.response.status === 400 || err.response.status === 409) &&
            (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists"))
          ) {
            setServerError("An account with this email already exists. Please sign in or use a different email.");
          } else if (err.response.status === 429) {
            setServerError(msg || "Too many requests. Please wait before trying again.");
          } else if (err.response.status >= 500) {
            setServerError("Something went wrong. Please try again later.");
          } else {
            setServerError(msg || "Registration failed. Please check your information and try again.");
          }
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Step 2: Submit 6-digit code -> Server validates & creates pending user
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerifyError("");
    setResendMessage("");

    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setVerifyError("Please enter the 6-digit verification code.");
      return;
    }

    setVerifyLoading(true);
    try {
      await verifyEmailCode(registeredEmail, cleanCode);
      setStep("submitted");
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed. Please check the code and try again.";
      setVerifyError(msg);
      // If code was invalidated (5 wrong attempts or expired), user needs to register again or request new code
      if (msg.toLowerCase().includes("invalidated") || msg.toLowerCase().includes("expired")) {
        setVerificationCode("");
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  // Resend code handler
  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setVerifyError("");
    setResendMessage("");
    setResendLoading(true);

    try {
      const res = await resendEmailCode(registeredEmail);
      setResendMessage(res.message || `A new 6-digit code was sent to ${registeredEmail}.`);
      setResendCooldown(60);
      setVerificationCode("");
    } catch (err) {
      setVerifyError(err.response?.data?.message || "Failed to resend verification code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // "Use a different email" handler
  const handleDifferentEmail = () => {
    setVerificationCode("");
    setVerifyError("");
    setResendMessage("");
    setServerError("");
    setStep("form");
  };

  const resetForm = () => {
    setForm({ name: "", email: "", password: "" });
    setErrors({});
    setServerError("");
    setVerificationCode("");
    setVerifyError("");
    setResendMessage("");
    setStep("form");
  };

  return (
    <div className="register-page">
      <Navbar />

      <div
        className="hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >
        {/* State 3: Admin Approval Pending Success */}
        {step === "submitted" ? (
          <div className="register-success-card">
            <div className="reg-success-icon-wrap">
              <Clock size={40} color="#d97706" />
            </div>

            <h2>Registration Submitted!</h2>
            <div className="reg-status-pill">Pending Admin Approval</div>

            <p className="reg-success-msg">
              Thank you, <strong>{registeredName}</strong>. Your email <strong>{registeredEmail}</strong> has been verified and your account request has been received.
            </p>

            <div className="reg-notice-box">
              <ShieldCheck size={20} color="#15803d" className="reg-notice-icon" />
              <div>
                <strong>Administrator Verification Required</strong>
                <p>
                  To protect sensitive environmental and site data, an administrator must review and approve your registration before you can log in and view details.
                </p>
              </div>
            </div>

            <div className="reg-success-actions">
              <button className="reg-btn-home" onClick={() => navigate("/")}>
                <ArrowLeft size={16} /> Return to Home
              </button>
              <button className="reg-btn-reset" onClick={resetForm}>
                Register Another Account
              </button>
            </div>
          </div>
        ) : step === "verify" ? (
          /* State 2: Email Verification Code Screen */
          <div className="register-box reg-verify-box">
            <div className="reg-verify-icon-wrap">
              <Mail size={32} color="#164e3d" />
            </div>

            <h2>Verify Your Email</h2>

            <p className="reg-verify-desc">
              We sent a 6-digit code to <strong>{registeredEmail}</strong>. It expires in 10 minutes. Check spam.
            </p>

            {resendMessage && (
              <div className="reg-alert reg-alert--success">
                {resendMessage}
              </div>
            )}

            {verifyError && (
              <div className="register-error-alert">
                <AlertCircle size={16} style={{ display: "inline", marginRight: "6px", verticalAlign: "text-bottom" }} />
                {verifyError}
              </div>
            )}

            <form onSubmit={handleVerifyCode}>
              <label htmlFor="reg-code-input" style={{ textAlign: "center", display: "block", marginBottom: "8px" }}>
                Enter 6-Digit Code
              </label>

              <input
                id="reg-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="• • • • • •"
                className="reg-code-input"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />

              <button
                type="submit"
                className="register-btn"
                disabled={verifyLoading || verificationCode.length !== 6}
                style={{ marginTop: "12px" }}
              >
                {verifyLoading ? "Verifying..." : "Verify Code"}
              </button>
            </form>

            <div className="reg-verify-actions">
              <button
                type="button"
                className="reg-resend-btn"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendLoading}
              >
                <RefreshCw size={14} className={resendLoading ? "spin" : ""} />
                {resendCooldown > 0
                  ? `Resend Code (${resendCooldown}s)`
                  : resendLoading
                  ? "Sending..."
                  : "Resend Code"}
              </button>

              <button
                type="button"
                className="reg-diff-email-btn"
                onClick={handleDifferentEmail}
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          /* State 1: Standard Register Form */
          <div className="register-box">
            <h2>User Register</h2>

            <div className="reg-approval-hint">
              <ShieldCheck size={16} color="#1d7068" />
              <span>Registrations require email verification &amp; admin approval.</span>
            </div>

            {serverError && (
              <div className="register-error-alert">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmitForm}>
              <label>Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter Name"
                value={form.name}
                onChange={handleChange}
              />
              <span className="error">{errors.name}</span>

              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter Email"
                value={form.email}
                onChange={handleChange}
              />
              <span className="error">{errors.email}</span>

              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter Password (min 6 chars)"
                value={form.password}
                onChange={handleChange}
              />
              <span className="error">{errors.password}</span>

              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? "Sending Verification Code..." : "Register"}
              </button>
            </form>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default Register;
