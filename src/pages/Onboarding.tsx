import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, Brain, Users, ArrowRight, ChevronRight } from "lucide-react";

const slides = [
  {
    icon: Briefcase,
    title: "Find Jobs Faster",
    description: "Discover thousands of opportunities matched to your skills with our intelligent job matching engine.",
    accent: "from-primary to-primary/70",
    bg: "hsl(234 85% 45%)",
  },
  {
    icon: Brain,
    title: "Smart AI Career Tools",
    description: "AI-powered resume scoring, skill gap analysis, and interview prep to boost your career trajectory.",
    accent: "from-accent to-accent/70",
    bg: "hsl(174 72% 44%)",
  },
  {
    icon: Users,
    title: "Hire Smarter",
    description: "Post jobs, screen candidates with AI ranking, and build your dream team effortlessly.",
    accent: "from-primary to-accent",
    bg: "hsl(255 80% 55%)",
  },
];

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else navigate("/auth");
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-4 safe-top">
        <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-muted-foreground">
          Skip
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center max-w-md"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-32 h-32 rounded-[2rem] flex items-center justify-center mb-8 relative"
              style={{ background: slides[current].bg }}
            >
              {(() => { const Icon = slides[current].icon; return <Icon className="w-16 h-16 text-primary-foreground" strokeWidth={1.5} />; })()}
              <motion.div
                className="absolute inset-0 rounded-[2rem]"
                style={{ background: slides[current].bg }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-display font-bold text-foreground mb-4"
            >
              {slides[current].title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-lg leading-relaxed"
            >
              {slides[current].description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom */}
      <div className="p-6 pb-8 safe-bottom flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              className="h-2 rounded-full"
              animate={{
                width: i === current ? 32 : 8,
                backgroundColor: i === current ? "hsl(234 85% 45%)" : "hsl(220 16% 85%)",
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Button */}
        <Button variant="hero" size="xl" onClick={next} className="w-full max-w-sm">
          {current === slides.length - 1 ? "Get Started" : "Continue"}
          {current === slides.length - 1 ? <ArrowRight className="ml-1" /> : <ChevronRight className="ml-1" />}
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
