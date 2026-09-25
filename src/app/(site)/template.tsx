export default function SiteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-transition">{children}</div>;
}
