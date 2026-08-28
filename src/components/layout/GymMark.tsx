import { gymInitials } from '../../lib/branding';

interface GymMarkProps {
  nombre: string;
  logo: string | null;
  /** Rendered size in px — the mark is always square. */
  size?: number;
  rounded?: string;
}

// One place that knows how a gym is represented visually, so the logo-or-initials fallback
// stays identical in the top bar, the gym list and the gym editor.
export default function GymMark({ nombre, logo, size = 34, rounded = 'rounded-[9px]' }: GymMarkProps) {
  const style = { width: size, height: size };

  if (logo) {
    return (
      <img
        src={logo}
        alt={nombre}
        style={style}
        className={`${rounded} object-contain bg-white shrink-0`}
      />
    );
  }

  return (
    <div
      style={{ ...style, fontSize: Math.max(11, Math.round(size * 0.38)) }}
      className={`${rounded} bg-stone-200 text-stone-600 font-extrabold flex items-center justify-center shrink-0`}
      aria-label={nombre}
    >
      {gymInitials(nombre)}
    </div>
  );
}
