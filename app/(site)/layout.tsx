export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <div className="page-container">
        {children}
      </div>
    </div>
  );
}
