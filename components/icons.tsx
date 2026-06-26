type IconProps = {
  className?: string;
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3.8 10.6 12 4l8.2 6.6v8.3a1.6 1.6 0 0 1-1.6 1.6h-4.1v-5.6h-5v5.6H5.4a1.6 1.6 0 0 1-1.6-1.6z" fill="currentColor" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M10.8 4.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8m0 2a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8" fill="currentColor" />
      <path d="m15.8 15.7 4 4a1.1 1.1 0 0 1-1.6 1.6l-4-4z" fill="currentColor" />
    </svg>
  );
}

export function PenIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 16.8 15.9 5.9l2.2 2.2L7.2 19H5z" fill="currentColor" />
      <path d="M17.2 4.6a1.6 1.6 0 0 1 2.2 0 1.6 1.6 0 0 1 0 2.2l-.5.5-2.2-2.2z" fill="currentColor" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 12.1a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8" fill="currentColor" />
      <path d="M4.5 20.3c.6-4 3.4-6.2 7.5-6.2s6.9 2.2 7.5 6.2z" fill="currentColor" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3.2c-3.1 0-5.2 2.4-5.2 5.7v3.3l-1.6 3v1.1h13.6v-1.1l-1.6-3V8.9c0-3.3-2.1-5.7-5.2-5.7" fill="currentColor" />
      <path d="M9.4 17.5h5.2a2.6 2.6 0 0 1-5.2 0" fill="currentColor" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M14.8 5.4 8.2 12l6.6 6.6-1.7 1.7L4.8 12l8.3-8.3z" fill="currentColor" />
    </svg>
  );
}
