import { Link, useNavigate  } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./navbar.css";

function Navbar() {

  const [showLogin, setShowLogin] = useState(false);

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

  return (
    <>

      {/* ================= NAVBAR ================= */}

      <nav className="navbar">

        <div className="logo">
          🌿 MangroveGuard
        </div>

        <ul className="nav-links">

          <li>
            <Link to="/">Home</Link>
          </li>

          <li>
            <Link to="/visitor-sites">Sites</Link>
          </li>

          <li>
            <Link to="/visitor-about">About</Link>
          </li>

          <li>
            <Link to="/visitor-contactus">Contact</Link>
          </li>

        </ul>

        <button
          className="login-nav-btn"
          onClick={() => setShowLogin(true)}
        >
          Login
        </button>

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