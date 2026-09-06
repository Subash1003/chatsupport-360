// -----------------------------------------------------------------------------
// FloatingContact.jsx
//
// Sticky WhatsApp + call buttons in the bottom-right corner — the same pattern
// as 360degreeinfo.com. Numbers are 360 Degree Info's public contact details.
// -----------------------------------------------------------------------------

import Icon from './Icon.jsx';

const WHATSAPP = '919941186071'; // +91 99411 86071
const PHONE = '+914442132523'; // +91 44 42132523

export default function FloatingContact() {
  return (
    <div className="floating-contact">
      <a
        className="fc-wa"
        href={`https://wa.me/${WHATSAPP}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="WhatsApp"
      >
        <Icon name="whatsapp" size={22} />
      </a>
      <a className="fc-call" href={`tel:${PHONE}`} aria-label="Call us" title="Call">
        <Icon name="phone" size={19} />
      </a>
    </div>
  );
}
