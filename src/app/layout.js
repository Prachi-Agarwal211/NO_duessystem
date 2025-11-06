import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-poppins" });

export const metadata = {
  title: "JECRC No Dues",
  description: "Modern no-dues clearance system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased bg-[#0a0a0a]`}>{children}</body>
    </html>
  );
}
