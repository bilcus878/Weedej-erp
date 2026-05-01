import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErpNavbar } from "@/components/erp/navbar/ErpNavbar";
import { Providers } from "@/components/providers/Providers";
import { NavbarMetaProvider } from "@/components/erp/navbar/NavbarMetaContext";

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weedej - ERP",
  description: "Weedej ERP systém s integrací SumUp API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className={inter.className}>
        <Providers>
          <NavbarMetaProvider>
            <ErpNavbar />
            <main className="bg-gray-50 min-h-screen pt-[57px] p-8 min-w-0 overflow-x-auto">
              {children}
            </main>
          </NavbarMetaProvider>
        </Providers>
      </body>
    </html>
  );
}
