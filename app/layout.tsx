import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "BASESCREENER",
  description: "Aggressive analytics for BASE & ETH traders",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-[#020617] text-white">
        <Navbar />        {/* Navbar sa lahat ng pages */}
        <main className="flex-grow">{children}</main>  {/* Page content */}
      </body>
    </html>
  );
}