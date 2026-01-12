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
    
    console.log("[AUTH-CALLBACK] Starting authentication callback...");
    console.log("[AUTH-CALLBACK] Current URL:", window.location.href);
    
    // The new SaaS system sends ?token=
    const token = searchParams.get("token");
    // Legacy support for ?code=
    const code = searchParams.get("code");

    console.log("[AUTH-CALLBACK] Token present:", !!token);
    console.log("[AUTH-CALLBACK] Code present:", !!code);
    
    if (token) {
      console.log("[AUTH-CALLBACK] Token received (first 20 chars):", token.substring(0, 20) + "...");
    }

    if (token || code) {
      processed.current = true;
      
      console.log("[AUTH-CALLBACK] Exchanging token with backend...");
      
      // Exchange either token or code for our local system token
      axios.post("/api/auth/exchange", { token, code })
        .then(res => {
           console.log("[AUTH-CALLBACK] Exchange successful!");
           console.log("[AUTH-CALLBACK] Received local token (first 20 chars):", res.data.token.substring(0, 20) + "...");
           console.log("[AUTH-CALLBACK] User:", res.data.user?.email);
           
           // res.data.token is our local JWT
           handleCallback(res.data.token).then(() => {
             console.log("[AUTH-CALLBACK] Token stored, navigating to dashboard...");
             navigate("/dashboard", { replace: true });
           });
        })
        .catch(err => {
           console.error("[AUTH-CALLBACK] Login exchange failed:", err);
           console.error("[AUTH-CALLBACK] Error response:", err.response?.data);
           console.error("[AUTH-CALLBACK] Error status:", err.response?.status);
           navigate("/login");
        });
    } else {
      console.log("[AUTH-CALLBACK] No token or code found in URL, redirecting to login");
      navigate("/login");
    }
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0b0e14]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xl font-semibold text-white">Authenticating...</div>
      </div>
    </div>
  );
}
