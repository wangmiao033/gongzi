import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "antd/dist/reset.css";
import "./style.css";
import { AppLayout } from "./App";
import { LoginPage } from "./pages/LoginPage";
import { EmployeeListPage } from "./pages/EmployeeListPage";
import { PayrollBatchListPage } from "./pages/PayrollBatchListPage";
import { PayrollEditPage } from "./pages/PayrollEditPage";

const rootElement = document.getElementById("app") as HTMLElement;

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/employees" replace />} />
          <Route path="employees" element={<EmployeeListPage />} />
          <Route path="payroll" element={<PayrollBatchListPage />} />
          <Route path="payroll/:id" element={<PayrollEditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

