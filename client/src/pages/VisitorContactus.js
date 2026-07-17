import "./VisitorContactus.css";
import Navbar from "../components/navbar";
import mangrove from "../assests/mangrove.png";
import { useState } from "react";

function VisitorContactus() {

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

  };

  const handleSubmit = (e) => {

    e.preventDefault();

    // Backend API can be connected here later

    console.log(formData);

    setSubmitted(true);

    setFormData({
      name: "",
      email: "",
      subject: "",
      message: ""
    });

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

              <h2>📞 Contact Information</h2>

              <p><strong>Email:</strong> mangroveguard@gmail.com</p>

              <p><strong>Phone:</strong> +94 77 123 4567</p>

              <p><strong>Address:</strong> University of Jaffna, Sri Lanka</p>

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

                  <div className="input-row">

                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
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
                  ✅
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

    </div>

  );

}

export default VisitorContactus;