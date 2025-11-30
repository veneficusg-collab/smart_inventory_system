// ProtectedRoute.js
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [qrUser, setQrUser] = useState(null);
  
  useEffect(() => {
    // ✅ Check Supabase Auth session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // ✅ Check QR login session in localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setQrUser(JSON.parse(storedUser));
      setLoading(false);
    }

    // ✅ Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  // ✅ If no Supabase session AND no QR user → redirect to login
  if (!session && !qrUser) {
    return <Navigate to="/" />;
  }

  // ✅ Otherwise allow access
  return children;
};

export default ProtectedRoute;
