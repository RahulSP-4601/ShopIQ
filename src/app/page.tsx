"use client";

import { useEffect } from "react";
import {
  Navbar,
  Hero,
  Features,
  HowItWorks,
  ExampleQuestions,
  CTA,
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
      <Features />
      <HowItWorks />
      <ExampleQuestions />
      <CTA />
      <Footer />
    </div>
  );
}
