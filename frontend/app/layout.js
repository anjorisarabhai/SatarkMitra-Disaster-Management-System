import "./global.css"; // Keep this for your root color variables and Tailwind
import "./Styles/main.css"; // Import your new structured styles
import "leaflet/dist/leaflet.css";


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* You need a <head> tag for fonts, etc. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      </head>
      <body>{children}</body>
    </html>
  );
}