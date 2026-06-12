import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Sites from "./pages/Sites";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import Alerts from "./pages/Alerts"; 
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import ManageUsers from "./pages/ManageUsers";
import ManageDevices from "./pages/ManageDevices";
import AdminAlerts from "./pages/AdminAlerts";
import AdminMaps from "./pages/AdminMaps";
import AdminProfile from "./pages/AdminProfile";


function App() {
  return (
    <BrowserRouter>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/about" element={<About />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/manage-users" element={<ManageUsers />} />
        <Route path="/manage-devices" element={<ManageDevices />} />
        <Route path="/admin-alerts" element={<AdminAlerts />} />
        <Route path="/admin-maps" element={<AdminMaps />} />
        <Route path="/admin-profile" element={<AdminProfile />} />
        
      </Routes>

    </BrowserRouter>
  );
}

export default App;