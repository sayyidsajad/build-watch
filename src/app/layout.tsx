import type { Metadata } from "next";
import "@/index.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "BuildWatch",
  description: "Deployment analytics for Jenkins and GitHub Actions",
  openGraph: {
    title: "BuildWatch",
    description: "Deployment analytics for Jenkins and GitHub Actions",
    type: "website",
    images: ["https://buildwatch.dev/opengraph-image-p98pqg.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@BuildWatch",
    images: ["https://buildwatch.dev/opengraph-image-p98pqg.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
