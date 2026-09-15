import React, { useState, useEffect, useCallback } from "react";
import CallingAgentDashboard from "./components/CallingAgentDashboard/CallingAgentDashboard";
import LoginPage from "./components/LoginPage";
import api, { getAuthToken, getStoredUser } from "./services/api";

function App() {
  const [authToken, setAuthToken] = useState(() => getAuthToken());
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  const handleLoginSuccess = useCallback((user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
  }, []);

  const handleLogout = useCallback(() => {
    api.logout();
    setAuthToken("");
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const handleAuthUnauthorized = () => {
      setAuthToken("");
      setCurrentUser(null);
    };

    const handleAuthLogout = () => {
      setAuthToken("");
      setCurrentUser(null);
    };

    const handleAuthLogin = (e) => {
      if (e?.detail) {
        setAuthToken(e.detail.token);
        setCurrentUser(e.detail.user);
      }
    };

    window.addEventListener("auth:unauthorized", handleAuthUnauthorized);
    window.addEventListener("auth:logout", handleAuthLogout);
    window.addEventListener("auth:login", handleAuthLogin);

    return () => {
      window.removeEventListener("auth:unauthorized", handleAuthUnauthorized);
      window.removeEventListener("auth:logout", handleAuthLogout);
      window.removeEventListener("auth:login", handleAuthLogin);
    };
  }, []);

  // If unauthenticated or token missing, render LoginPage
  if (!authToken || !currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <CallingAgentDashboard
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  );
}

export default App;