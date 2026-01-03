export const metadata = {
  title: "SatarkMitra",
  description: "Disaster Management Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
