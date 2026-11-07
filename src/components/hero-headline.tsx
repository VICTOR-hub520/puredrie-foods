"use client";

import { useEffect, useState } from "react";

const slides = [
  { lead: "Dried fruit.", accent: "Done deliciously." },
  { lead: "Bright flavour.", accent: "Easy to love." },
  { lead: "Your favourites.", accent: "Packed with care." },
  { lead: "A little taste", accent: "of joy." },
];

export function HeroHeadline() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [paused, reducedMotion]);

  const slide = slides[activeSlide];

  return (
    <div className="hero-headline-wrap">
      <h1 className="hero-headline" aria-live="off">
        <span className="hero-headline-slide" key={activeSlide}>
          <span>{slide.lead}</span>
          <em>{slide.accent}</em>
        </span>
      </h1>
      <div className="hero-slide-controls" aria-label="Headline slideshow controls">
        <div className="hero-slide-dots">
          {slides.map((item, index) => (
            <button
              type="button"
              key={item.accent}
              className={`hero-slide-dot${index === activeSlide ? " hero-slide-dot-active" : ""}`}
              aria-label={`Show headline ${index + 1}: ${item.lead} ${item.accent}`}
              aria-pressed={index === activeSlide}
              onClick={() => setActiveSlide(index)}
            />
          ))}
        </div>
        <button
          type="button"
          className="hero-slide-toggle"
          aria-label={reducedMotion ? "Automatic slideshow disabled by reduced-motion preference" : paused ? "Play headline slideshow" : "Pause headline slideshow"}
          disabled={reducedMotion}
          onClick={() => setPaused((current) => !current)}
        >
          {reducedMotion ? "Paused" : paused ? "Play" : "Pause"}
        </button>
      </div>
    </div>
  );
}
