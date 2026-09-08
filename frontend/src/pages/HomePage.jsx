// Landing page: hero + a grid of what the assistant can help with.

import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import BrandMark from '../components/BrandMark.jsx';
import Icon from '../components/Icon.jsx';

const FEATURES = [
  { icon: 'code', title: 'Websites & web apps', text: 'WordPress, custom builds, redesigns, portals — with pricing and timelines.' },
  { icon: 'cart', title: 'E-commerce', text: 'WooCommerce and custom stores, payment gateways, catalogue and orders.' },
  { icon: 'megaphone', title: 'SEO & digital marketing', text: 'Search, social, ads and bulk campaigns — monthly retainers explained.' },
  { icon: 'server', title: 'Hosting & support', text: '99.9% uptime hosting, maintenance plans, and how support tickets work.' },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="page">
      <section className="hero">
        <BrandMark size="lg" />
        <p className="hero-eyebrow">
          <Icon name="spark" size={13} /> Best Website Design Company in Chennai
        </p>
        <h1>The 360 Degree Info assistant</h1>
        <p className="hero-tagline">&ldquo;If you can think it, we can develop it.&rdquo;</p>
        <p className="hero-lead">
          Ask about websites, e-commerce, custom software, mobile apps, SEO, hosting,
          pricing and current offers. Sign in and it can also answer about your own
          projects, subscriptions and support tickets — never anyone else&rsquo;s.
        </p>

        <div className="hero-actions">
          <Link to="/chat" className="btn btn-lg">
            <Icon name="chat" size={16} /> Open the assistant
          </Link>
          {isAuthenticated ? (
            <Link to="/account" className="btn btn-ghost btn-lg">
              {user?.name ? `${user.name.split(' ')[0]}’s account` : 'Your account'}
            </Link>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-lg">
              Sign in
            </Link>
          )}
        </div>
      </section>

      <div className="feature-grid stagger">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>
            <span className="feature-ico">
              <Icon name={f.icon} size={18} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>

      <section className="card card-muted" style={{ marginTop: 22 }}>
        <h2 className="card-title">How it works</h2>
        <ul className="bullet-list">
          <li>Visitors get public information about our services and can leave an enquiry.</li>
          <li>Signed-in clients also get answers from their own projects, hosting and tickets.</li>
          <li>Access is enforced by the backend before anything is retrieved — the assistant never decides who sees what.</li>
        </ul>
      </section>
    </div>
  );
}
