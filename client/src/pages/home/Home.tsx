import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Telemedicine Platform</h1>
      <p>Select a service</p>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button onClick={() => navigate("/payment")}>Go to Payment Page</button>
        <button onClick={() => alert("AI Symptom page not added yet")}>
          Go to AI Symptom Page
        </button>
      </div>
    </div>
  );
};

export default Home;