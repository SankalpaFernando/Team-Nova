import "./home.css";
import mangrove from "../assests/mangrove.png";
import UserNavbar from "../components/UserNavbar";
import Footer from "../components/Footer";
import { Globe, Leaf, Waves, Thermometer, Battery, Activity } from "lucide-react";

function About() {
  return (
    <div className="visitor-about-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <UserNavbar />

      {/* Hero Content */}
      <section
        className="visitor-about-hero"
        style={{ backgroundImage: `url(${mangrove})`, flex: 1 }}
      >
        <div className="visitor-about-overlay">
          <div className="visitor-about-container">

            <div className="visitor-about-mission">
              <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Globe size={28} color="#ffffff" /> Our Mission
              </h2>
              <p>
                Protect mangrove ecosystems through real-time IoT monitoring and smart environmental management.
              </p>
            </div>

            <div className="visitor-about-section" style={{ marginTop: "30px" }}>
              <h2 className="visitor-about-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: "10px" }}>
                <Leaf size={28} color="#0b5d3b" /> About Mangrove Guard
              </h2>
              <p className="visitor-about-description" style={{ textAlign: "center", marginBottom: "20px", fontSize: "15px", lineHeight: "1.6" }}>
                Mangrove Guard is an IoT-based monitoring platform that collects real-time environmental data from devices installed in mangrove forests and provides instant updates through a web dashboard.
              </p>
            </div>

            <div className="visitor-about-section">
              <h3 className="visitor-monitor-title" style={{ fontSize: "20px", marginTop: "10px", marginBottom: "20px" }}>
                What We Monitor
              </h3>

              <div className="visitor-monitor-grid" style={{ marginBottom: "30px" }}>
                <div className="visitor-monitor-card">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: "center" }}>
                    <Waves size={20} color="#0b5d3b" /> Water Level
                  </h4>
                  <p>Tracks tidal flow & anomalous sea level changes.</p>
                </div>
                <div className="visitor-monitor-card">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: "center" }}>
                    <Activity size={20} color="#0b5d3b" /> Salinity
                  </h4>
                  <p>Measures critical salt concentrations for plant health.</p>
                </div>
                <div className="visitor-monitor-card">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: "center" }}>
                    <Thermometer size={20} color="#0b5d3b" /> Temperature
                  </h4>
                  <p>Monitors water temperature fluctuations.</p>
                </div>
                <div className="visitor-monitor-card">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: "center" }}>
                    <Battery size={20} color="#0b5d3b" /> Diagnostics
                  </h4>
                  <p>Tracks device uptime, battery, and signal health.</p>
                </div>
              </div>

              <h3 className="visitor-about-title" style={{ fontSize: "20px", marginBottom: "10px", color: "#0b5d3b" }}>
                Why Mangrove Guard?
              </h3>
              <p className="visitor-about-description" style={{ textAlign: "center", marginBottom: "20px", fontSize: "15px", lineHeight: "1.6" }}>
                The platform enables researchers and conservation teams to monitor multiple mangrove sites, detect environmental changes, and make informed decisions using real-time sensor data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
}

export default About;