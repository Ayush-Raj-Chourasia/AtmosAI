import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AtmosAI — Autonomous Meteorological & Extreme Weather Intelligence Platform",
  description:
    "One verified national weather signal, fused from IMD bulletins, Doppler radar, satellite telemetry, news, and ground observer reports.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
