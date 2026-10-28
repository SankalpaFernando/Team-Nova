import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import logoImg from "../assests/logo.png";
import "./navbar.css";

function Navbar() {

  const [showLogin, setShowLogin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("login") === "true" || location.pathname === "/login") {
      setShowLogin(true);
      const emailParam = params.get("email");
      if (emailParam) {
        setLoginData(prev => ({ ...prev, email: emailParam }));
      }
    }
  }, [location]);

  const handleOpenLogin = () => {
    setLoginError("");
    setShowLogin(true);
  };

  const handleCloseLogin = () => {
    setLoginError("");
    setShowLogin(false);
  };

  const handleChange = (e) => {
    if (loginError) setLoginError("");
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const user = await login(loginData.email, loginData.password);
      setShowLogin(false);
      setLoginData({ email: "", password: "" });
      if (user?.role === "admin") navigate("/admin-dashboard");
      else if (user?.role === "site_engineer") navigate("/site-engineer-dashboard");
      else navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 403) {
        setLoginError(err.response.data?.message || "Your account is pending administrator approval.");
      } else if (err.response?.status === 401) {
        setLoginError("Invalid email or password. Please check your credentials and try again.");
      } else if (err.response?.data?.message) {
        setLoginError(err.response.data.message);
      } else {
        setLoginError("Something went wrong. Please try again later.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSearch = (e) => {

    e.preventDefault();

    if (searchTerm.trim() === "") return;

    navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);

    setSearchTerm("");

  };

  return (
    <>

      {/* ================= NAVBAR ================= */}

      <nav className="navbar">

        <Link to="/" className="logo">
          <img src={logoImg} alt="MangroveGuard Logo" className="logo-icon" style={{ height: "58px", width: "auto" }} />
          <span>MangroveGuard</span>
        </Link>

        {/* Navigation Links */}

        <ul className="nav-links">

          <li>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              Home
            </NavLink>
          </li>

          <li>
            <NavLink to="/visitor-sites" className={({ isActive }) => (isActive ? "active" : "")}>
              Sites
            </NavLink>
          </li>

          <li>
            <NavLink to="/visitor-about" className={({ isActive }) => (isActive ? "active" : "")}>
              About
            </NavLink>
          </li>

          <li>
            <NavLink to="/visitor-contactus" className={({ isActive }) => (isActive ? "active" : "")}>
              Contact
            </NavLink>
          </li>

        </ul>

        {/* Search */}

        <form
          className="search-form"
          onSubmit={handleSearch}
        >

          <input
            type="text"
            className="search-input"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button
            type="submit"
            className="search-icon-btn"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

        </form>

        {/* Login Button */}

        <div className="nav-buttons">

          <button
            className="login-nav-btn"
            onClick={handleOpenLogin}
          >
            Login
          </button>

        </div>

      </nav>

      {/* ================= LOGIN POPUP ================= */}

      {showLogin && (

        <div
          className="popup-overlay"
          onClick={handleCloseLogin}
        >

          <div
            className="login-popup"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="close-btn"
              onClick={handleCloseLogin}
            >
              ×
            </button>

            <h2>Login</h2>

            {loginError && (
              <div className="login-error-alert">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin}>

              <label>Email Address</label>

              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={loginData.email}
                onChange={handleChange}
                required
              />

              <label>Password</label>

              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={handleChange}
                required
              />

              <button
                type="submit"
                className="popup-login-btn"
                disabled={loginLoading}
              >
                {loginLoading ? "Signing In..." : "Login"}
              </button>

            </form>

            <p className="forgot-password">
              <Link to="/forgot-password" onClick={() => setShowLogin(false)}>
                Forgot Password?
              </Link>
            </p>

            <p className="register-link">

              Don't have an account?

              <Link to="/register">
                Register
              </Link>

            </p>

          </div>

        </div>

      )}

    </>
  );
}

export default Navbar;