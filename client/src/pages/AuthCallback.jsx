import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { handleCallback } = useAuth();
  const navigate = useNavigate();

  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    
    // Check for ?token= (legacy/direct) OR ?code= (frontend flow)
    const token = searchParams.get("token");
    const code = searchParams.get("code");

    if (token) {
      processed.current = true;
      handleCallback(token).then(() => navigate("/dashboard", { replace: true }));
    } else if (code) {
      processed.current = true;
      // Exchange code for token via backend
      axios.post("/api/auth/exchange", { code })
        .then(res => {
           handleCallback(res.data.token).then(() => navigate("/dashboard", { replace: true }));
        })
        .catch(err => {
           console.error("Login failed", err);
           // Only alert if it's not a cancelled/aborted request
           // alert("Login failed: " + (err.response?.data?.error || err.message));
           navigate("/login");
        });
    } else {
      navigate("/login");
    }
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl font-semibold">Authenticating...</div>
    </div>
  );
}
