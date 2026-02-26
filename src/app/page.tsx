"use client";

import { useEffect } from "react";
import {
  Navbar,
  Hero,
  LogoBar,
  Integrations,
  AIShowcase,
  ChannelProductFit,
  ReportsAlerts,
  Features,
  ExampleQuestions,
  HowItWorks,
  Comparison,
  Testimonials,
  CTA,
  FAQ,
  Footer,
  BackgroundEffects,
} from "@/components/landing";
import "@/components/landing/animations.css";

export default function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <BackgroundEffects />
      <Navbar />
      <Hero />
      <LogoBar />
      <Integrations />
      <AIShowcase />
      <ChannelProductFit />
      <ReportsAlerts />
      <Features />
      <ExampleQuestions />
      <HowItWorks />
      <Comparison />
      <Testimonials />
      <CTA />
      <FAQ />
      <Footer />
    </div>
  );
}
