import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/home/Home";
import DummyPayment from "./pages/payment/DummyPayment";
import AiSymptomServicePage from "./pages/ai-service/AiSymptomServicePage";

const PaymentSuccess = () => <h2>Payment Successful</h2>;
const PaymentCancel = () => <h2>Payment Cancelled</h2>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* AI Symptom Service */}
        <Route path="/ai-symptom-service" element={<AiSymptomServicePage />} />

        {/* Payment */}
        <Route path="/payment" element={<DummyPayment />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;