import { useState, useEffect } from "react";
import "./VisitorContactus.css";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import mangrove from "../assests/mangrove.png";
import axios from "axios";
import { Phone, CheckCircle } from 'lucide-react';

function VisitorContactus() {

  const [sites, setSites] = useState([]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    site: "",
    message: ""
  });

  const [submitted, setSubmitted] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/sites");
        setSites(res.data.data || []);
      } catch (err) {
        console.error("Could not fetch sites for contact form", err);
      }
    };
    fetchSites();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");

    try {
      const response = await axios.post("http://localhost:5000/api/messages", formData);
      if (response.data.success) {
        setSubmitted(true);
        setStatusMsg("");
        setFormData({
          fullName: "",
          email: "",
          subject: "",
          site: "",
          message: ""
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setStatusMsg("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="visitor-contact-page">
      <Navbar showBackHome={true} />

      <section
        className="visitor-contact-hero"
        style={{
          backgroundImage: `url(${mangrove})`
        }}
      >
        <div className="visitor-contact-overlay">
          <div className="visitor-contact-container">

            <div className="visitor-contact-info">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={24} /> Contact Information</h2>
              <p><strong>Email:</strong> mangroveguard@gmail.com</p>
              <p><strong>Phone:</strong> +94 77 123 4567</p>
              <p><strong>Address:</strong> Department of Computer Science &amp; Department of Zoology, Faculty of Science, University of Jaffna, Thirunelvely, Jaffna 40000, Sri Lanka.</p>
            </div>

            {!submitted ? (
              <>
                <h1>Contact Us</h1>
                <p className="visitor-contact-text">
                  Have questions or need assistance?
                  Send us a message and our team will respond as soon as possible.
                </p>

                <form
                  className="visitor-contact-form"
                  onSubmit={handleSubmit}
                >
                  {statusMsg && <p className="status-msg" style={{ color: "red", backgroundColor: "white", padding: "10px", borderRadius: "5px", marginBottom: "10px" }}>{statusMsg}</p>}

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
                    <label style={{ fontSize: "12px", color: "#e2e8f0", display: "block", marginBottom: "4px" }}>Which site is this about? (optional)</label>
                    <select
                      name="site"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", fontSize: "14px", color: "#0f172a", boxSizing: "border-box" }}
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
                    rows="4"
                    name="message"
                    placeholder="Write your message..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                  ></textarea>

                  <button type="submit">
                    Send Message
                  </button>
                </form>
              </>
            ) : (
              <div className="thank-you-box">
                <div className="thank-you-icon">
                  <CheckCircle size={48} color="#10b981" />
                </div>
                <h2>
                  Thank You for Contacting Us!
                </h2>
                <p>
                  Your message has been received successfully.
                </p>
                <p>
                  Our team will review your inquiry and get back to you as soon as possible.
                </p>
                <button
                  className="send-another-btn"
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Message
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default VisitorContactus;