import MarketingNav from '@/components/marketing/MarketingNav';
import Hero from '@/components/marketing/Hero';
import ProblemSection from '@/components/marketing/ProblemSection';
import PipelineSection from '@/components/marketing/PipelineSection';
import PlatformSection from '@/components/marketing/PlatformSection';
import TechStackStrip from '@/components/marketing/TechStackStrip';
import ImpactSection from '@/components/marketing/ImpactSection';
import CTAFooter from '@/components/marketing/CTAFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#12141A]">
      <MarketingNav />
      <main>
        <Hero />
        <ProblemSection />
        <PipelineSection />
        <PlatformSection />
        <TechStackStrip />
        <ImpactSection />
        <CTAFooter />
      </main>
    </div>
  );
}
