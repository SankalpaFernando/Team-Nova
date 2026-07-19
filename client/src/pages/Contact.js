import { useState, useEffect, useRef } from "react";
import "./Contact.css";
import { NavLink, Link, useNavigate } from "react-router-dom";
import mangrove from "../assests/mangrove.png";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const navClass = ({ isActive }) => (isActive ? "active" : "");

function Contact() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const menuRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: ""
  });
  const [statusMsg, setStatusMsg] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim() === "") return;
    navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    setSearchTerm("");
  };

const handleLogout = () => {
    logout();
    navigate("/");
  };


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setSent(false);
    try {
      const response = await axios.post("http://localhost:5000/api/messages", formData);
      if (response.data.success) {
        setSent(true);
        setStatusMsg("Message sent successfully!");
        setFormData({ fullName: "", email: "", subject: "", message: "" });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setStatusMsg("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="contact-page">
      {/* Navbar */}
      <div className="dashboard-navbar">
        <div className="logo">🌿 MangroveGuard</div>
        <div className="nav-links">
          <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
          <NavLink to="/sites" className={navClass}>Sites</NavLink>
          <NavLink to="/alerts" className={navClass}>Alerts</NavLink>
          <NavLink to="/about" className={navClass}>About</NavLink>
          <NavLink to="/contact" className={navClass}>Contact</NavLink>

          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="search-icon-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>

          <div className="profile-menu" ref={menuRef}>
            <button
              className="avatar-btn"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "👤"}
            </button>

            {menuOpen && (
              <div className="profile-dropdown">
                <Link to="/profile" onClick={() => setMenuOpen(false)}>
                  👤 Profile
                </Link>
                <button onClick={handleLogout}>🚪 Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Background Section */}
      <div
        className="contact-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >
        <div className="contact-container">

          <div className="contact-info">
            <h2>📞 Contact Information</h2>
            <p><strong>Email:</strong> mangroveguard@gmail.com</p>
            <p><strong>Phone:</strong> +94 77 123 4567</p>
            <p><strong>Address:</strong> University of Jaffna, Sri Lanka</p>
          </div>

          <h1>Contact Us</h1>

          <p className="contact-text">
            Have questions or need assistance?
            Send us a message and we'll respond as soon as possible.
          </p>

          {sent && (
            <p className="contact-sent-msg">
              ✅ Thanks! Your message has been noted — we'll get back to you soon.
            </p>
          )}

          {statusMsg && !sent && (
            <p className="status-msg" style={{ color: "red", backgroundColor: "white", padding: "10px", borderRadius: "5px" }}>{statusMsg}</p>
          )}

          <form className="contact-form" onSubmit={handleSubmit}>

            <div className="input-row">
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <input
              type="text"
              name="subject"
              placeholder="Subject"
              value={formData.subject}
              onChange={handleChange}
              required
            />

            <textarea
              name="message"
              rows="3"
              placeholder="Write your message..."
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
            <button type="submit">Send Message</button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Contact;