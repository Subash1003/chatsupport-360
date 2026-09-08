// The round 360 Degree Info badge — the assistant's identity in the chat header,
// message avatars, empty state and auth cards. size: 'sm' | 'md' | 'lg'.

import logoRound from '../assets/logo-round.png';

export default function BrandMark({ size = 'sm' }) {
  return (
    <span className={`brandmark brandmark--${size}`} aria-hidden="true">
      <img src={logoRound} alt="" />
    </span>
  );
}
