import type { Metadata } from "next";
import Image from "next/image";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "VLAH Consultant Hub",
    template: "%s | VLAH Consultant Hub",
  },
  description:
    "Dark premium consultant operations workspace inspired by the VLAH enterprise app brand system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" className={inter.variable}>
      <body>
        <div className="app-watermark" aria-hidden="true">
          <Image
            src="/branding/vlah-enterprise-dark.svg"
            alt=""
            fill
            sizes="(max-width: 768px) 420px, 620px"
          />
        </div>
        <div className="app-powered">Powered by VLAH ENTERPRISE</div>
        <div className="app-language" aria-hidden="true">
          <span>SR</span>
          <span className="text-white/45">Workspace</span>
        </div>
        <div className="app-layer">{children}</div>
      </body>
    </html>
  );
}
