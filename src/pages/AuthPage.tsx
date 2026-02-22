import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Eye, EyeOff, User, Briefcase, X, Plus, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, profile, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role === "admin") navigate("/admin", { replace: true });
    else if (profile.role === "employer") navigate("/employer", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [user, profile, navigate]);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"user" | "employer" | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      toast.success("Signed in successfully.");
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (step === 1) {
      if (!displayName.trim() || !email.trim()) {
        toast.error("Please fill name and email.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!password || password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (!role) {
        toast.error("Please select Job Seeker or Employer.");
        return;
      }
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, {
        displayName: displayName.trim(),
        phone: phone.trim() || undefined,
        role,
        jobTitle: jobTitle.trim() || undefined,
        experienceLevel: experienceLevel || undefined,
        skills,
      });
      toast.success("Account created.");
      if (role === "employer") navigate("/employer");
      else navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full opacity-10"
            style={{ background: "hsl(234 85% 55%)", filter: "blur(120px)", top: "20%", left: "20%" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>
        <div className="relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="w-20 h-20 rounded-2xl gradient-primary mx-auto flex items-center justify-center shadow-glow mb-6">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L36 10V22C36 31.94 30.84 41.18 24 44C17.16 41.18 12 31.94 12 22V10L24 4Z" fill="white" fillOpacity="0.9"/>
                <path d="M20 24L23 27L28 20" stroke="hsl(234, 85%, 45%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-4xl font-display font-bold text-primary-foreground mb-3">Welcome to JobVerse</h1>
            <p className="text-primary-foreground/60 text-lg max-w-sm mx-auto">Your AI-powered career ecosystem for finding, posting, and managing jobs intelligently.</p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-xl gradient-primary mx-auto flex items-center justify-center shadow-glow mb-3">
              <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L36 10V22C36 31.94 30.84 41.18 24 44C17.16 41.18 12 31.94 12 22V10L24 4Z" fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <h2 className="text-xl font-display font-bold text-foreground">JobVerse</h2>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">Welcome back</h2>
                  <p className="text-muted-foreground mt-1">Sign in to your account</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      placeholder="you@example.com"
                      className="mt-1.5 h-12 rounded-xl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-12 rounded-xl pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                <Button variant="hero" size="lg" className="w-full" onClick={handleLogin} disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"} <ArrowRight className="ml-1" />
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <button type="button" className="text-primary font-semibold hover:underline" onClick={() => setIsLogin(false)}>Sign up</button>
                </p>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  <button type="button" onClick={() => navigate("/admin-login")} className="text-muted-foreground hover:underline">Admin? Login here</button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={`signup-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex-1 h-1.5 rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: s <= step ? "100%" : "0%" }}
                        transition={{ duration: 0.3 }}
                        style={{ backgroundColor: "hsl(234 85% 45%)" }}
                      />
                    </div>
                  ))}
                </div>

                {step === 1 && (
                  <>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-foreground">Create your account</h2>
                      <p className="text-muted-foreground mt-1">Step 1 — Basic Information</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Full Name</Label>
                        <Input placeholder="John Doe" className="mt-1.5 h-12 rounded-xl" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input placeholder="you@example.com" className="mt-1.5 h-12 rounded-xl" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div>
                        <Label>Phone Number</Label>
                        <Input placeholder="+91 99999 99999" className="mt-1.5 h-12 rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div>
                        <Label>I am a</Label>
                        <div className="grid grid-cols-2 gap-3 mt-1.5">
                          {[
                            { key: "user" as const, icon: User, label: "Job Seeker" },
                            { key: "employer" as const, icon: Briefcase, label: "Employer" },
                          ].map((r) => (
                            <motion.button
                              key={r.key}
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setRole(r.key)}
                              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                                role === r.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                              }`}
                            >
                              <r.icon size={24} className={role === r.key ? "text-primary" : "text-muted-foreground"} />
                              <span className={`text-sm font-medium ${role === r.key ? "text-primary" : "text-foreground"}`}>{r.label}</span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button variant="hero" size="lg" className="w-full" onClick={() => setStep(2)}>
                      Continue <ArrowRight className="ml-1" />
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-foreground">Professional Info</h2>
                      <p className="text-muted-foreground mt-1">Step 2 — Tell us about your experience</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Current Job Title</Label>
                        <Input placeholder="Software Engineer" className="mt-1.5 h-12 rounded-xl" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                      </div>
                      <div>
                        <Label>Experience Level</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1.5">
                          {["Entry", "Mid", "Senior"].map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setExperienceLevel(level)}
                              className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                experienceLevel === level ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Skills</Label>
                        <div className="flex gap-2 mt-1.5">
                          <Input
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                            placeholder="Add a skill"
                            className="h-12 rounded-xl flex-1"
                          />
                          <Button type="button" variant="outline" size="icon" onClick={addSkill} className="h-12 w-12 rounded-xl">
                            <Plus size={18} />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {skills.map((s) => (
                            <Badge key={s} variant="secondary" className="px-3 py-1.5 rounded-lg gap-1.5">
                              {s}
                              <X size={12} className="cursor-pointer" onClick={() => setSkills(skills.filter((sk) => sk !== s))} />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">
                        <ArrowLeft className="mr-1" /> Back
                      </Button>
                      <Button variant="hero" size="lg" onClick={() => setStep(3)} className="flex-1">
                        Continue <ArrowRight className="ml-1" />
                      </Button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-foreground">Secure your account</h2>
                      <p className="text-muted-foreground mt-1">Step 3 — Set your password</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Password</Label>
                        <div className="relative mt-1.5">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-12 rounded-xl pr-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label>Confirm Password</Label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="mt-1.5 h-12 rounded-xl"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" size="lg" onClick={() => setStep(2)} className="flex-1">
                        <ArrowLeft className="mr-1" /> Back
                      </Button>
                      <Button variant="hero" size="lg" onClick={handleSignUp} disabled={loading} className="flex-1">
                        {loading ? "Creating..." : "Create Account"} <Check className="ml-1" />
                      </Button>
                    </div>
                  </>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" className="text-primary font-semibold hover:underline" onClick={() => setIsLogin(true)}>Sign in</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
