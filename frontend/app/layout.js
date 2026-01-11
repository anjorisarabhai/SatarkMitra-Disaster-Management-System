import "./Styles/main.css";
import "leaflet/dist/leaflet.css";
import "./global.css"


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
      </head>

      {/* ✅ children MUST be inside return */}
      <body style={{ background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",color: "#0f172a",minHeight: "100vh"}}>
        <h1>LAYOUT IS WORKING</h1>
        {children}
      </body>
    </html>
  );
}
