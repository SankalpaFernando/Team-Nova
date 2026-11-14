import { Link } from "react-router-dom";
import {
  Trees,
  Waves,
  Fish,
  Globe2,
  ShieldCheck,
  Activity,
  ArrowRight,
  Compass,
  HelpCircle,
  BarChart3
} from "lucide-react";
import "./home.css";
import Navbar from "../components/navbar";
import Footer from "../components/Footer";
import mangrove from "../assests/mangrove.png";

function Home() {
  const scrollToAboutSection = () => {
    const section = document.getElementById("about-section");
    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };

  return (
    <div className="home">
      {/* Navigation Bar */}
      <Navbar />

      {/* Hero Section */}
      <section
        className="hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >
        <div className="hero-overlay">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="live-indicator">
                <span className="live-dot"></span>
                <Activity size={14} />
              </span>
              <span>Live Sensor Monitoring</span>
            </div>

            <h1>Mangrove Guard</h1>

            <h3>
              Real-Time Mangrove Ecosystem & Water Quality Telemetry
            </h3>

            <p className="hero-description">
              Safeguarding vital coastal mangrove forests through automated IoT sensor arrays,
              continuous water chemistry analytics, and actionable environmental data.
            </p>

            <div className="hero-buttons">
              <button
                className="learn-btn"
                onClick={scrollToAboutSection}
              >
                <Compass size={18} />
                <span>Explore Impact</span>
              </button>

              <Link to="/visitor-sites">
                <button className="sites-btn">
                  <span>View Monitoring Sites</span>
                  <ArrowRight size={18} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= About Mangroves Section ================= */}
      <section id="about-section" className="about-section">
        <div className="section-header">
          <span className="section-tag">CONSERVATION SCIENCE</span>
          <h2>Why Mangroves Matter</h2>
          <p className="section-intro">
            Mangroves are among the world's most valuable coastal ecosystems.
            They shield shorelines from erosion, filter runoff water, support marine biodiversity,
            and store up to four times more carbon than tropical rainforests.
          </p>
        </div>

        <div className="about-grid">
          <div className="about-card">
            <div className="card-icon-wrapper">
              <Trees className="card-icon" size={24} />
            </div>
            <h3>What are Mangroves?</h3>
            <p>
              Coastal trees and shrubs thriving along tropical shorelines. Their complex stilt roots
              stabilize coastal sediments and serve as vital marine nurseries.
            </p>
          </div>

          <div className="about-card">
            <div className="card-icon-wrapper">
              <Waves className="card-icon" size={24} />
            </div>
            <h3>Why Monitor Water Quality?</h3>
            <p>
              Temperature fluctuations and pH changes directly impact forest health.
              Continuous telemetry enables early intervention before degradation occurs.
            </p>
          </div>

          <div className="about-card">
            <div className="card-icon-wrapper">
              <Fish className="card-icon" size={24} />
            </div>
            <h3>Rich Biodiversity Hubs</h3>
            <p>
              Mangrove canopies and submerged roots nourish fish, crabs, shrimp, migratory birds, and endangered
              wildlife throughout critical lifecycle stages.
            </p>
          </div>

          <div className="about-card">
            <div className="card-icon-wrapper">
              <Globe2 className="card-icon" size={24} />
            </div>
            <h3>Blue Carbon Sequestration</h3>
            <p>
              Mangroves capture atmospheric carbon and bury it in anaerobic soil for centuries, serving as a powerful
              natural shield against climate change.
            </p>
          </div>

          <div className="about-card">
            <div className="card-icon-wrapper">
              <ShieldCheck className="card-icon" size={24} />
            </div>
            <h3>Natural Shoreline Protection</h3>
            <p>
              Dense mangrove root networks dissipate wave energy, reduce coastal erosion, and buffer seaside communities
              against severe storm surges.
            </p>
          </div>

          <div className="about-card">
            <div className="card-icon-wrapper">
              <BarChart3 className="card-icon" size={24} />
            </div>
            <h3>Smart IoT Monitoring</h3>
            <p>
              MangroveGuard collects real-time temperature and pH telemetry to empower environmental
              researchers and authorities.
            </p>
          </div>
        </div>
      </section>

      {/* ================= FAQ Section ================= */}
      <section className="faq-section">
        <div className="section-header">
          <span className="section-tag">KNOWLEDGE BASE</span>
          <h2>Frequently Asked Questions</h2>
        </div>

        <div className="faq-container">
          <div className="faq-item">
            <div className="faq-question">
              <HelpCircle className="faq-icon" size={20} />
              <h3>Why are mangroves important to coastal ecosystems?</h3>
            </div>
            <p>
              They buffer coastlines against extreme weather, filter agricultural and urban runoff, support commercial fisheries, and absorb massive amounts of carbon dioxide.
            </p>
          </div>

          <div className="faq-item">
            <div className="faq-question">
              <HelpCircle className="faq-icon" size={20} />
              <h3>What environmental parameters are monitored?</h3>
            </div>
            <p>
              Water temperature and pH levels are monitored continuously in real time.
            </p>
          </div>

          <div className="faq-item">
            <div className="faq-question">
              <HelpCircle className="faq-icon" size={20} />
              <h3>Who can access the MangroveGuard data?</h3>
            </div>
            <p>
              Environmental researchers, site engineers, conservation agencies, and local community stakeholders can view real-time metrics and historical reports.
            </p>
          </div>

          <div className="faq-item">
            <div className="faq-question">
              <HelpCircle className="faq-icon" size={20} />
              <h3>How does real-time monitoring help conservation?</h3>
            </div>
            <p>
              Automated threshold alerts immediately notify site engineers when temperature or pH readings exceed safe limits, allowing teams to respond before irreversible ecological damage.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default Home;