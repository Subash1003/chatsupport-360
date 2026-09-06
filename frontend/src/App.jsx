// -----------------------------------------------------------------------------
// App.jsx
//
// Layout (navbar + page area + footer + floating contact) and the route table.
//
// Public:     /  /chat  /login  /signup  /forgot-password
// Protected:  /account  /projects  /projects/:id   (wrapped in <ProtectedRoute>)
//
// The page area is keyed on the pathname so each route mounts with a short
// enter animation (`.route` in index.css; disabled under prefers-reduced-motion).
// -----------------------------------------------------------------------------

import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Icon from './components/Icon.jsx';
import FloatingContact from './components/FloatingContact.jsx';
import logoWhite from './assets/logo-white.png';

import HomePage from './pages/HomePage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-grid">
        <div className="footer-col">
          <span className="footer-brand">
            <img src={logoWhite} alt="360 Degree Info" className="footer-logo" />
          </span>
          <p>
            Website design, development &amp; digital marketing.
            <br />
            Chennai, India · serving 13 countries.
          </p>
          <div className="footer-social">
            <a href="https://www.facebook.com/360degreeinfo" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <Icon name="facebook" size={16} />
            </a>
            <a href="https://www.linkedin.com/company/360degreeinfo" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Icon name="linkedin" size={16} />
            </a>
            <a href="https://www.instagram.com/360degreeinfochennai" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Icon name="instagram" size={16} />
            </a>
            <a href="https://www.youtube.com/@360degreeinfo" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <Icon name="youtube" size={16} />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Assistant</h4>
          <Link to="/chat">Open the assistant</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/signup">Create an account</Link>
          <Link to="/account">Your account</Link>
        </div>

        <div className="footer-col">
          <h4>Reach us</h4>
          <a href="mailto:info@360degreeinfo.com">info@360degreeinfo.com</a>
          <a href="tel:+914442132523">+91 44 42132523</a>
          <a href="https://wa.me/919941186071" target="_blank" rel="noopener noreferrer">
            WhatsApp +91 99411 86071
          </a>
          <p>+91 98846 82652 · +91 81248 77711</p>
        </div>
      </div>

      <div className="footer-bar">
        © {new Date().getFullYear()} 360 DEGREEINFO PRIVATE LIMITED · Support assistant
      </div>
    </footer>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <div className="route" key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Admin console — its own token, self-guarded inside AdminPage. */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <Footer />
      <FloatingContact />
    </div>
  );
}
