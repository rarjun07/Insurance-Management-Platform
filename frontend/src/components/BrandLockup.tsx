type BrandLockupProps = {
  inverse?: boolean;
  compact?: boolean;
};

export function BrandLockup({ inverse = false, compact = false }: BrandLockupProps) {
  return (
    <span
      className={`brand-lockup${inverse ? " inverse" : ""}${compact ? " compact" : ""}`}
      aria-label="HealthInsure Management"
    >
      <span className="brand-lockup-name" aria-hidden="true">
        <span className="brand-lockup-health">Health</span>
        <span className="brand-lockup-insure">Insure</span>
      </span>
      <span className="brand-lockup-management" aria-hidden="true">
        <span className="brand-lockup-line" />
        <span>Management</span>
        <span className="brand-lockup-line" />
      </span>
    </span>
  );
}
