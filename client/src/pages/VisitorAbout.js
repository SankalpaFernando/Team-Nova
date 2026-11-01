import "./home.css";
import UserNavbar from "../components/UserNavbar";
import Footer from "../components/Footer";
import UserLayout from "../components/UserLayout";
import { useAuth } from "../context/AuthContext";
import mangrove from "../assests/mangrove.png";
import dulanga from "../assests/team/dulanga.jpeg";
import drarthiyan from "../assests/team/drarthiyan.jpg";
import drsarves from "../assests/team/drsarves.webp";
import kavithra from "../assests/team/kavithra.jpeg";
import nisansala from "../assests/team/nisansala.jpeg";
import aruni from "../assests/team/aruni.jpeg";
import chandrika from "../assests/team/chandrika.jpeg";

import {
  Globe, Leaf, Thermometer, FlaskConical, Waves, Droplets,
  Users, User, GraduationCap
} from 'lucide-react';

/* ───────── TEAM DATA ───────── */
const TEAM_MEMBERS = [
  { firstName: "Kavithra", lastName: "Nirmali", programme: "Department of Computer Science", university: "University of Jaffna", photo: kavithra },
  { firstName: "Kasuni", lastName: "Nisansala", programme: "Department of Computer Science", university: "University of Jaffna", photo: nisansala },
  { firstName: "Dulanga", lastName: "Munasinghe", programme: "Department of Computer Science", university: "University of Jaffna", photo: dulanga },
  { firstName: "Umeshika", lastName: "Rathnasiri", programme: "Department of Computer Science", university: "University of Jaffna", photo: aruni },
  { firstName: "Chandrika", lastName: "Kandepola", programme: "Department of Computer Science", university: "University of Jaffna", photo: chandrika },
];

const SUPERVISOR = {
  role: "Project Supervisor",
  name: "Dr. K.Sarveswaran",
  designation: "Senior Lecturer",
  department: "Department of Computer Science",
  university: "University of Jaffna",
  photo: drsarves,
};

const CLIENT = {
  role: "Project Partner",
  name: "Dr. S.Arthiyan",
  designation: "Senior Lecturer",
  department: "Department of Zoology",
  university: "University of Jaffna",
  photo: drarthiyan,
};

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

/* Identical Visitor About Boxes (Split between About and Team) */
function AboutBoxes() {
  return (
    <div className="visitor-about-stack">

      {/* ───────── BOX 1: existing content ───────── */}
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
          <h3 className="visitor-monitor-title" style={{ fontSize: "20px", marginTop: "10px", marginBottom: "10px" }}>
            What We Monitor
        </h3>
        <p className="visitor-about-description" style={{ textAlign: "center", marginBottom: "20px", fontSize: "15px", lineHeight: "1.6" }}>
          Each monitoring site tracks key water-quality parameters, and the team is alerted when a reading moves outside its safe range.
        </p>

        <div className="visitor-monitor-grid" style={{ marginBottom: "30px" }}>
          <div className="visitor-monitor-card">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: "center" }}>
              <Thermometer size={20} color="#0b5d3b" /> Temperature
            </h4>
            <p>Tracks water temperature, which influences oxygen levels and the health of mangrove roots and the life around them.</p>
          </div>
          <div className="visitor-monitor-card">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: "center" }}>
              <FlaskConical size={20} color="#0b5d3b" /> pH Level
            </h4>
            <p>Measures how acidic or alkaline the water is. Sudden shifts can stress mangrove plants and aquatic species.</p>
          </div>
          <div className="visitor-monitor-card">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: "center" }}>
              <Waves size={20} color="#0b5d3b" /> Salinity
            </h4>
            <p>Monitors the salt concentration of the water, which mangrove species tolerate only within certain ranges.</p>
          </div>
          <div className="visitor-monitor-card">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: "center" }}>
              <Droplets size={20} color="#0b5d3b" /> Dissolved Oxygen
            </h4>
            <p>Measures the oxygen available to fish, crabs, and other organisms living in the water.</p>
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

      {/* ───────── BOX 2: team ───────── */}
      <div className="visitor-about-container visitor-team-box">
        <div className="visitor-about-section">
          <div className="visitor-about-mission" style={{ marginBottom: "20px" }}>
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Users size={28} color="#ffffff" /> Our Team
            </h2>
            <p>
              The people behind Mangrove Guard.
            </p>
          </div>

          <div className="visitor-monitor-grid" style={{ marginBottom: "30px" }}>
            {TEAM_MEMBERS.map((m, i) => (
              <div className="visitor-monitor-card" key={i} style={{ textAlign: "center" }}>
                <PersonPhoto photo={m.photo} name={`${m.firstName} ${m.lastName}`} />
                <h4 style={{ margin: "0 0 4px" }}>{m.firstName} {m.lastName}</h4>
                <p style={{ margin: "0 0 2px" }}>{m.programme}</p>
                <p style={{ margin: 0 }}>{m.university}</p>
              </div>
            ))}
          </div>
        </div>

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
  );
}

function About() {
  const { user } = useAuth();
  const isRegisteredUser = user && user.role === 'registered_user';

  // Registered user view: uses sidebar, NO background image
  if (isRegisteredUser) {
    return (
      <UserLayout activePage="about">
        <div style={{ padding: "10px 0" }}>
          <AboutBoxes />
        </div>
      </UserLayout>
    );
  }

  // Visitor view: uses top navbar, footer, and hero background image
  return (
    <div className="visitor-about-page">
      <UserNavbar showBackHome={true} />
      <section
        className="visitor-about-hero"
        style={{ backgroundImage: `url(${mangrove})` }}
      >
        <div className="visitor-about-overlay">
          <AboutBoxes />
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default About;
