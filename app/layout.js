import "./globals.css";

export const metadata = {
  title: "BG Remover",
  description: "Remove image backgrounds in seconds — everything runs in your browser, nothing is uploaded.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
