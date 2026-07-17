import "./SearchResults.css";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/navbar";
import mangrove from "../assests/mangrove.png";

function SearchResults() {

  const location = useLocation();

  const query =
    new URLSearchParams(location.search)
      .get("q")
      ?.toLowerCase()
      .trim() || "";

  const pages = [

    {
      title: "Home",
      path: "/",
      description:
        "Welcome page, Login, Register and Mangrove Guard overview.",
      keywords: [
        "home",
        "login",
        "register",
        "dashboard",
        "mangrove"
      ]
    },

    {
      title: "Monitoring Sites",
      path: "/visitor-sites",
      description:
        "View Negombo Lagoon, Puttalam and Kalpitiya monitoring sites.",
      keywords: [
        "site",
        "sites",
        "monitoring",
        "negombo",
        "lagoon",
        "puttalam",
        "kalpitiya",
        "device",
        "devices"
      ]
    },

    {
      title: "About Mangrove Guard",
      path: "/visitor-about",
      description:
        "Mission, monitoring system and project information.",
      keywords: [
        "about",
        "mission",
        "monitor",
        "temperature",
        "salinity",
        "water",
        "iot",
        "device",
        "battery"
      ]
    },

    {
      title: "Contact Us",
      path: "/visitor-contactus",
      description:
        "Contact information and message form.",
      keywords: [
        "contact",
        "email",
        "phone",
        "address",
        "message",
        "support",
        "help"
      ]
    }

  ];

  const results = pages.filter(page =>

    page.title.toLowerCase().includes(query) ||

    page.description.toLowerCase().includes(query) ||

    page.keywords.some(keyword =>
      keyword.includes(query)
    )

  );

  return (

    <div className="search-page">

      <Navbar showBackHome={true} />

      <section
        className="search-hero"
        style={{
          backgroundImage: `url(${mangrove})`
        }}
      >

        <div className="search-overlay">

          <div className="search-container">

            <h1>Search Results</h1>

            <p className="search-text">
              Results for
              <span className="search-query">
                "{query}"
              </span>
            </p>

            {

              results.length > 0 ? (

                <div className="results-grid">

                  {

                    results.map((item, index) => (

                      <Link
                        key={index}
                        to={item.path}
                        className="result-card"
                      >

                        <h2>{item.title}</h2>

                        <p>{item.description}</p>

                      </Link>

                    ))

                  }

                </div>

              ) : (

                <div className="no-results">

                  <h2>No Results Found</h2>

                  <p>

                    Try searching using keywords such as

                    <strong> Home</strong>,

                    <strong> Sites</strong>,

                    <strong> About</strong>,

                    <strong> Contact</strong>,

                    <strong> Negombo</strong>,

                    <strong> Salinity</strong>,

                    <strong> Water</strong>,

                    <strong> IoT</strong>

                  </p>

                </div>

              )

            }

          </div>

        </div>

      </section>

    </div>

  );

}

export default SearchResults;