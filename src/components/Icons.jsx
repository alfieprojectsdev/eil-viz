// Inline icons, so nothing is fetched at runtime. All draw in currentColor.
function Svg({ size = 24, strokeWidth = 2, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function LogoIcon(props) {
  return <Svg strokeWidth={1.8} {...props}><path d="M3 20h18" /><path d="M3 20l6-10 4 6 3-4 5 8" /><circle cx="9" cy="10" r="1.2" /></Svg>;
}

export function CheckCircleIcon(props) {
  return <Svg strokeWidth={2.2} {...props}><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></Svg>;
}

export function WarningIcon(props) {
  return <Svg strokeWidth={2.2} {...props}><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></Svg>;
}

export function StopIcon(props) {
  return <Svg strokeWidth={2.2} {...props}><polygon points="7.9 2 16.1 2 22 7.9 22 16.1 16.1 22 7.9 22 2 16.1 2 7.9" /><path d="M15 9l-6 6M9 9l6 6" /></Svg>;
}

export function TickIcon(props) {
  return <Svg strokeWidth={2.6} {...props}><path d="M20 6L9 17l-5-5" /></Svg>;
}

export function ExclaimIcon(props) {
  return <Svg strokeWidth={2.6} {...props}><path d="M12 6v8M12 18h.01" /></Svg>;
}

export function CrossIcon(props) {
  return <Svg strokeWidth={2.6} {...props}><path d="M18 6L6 18M6 6l12 12" /></Svg>;
}

export function PrintIcon(props) {
  return <Svg strokeWidth={1.8} {...props}><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></Svg>;
}
