import "./home.css";
import mangrove from "../assests/mangrove.png";
import UserNavbar from "../components/UserNavbar";
import Footer from "../components/Footer";
import {
  Globe, Leaf, Waves, Thermometer, Battery, Activity,
  Users, User, GraduationCap
} from "lucide-react";

/* ───────── TEAM DATA (edit here) ─────────
   To add a photo: import it at the top, e.g.
   import anushka from "../assests/team/anushka.jpg";
   then set  photo: anushka
*/
const TEAM_MEMBERS = [
  { firstName: "Member", lastName: "Name A", programme: "Degree Programme / Department", photo: null },
  { firstName: "Member", lastName: "Name B", programme: "Degree Programme / Department", photo: null },
  { firstName: "Member", lastName: "Name C", programme: "Degree Programme / Department", photo: null },
  { firstName: "Member", lastName: "Name D", programme: "Degree Programme / Department", photo: null },
];

const SUPERVISOR = {
  role: "Project Supervisor",
  name: "Dr. Supervisor Name",
  designation: "Designation",
  department: "Department of [Department]",
  university: "[University Name]",
  photo: null,
};

const CLIENT = {
  role: "Client",
  name: "Dr. Client Name",
  designation: "Lecturer",
  department: "Department of Zoology",
  university: "[University Name]",
  photo: null,
};

/* Alphabetical by surname, so no one is ranked */
const sortedTeam = [...TEAM_MEMBERS].sort((a, b) => a.lastName.localeCompare(b.lastName));

/* Round photo, or a placeholder icon when there is no photo yet */
function PersonPhoto({ photo, name, size = 96 }) {
  const circle = {
    width: size,
    height: size,
    borderRadius: "50%",
    margin: "0 auto 12px",
    border: "2px solid #0b5d3b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e6f2ec",
    overflow: "hidden",
  };
  return (
    <div style={circle}>
      {photo ? (
        <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <User size={size * 0.5} color="#0b5d3b" />
      )}
    </div>
  );
}

function PersonCard({ person }) {
  return (
    <div
      className="visitor-monitor-card"
      style={{ flex: "1 1 260px", maxWidth: "340px", textAlign: "center" }}
    >
      <PersonPhoto photo={person.photo} name={person.name} size={110} />
      <div style={{ fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", color: "#0b5d3b", fontWeight: 600, marginBottom: "6px" }}>
        {person.role}
      </div>
      <h4 style={{ margin: "0 0 4px" }}>{person.name}</h4>
      <p style={{ margin: "0 0 2px" }}>{person.designation}</p>
      <p style={{ margin: "0 0 2px" }}>{person.department}</p>
      <p style={{ margin: 0 }}>{person.university}</p>
    </div>
  );
}

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

            {/* ───────── Our Team ───────── */}
            <div className="visitor-about-section" style={{ marginTop: "30px" }}>
              <h2 className="visitor-about-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: "6px" }}>
                <Users size={28} color="#0b5d3b" /> Our Team
              </h2>
              <p className="visitor-about-description" style={{ textAlign: "center", marginBottom: "20px", fontSize: "13px", opacity: 0.8 }}>
                Listed alphabetically
              </p>

              <div className="visitor-monitor-grid" style={{ marginBottom: "30px" }}>
                {sortedTeam.map((m, i) => (
                  <div className="visitor-monitor-card" key={i} style={{ textAlign: "center" }}>
                    <PersonPhoto photo={m.photo} name={`${m.firstName} ${m.lastName}`} />
                    <h4 style={{ margin: "0 0 4px" }}>{m.firstName} {m.lastName}</h4>
                    <p style={{ margin: 0 }}>{m.programme}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ───────── Guidance and Collaboration ───────── */}
            <div className="visitor-about-section">
              <h2 className="visitor-about-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: "20px" }}>
                <GraduationCap size={28} color="#0b5d3b" /> Guidance and Collaboration
              </h2>

              <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap", marginBottom: "20px" }}>
                <PersonCard person={SUPERVISOR} />
                <PersonCard person={CLIENT} />
              </div>
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