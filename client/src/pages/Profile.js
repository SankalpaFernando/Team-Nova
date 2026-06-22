import "./Profile.css";
import mangrove from "../assests/mangrove.png";

function Profile() {
  return (
    <div
      className="profile-page"
      style={{ backgroundImage: `url(${mangrove})` }}
    >
      <div className="profile-overlay">

        <h2 className="profile-title">User Profile</h2>

        {/* Profile Card */}
        <div className="profile-card">

          <div className="profile-info">
            <h3>John Doe</h3>
            <p>Email: johndoe@gmail.com</p>
            <p>Role: Registered User</p>
          </div>

          <button className="edit-btn">
            Edit Profile
          </button>

        </div>

        {/* Additional Information */}

        <div className="profile-details">

          <h3>Details</h3>

          <p><strong>Joined:</strong> January 2026</p>

          <p><strong>Reports Submitted:</strong> 5</p>

          <p><strong>Active Status:</strong> Active</p>

        </div>

      </div>
    </div>
  );
}

export default Profile;