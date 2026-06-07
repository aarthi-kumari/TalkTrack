import "@livekit/components-styles";
import "@livekit/components-styles/prefabs";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}