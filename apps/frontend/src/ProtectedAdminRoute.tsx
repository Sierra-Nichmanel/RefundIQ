import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "./lib/api";

export default function ProtectedAdminRoute() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        await api.get("/auth/me");

        if (active) {
          setAuthenticated(true);
        }
      } catch {
        if (active) {
          setAuthenticated(false);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f7fb",
          color: "#475467",
          fontFamily: "sans-serif",
        }}
      >
        Verifying administrator session...
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
