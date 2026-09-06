// -----------------------------------------------------------------------------
// Icon.jsx
//
// A tiny inline-SVG icon set. No dependency. Stroke icons inherit currentColor.
//   <Icon name="send" />   <Icon name="arrow-right" size={14} />
// -----------------------------------------------------------------------------

const PATHS = {
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />,
  'arrow-right': <path d="M5 12h14M13 5l7 7-7 7" />,
  'arrow-left': <path d="M19 12H5M11 19l-7-7 7-7" />,
  spark: (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  user: <path d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />,
  code: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  cart: (
    <path d="M6 6h15l-1.5 9h-12L6 6ZM6 6 5 2H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 12a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7A2 2 0 0 1 22 16.9Z" />
  ),
  server: (
    <path d="M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01" />
  ),
  megaphone: <path d="m3 11 15-6v14L3 13v-2ZM3 11v4a2 2 0 0 0 2 2h1M11 6.5V17" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  eye: <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  'eye-off': (
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.16 3.19M6.6 6.6A18 18 0 0 0 2 12s3.5 8 10 8a9.3 9.3 0 0 0 5.4-1.6M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20" />
  ),
  mail: <path d="M4 4h16v16H4zM4 6l8 6 8-6" />,
  pin: <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
  whatsapp: (
    <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3ZM8.5 8c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4 0 .5l-.5.6c-.1.2-.3.3-.1.6.7 1.2 1.6 1.9 2.8 2.5.3.1.5.1.6-.1l.5-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.4 0 .5-.2 1.3-.6 1.5-.4.3-1.4.7-2.6.3a8 8 0 0 1-5.3-5.3c-.3-1 0-1.9.4-2.6Z" />
  ),
  facebook: <path d="M14 8h2V5h-2c-2 0-3 1.3-3 3.2V11H9v3h2v6h3v-6h2.2l.4-3H14V8.6c0-.4.2-.6.6-.6Z" />,
  linkedin: (
    <path d="M6.5 8A1.5 1.5 0 1 0 6.5 5a1.5 1.5 0 0 0 0 3ZM5 10h3v10H5zM10 10h3v1.5c.5-1 1.6-1.8 3-1.8 2.3 0 3 1.6 3 4V20h-3v-5c0-1.2-.4-2-1.5-2S13 13.9 13 15v5h-3z" />
  ),
  instagram: (
    <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM17.5 6.5h.01" />
  ),
  youtube: (
    <path d="M22 12s0-3-.4-4.4a2.6 2.6 0 0 0-1.8-1.8C18.4 5.4 12 5.4 12 5.4s-6.4 0-7.8.4A2.6 2.6 0 0 0 2.4 7.6C2 9 2 12 2 12s0 3 .4 4.4a2.6 2.6 0 0 0 1.8 1.8c1.4.4 7.8.4 7.8.4s6.4 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8C22 15 22 12 22 12ZM10 9.2l5 2.8-5 2.8z" />
  ),
};

export default function Icon({ name, size = 16, strokeWidth = 1.8, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || null}
    </svg>
  );
}
