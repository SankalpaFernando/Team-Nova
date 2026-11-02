import React, { useState, useEffect } from "react";
import "./Contact.css";
import mangrove from "../assests/mangrove.png";
import api from "../services/api";
import UserNavbar from "../components/UserNavbar";
import Footer from "../components/Footer";
import UserLayout from "../components/UserLayout";
import { useAuth } from "../context/AuthContext";
import { Phone, Mail, MapPin, CheckCircle2, Send } from "lucide-react";

function Contact() {
  const { user } = useAuth();
  const isRegisteredUser = user && user.role === 'registered_user';

  const [sites, setSites] = useState([]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    site: "",
    message: ""
  });
  const [statusMsg, setStatusMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await api.get("/sites");
        setSites(res.data.data || []);
      } catch (err) {
        console.error("Could not fetch sites list for contact form", err);
      }
    };
    fetchSites();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setSent(false);
    setSubmitting(true);
    try {
      const response = await api.post("/messages", formData);
      if (response.data.success) {
        setSent(true);
        setStatusMsg("Message sent successfully!");
        setFormData({ fullName: "", email: "", subject: "", site: "", message: "" });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setStatusMsg("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // If registered user, render inside UserLayout with 2 balanced boxes
  if (isRegisteredUser) {
    return (
      <UserLayout activePage="contact">
        <div className="ul-header">
          <div>
            <p className="ul-breadcrumb">Support › Contact</p>
            <h1 className="ul-title">Contact Us</h1>
            <p className="ul-subtitle">Have questions or need assistance? Reach out to us or send us a message.</p>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px",
          maxWidth: "1050px",
          alignItems: "stretch"
        }}>
          {/* Box 1: Contact Information */}
          <div className="ul-card" style={{
            padding: "30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: "12px",
            background: "#ffffff"
          }}>
            <div>
              <h2 style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#1c3a2a",
                margin: "0 0 10px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Phone size={20} color="#1d7068" />
                <span>Contact Information</span>
              </h2>
              <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 24px", lineHeight: 1.5 }}>
                Have questions or need assistance? Send us a message and we'll respond as soon as possible.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontSize: "14px", color: "#374151" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#eaf3ee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Mail size={18} color="#1d7068" />
                  </div>
                  <div>
                    <strong style={{ color: "#152b1f", display: "block", fontSize: "13px" }}>Email:</strong>
                    <a href="mailto:mangroveguard@gmail.com" style={{ color: "#1d7068", textDecoration: "none" }}>
                      mangroveguard@gmail.com
                    </a>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#eaf3ee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Phone size={18} color="#1d7068" />
                  </div>
                  <div>
                    <strong style={{ color: "#152b1f", display: "block", fontSize: "13px" }}>Phone:</strong>
                    <span style={{ color: "#374151" }}>+94 70 488 4982</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#eaf3ee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <MapPin size={18} color="#1d7068" />
                  </div>
                  <div>
                    <strong style={{ color: "#152b1f", display: "block", fontSize: "13px" }}>Address:</strong>
                    <span style={{ color: "#374151", lineHeight: 1.5, display: "block" }}>
                      Department of Computer Science &amp; Department of Zoology,<br />
                      Faculty of Science, University of Jaffna,<br />
                      Thirunelvely, Jaffna 40000, Sri Lanka.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Contact Form */}
          <div className="ul-card" style={{
            padding: "30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: "12px",
            background: "#ffffff"
          }}>
            <div>
              <h2 style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#1c3a2a",
                margin: "0 0 8px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <Send size={18} color="#1d7068" />
                <span>Send Us a Message</span>
              </h2>
              <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 18px" }}>
                Fill out the form below and we'll respond as soon as possible.
              </p>

              {sent && (
                <div style={{
                  background: "#d4edda",
                  color: "#155724",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px"
                }}>
                  <CheckCircle2 size={18} color="#155724" />
                  <span>Thanks! Your message has been noted — we'll get back to you soon.</span>
                </div>
              )}

              {statusMsg && !sent && (
                <div style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "13px"
                }}>
                  {statusMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="ul-lbl" style={{ display: "block", marginBottom: "4px" }}>Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      className="ul-select"
                      style={{ width: "100%" }}
                      placeholder="Your name"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="ul-lbl" style={{ display: "block", marginBottom: "4px" }}>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      className="ul-select"
                      style={{ width: "100%" }}
                      placeholder="Your email address"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="ul-lbl" style={{ display: "block", marginBottom: "4px" }}>Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    className="ul-select"
                    style={{ width: "100%" }}
                    placeholder="Subject of your message"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="ul-lbl" style={{ display: "block", marginBottom: "4px" }}>Which site is this about? (optional)</label>
                  <select
                    name="site"
                    className="ul-select"
                    style={{ width: "100%" }}
                    value={formData.site}
                    onChange={handleChange}
                  >
                    <option value="">General inquiry (No specific site)</option>
                    {sites.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.region})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ul-lbl" style={{ display: "block", marginBottom: "4px" }}>Message *</label>
                  <textarea
                    name="message"
                    className="ul-select"
                    rows="4"
                    style={{ width: "100%", resize: "vertical" }}
                    placeholder="Write your message..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#1c3a2a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    marginTop: "4px"
                  }}
                >
                  <Send size={15} />
                  <span>{submitting ? "Sending..." : "Send Message"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  // Visitor View
  return (
    <div className="contact-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <UserNavbar />

      <div
        className="contact-hero"
        style={{ backgroundImage: `url(${mangrove})`, flex: 1 }}
      >
        <div className="contact-container">
          <div className="contact-info">
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Phone size={20} color="#34d399" />
              <span>Contact Information</span>
            </h2>
            <p><Mail size={14} style={{ marginRight: "6px" }} /><strong>Email:</strong> mangroveguard@gmail.com</p>
            <p><Phone size={14} style={{ marginRight: "6px" }} /><strong>Phone:</strong> +94 77 123 4567</p>
            <p><MapPin size={14} style={{ marginRight: "6px" }} /><strong>Address:</strong> Department of Computer Science &amp; Department of Zoology, Faculty of Science, University of Jaffna, Thirunelvely, Jaffna 40000, Sri Lanka.</p>
          </div>

          <h1>Contact Us</h1>

          <p className="contact-text">
            Have questions or need assistance?
            Send us a message and we'll respond as soon as possible.
          </p>

          {sent && (
            <p className="contact-sent-msg" style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
              <CheckCircle2 size={18} color="#166534" />
              <span>Thanks! Your message has been noted — we'll get back to you soon.</span>
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

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#475569", display: "block", marginBottom: "4px" }}>Which site is this about? (optional)</label>
              <select
                name="site"
                className="input-row"
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", background: "#fff", fontSize: "14px" }}
                value={formData.site}
                onChange={handleChange}
              >
                <option value="">General inquiry (No specific site)</option>
                {sites.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.region})</option>
                ))}
              </select>
            </div>

            <textarea
              name="message"
              rows="3"
              placeholder="Write your message..."
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
            <button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Contact;
