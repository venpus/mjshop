import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { PermissionProvider } from "./contexts/PermissionContext.tsx";
import { LanguageProvider } from "./contexts/LanguageContext.tsx";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <PermissionProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </PermissionProvider>
    </AuthProvider>
  </BrowserRouter>
);
  