import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Brain, MessageSquare, DollarSign, TrendingUp, Target, Sparkles, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getResumeScoreFeedback, getSkillGapAnalysis, chatWithAI, getJobRecommendations } from "@/lib/openrouter";

const tools = [
  { icon: FileText, title: "Resume Score", desc: "AI analysis of your resume strength", key: "resume", color: "from-primary to-primary/60" },
  { icon: Brain, title: "Skill Gap Analysis", desc: "Discover skills you need to learn", key: "skillgap", color: "from-accent to-accent/60" },
  { icon: MessageSquare, title: "Career Chat", desc: "Ask AI anything about your career", key: "chat", color: "from-primary to-accent" },
  { icon: DollarSign, title: "Salary Insights", desc: "Market salary data for your role", color: "from-warning to-warning/60" },
  { icon: TrendingUp, title: "Career Path", desc: "Personalized growth roadmap", color: "from-success to-success/60" },
  { icon: Target, title: "Job Recommendations", desc: "AI suggests roles that match your profile", key: "recommend", color: "from-primary to-primary/60" },
];

const AIToolsPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeResult, setResumeResult] = useState("");
  const [skillTarget, setSkillTarget] = useState("");
  const [skillResult, setSkillResult] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendPref, setRecommendPref] = useState("");
  const [recommendResult, setRecommendResult] = useState("");

  const handleResumeScore = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    setResumeResult("");
    try {
      const feedback = await getResumeScoreFeedback(resumeText);
      setResumeResult(feedback);
    } catch {
      setResumeResult("Failed to analyze. Check your API key in .env (VITE_OPENROUTER_API_KEY).");
    } finally {
      setLoading(false);
    }
  };

  const handleSkillGap = async () => {
    const skills = profile?.skills?.length ? profile.skills : ["Communication", "Problem solving"];
    setLoading(true);
    setSkillResult("");
    try {
      const analysis = await getSkillGapAnalysis(skills, skillTarget || "Software Engineer");
      setSkillResult(analysis);
    } catch {
      setSkillResult("Failed to analyze. Check your API key in .env (VITE_OPENROUTER_API_KEY).");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const messages = [...chatHistory, { role: "user" as const, content: userMsg }];
      const reply = await chatWithAI(messages);
      setChatHistory((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: reply }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: "Error. Check VITE_OPENROUTER_API_KEY in .env." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:ml-64">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="lg:hidden w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <Sparkles size={20} className="text-primary" /> AI Tools
            </h1>
            <p className="text-sm text-muted-foreground">Boost your career with AI</p>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-hero rounded-3xl p-6 mb-6 text-primary-foreground relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
          <Sparkles size={28} className="mb-3 relative z-10" />
          <h2 className="text-xl font-display font-bold relative z-10">Your AI Career Score</h2>
          <p className="text-sm opacity-70 mt-1 relative z-10">Based on profile &amp; resume</p>
          <div className="flex items-end gap-2 mt-4 relative z-10">
            <span className="text-5xl font-display font-bold">—</span>
            <span className="text-lg opacity-60 mb-1">/100</span>
          </div>
          <p className="text-sm opacity-70 relative z-10">Use Resume Score tool below to get feedback.</p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-5 hover-lift cursor-pointer group"
              onClick={() => setActiveTool(activeTool === (tool as { key?: string }).key ? null : (tool as { key?: string }).key ?? undefined)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-primary-foreground shrink-0`}>
                  <tool.icon size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{tool.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {activeTool === "resume" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 glass-card p-6 space-y-4">
            <h3 className="font-display font-semibold">Resume Score</h3>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-input bg-background px-4 py-3 text-sm"
              placeholder="Paste your resume or a short bio..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
            <Button onClick={handleResumeScore} disabled={loading}>Analyze</Button>
            {resumeResult && <div className="rounded-xl bg-muted/50 p-4 text-sm whitespace-pre-wrap">{resumeResult}</div>}
          </motion.div>
        )}

        {activeTool === "skillgap" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 glass-card p-6 space-y-4">
            <h3 className="font-display font-semibold">Skill Gap Analysis</h3>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
              placeholder="Target role (e.g. Software Engineer)"
              value={skillTarget}
              onChange={(e) => setSkillTarget(e.target.value)}
            />
            <Button onClick={handleSkillGap} disabled={loading}>Analyze</Button>
            {skillResult && <div className="rounded-xl bg-muted/50 p-4 text-sm whitespace-pre-wrap">{skillResult}</div>}
          </motion.div>
        )}

        {activeTool === "recommend" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 glass-card p-6 space-y-4">
            <h3 className="font-display font-semibold">Job Recommendations</h3>
            <input className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" placeholder="e.g. Prefer remote, tech roles" value={recommendPref} onChange={(e) => setRecommendPref(e.target.value)} />
            <Button onClick={async () => { setLoading(true); setRecommendResult(""); try { const r = await getJobRecommendations(profile?.skills ?? [], recommendPref); setRecommendResult(r); } catch { setRecommendResult("Error. Check API key."); } finally { setLoading(false); } }} disabled={loading}>Get recommendations</Button>
            {recommendResult && <div className="rounded-xl bg-muted/50 p-4 text-sm whitespace-pre-wrap">{recommendResult}</div>}
          </motion.div>
        )}

        {activeTool === "chat" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 glass-card p-6 space-y-4">
            <h3 className="font-display font-semibold">Career Chat</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {chatHistory.map((m, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted/50 mr-8"}`}>
                  {m.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm"
                placeholder="Ask about careers, jobs, skills..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
              />
              <Button onClick={handleChat} disabled={loading}>Send</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AIToolsPage;
