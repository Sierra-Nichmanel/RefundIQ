import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./index.css";

import App from "./App";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import ProtectedAdminRoute from "./ProtectedAdminRoute";
import "./styles/brand.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public customer refund portal */}
        <Route path="/" element={<App />} />

        {/* Public administrator login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected administrator routes */}
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
