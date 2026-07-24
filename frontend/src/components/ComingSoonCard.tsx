type ComingSoonCardProps = {
  title: string;
  status: string;
  active?: boolean;
};

export function ComingSoonCard({ title, status, active = false }: ComingSoonCardProps) {
  return (
    <article className={`policy-type-card ${active ? "enabled" : "disabled"}`}>
      <h3>{title}</h3>
      <span>{status}</span>
    </article>
  );
}
