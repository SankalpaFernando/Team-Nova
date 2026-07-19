import { NavLink, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./navbar.css";

function Navbar() {

  const [showLogin, setShowLogin] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const { login } = useAuth();      // ← add this
  const navigate = useNavigate();   // ← add this

  const handleChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
  e.preventDefault();
  const user = await login(loginData.email, loginData.password);
  if (user.role === "admin") navigate("/admin-dashboard");
  else navigate("/dashboard");
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

        <div className="logo">
          🌿 MangroveGuard
        </div>

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
            onClick={() => setShowLogin(true)}
          >
            Login
          </button>

        </div>

      </nav>

      {/* ================= LOGIN POPUP ================= */}

      {showLogin && (

        <div
          className="popup-overlay"
          onClick={() => setShowLogin(false)}
        >

          <div
            className="login-popup"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="close-btn"
              onClick={() => setShowLogin(false)}
            >
              ×
            </button>

            <h2>Login</h2>

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
              >
                Login
              </button>

            </form>

            <p className="forgot-password">
              Forgot Password?
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