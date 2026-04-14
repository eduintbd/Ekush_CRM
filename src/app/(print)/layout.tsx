export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Ekush WML - Purchase Form</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#f0f0f0" }}>
        {children}
      </body>
    </html>
  );
}
