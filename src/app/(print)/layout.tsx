export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ margin: 0, padding: 0, background: "#f0f0f0", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
