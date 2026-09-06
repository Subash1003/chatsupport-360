// -----------------------------------------------------------------------------
// BrandMark.jsx
//
// The round 360 Degree Info badge. Used as the assistant's identity in the chat
// header, the message avatars, the empty state, and the auth cards.
// Size: 'sm' | 'md' | 'lg'.
// -----------------------------------------------------------------------------

import logoRound from '../assets/logo-round.png';

export default function BrandMark({ size = 'sm' }) {
  return (
    <span className={`brandmark brandmark--${size}`} aria-hidden="true">
      <img src={logoRound} alt="" />
    </span>
  );
}
