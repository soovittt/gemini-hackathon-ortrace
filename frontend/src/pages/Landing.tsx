import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import OutcomesSection from "@/components/landing/OutcomesSection";
import CTASection from "@/components/landing/CTASection";

const Landing = () => {
  return (
    <div className="flex flex-col">
      <Header variant="landing" />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <OutcomesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
