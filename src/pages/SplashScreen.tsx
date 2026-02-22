import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const SplashScreen = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (loading) return;
    const timer1 = setTimeout(() => setFadeOut(true), 800);
    const timer2 = setTimeout(() => {
      if (user && profile) {
        if (profile.role === "admin") navigate("/admin");
        else if (profile.role === "employer") navigate("/employer");
        else navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    }, 1400);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [navigate, user, profile, loading]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center gradient-hero"
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-72 h-72 rounded-full opacity-20"
          style={{ background: "hsl(234 85% 55%)", filter: "blur(80px)", top: "15%", left: "10%" }}
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-96 h-96 rounded-full opacity-15"
          style={{ background: "hsl(174 72% 44%)", filter: "blur(100px)", bottom: "10%", right: "5%" }}
          animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-glow">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4L36 10V22C36 31.94 30.84 41.18 24 44C17.16 41.18 12 31.94 12 22V10L24 4Z" fill="white" fillOpacity="0.9"/>
              <path d="M20 24L23 27L28 20" stroke="hsl(234, 85%, 45%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <motion.div
            className="absolute inset-0 rounded-3xl"
            animate={{ boxShadow: ["0 0 0 0 hsl(234 85% 55% / 0.4)", "0 0 0 20px hsl(234 85% 55% / 0)", "0 0 0 0 hsl(234 85% 55% / 0)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-display font-bold text-primary-foreground tracking-tight">
            JobVerse
          </h1>
          <p className="text-sm text-primary-foreground/60 mt-1 font-medium tracking-widest uppercase">
            AI-Powered Career Ecosystem
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-1.5 mt-4"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary-foreground/40"
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
