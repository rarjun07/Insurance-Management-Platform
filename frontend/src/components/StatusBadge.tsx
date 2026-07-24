type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(" ", "-");
  return <span className={`status-badge ${normalizedStatus}`}>{status}</span>;
}
