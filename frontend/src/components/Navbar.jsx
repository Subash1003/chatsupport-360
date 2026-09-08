// Sticky, blurred top bar. Links change with auth state: signed out shows
// Chat · Login · Sign up; signed in shows Chat · Account · name · Log out.

import { Link, NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';
import logoWhite from '../assets/logo-white.png';

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'U';
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand" aria-label="360 Degree Info — home">
        <img src={logoWhite} alt="360 Degree Info" className="navbar-logo" />
      </Link>

      <nav className="navbar-links">
        <NavLink to="/chat" className="navbar-link">
          Chat
        </NavLink>

        {isAuthenticated ? (
          <>
            <NavLink to="/account" className="navbar-link">
              Account
            </NavLink>
            <span className="navbar-user" title={user?.email}>
              <span className="avatar avatar--user">{initials(user?.name)}</span>
              <span>{user?.name || user?.email}</span>
            </span>
            <button type="button" className="navbar-link" onClick={handleLogout}>
              <Icon name="logout" size={14} />
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="navbar-link">
              Login
            </NavLink>
            <NavLink to="/signup" className="navbar-link">
              Sign up
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
