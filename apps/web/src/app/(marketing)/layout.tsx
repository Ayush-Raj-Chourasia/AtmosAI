import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weather Nexus — National Weather Big Data Analytics Platform | Team AtmosAI",
  description:
    "One verified national weather signal, fused from IMD bulletins, weather APIs, news, social media, and citizen reports by Team AtmosAI.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
