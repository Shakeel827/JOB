import { motion } from "framer-motion";
import { 
  Home, Bookmark, FileText, Brain, User, Search, Filter, MapPin, 
  Star, TrendingUp, ChevronRight, Briefcase, Building2, DollarSign, Clock, Sparkles, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getJobs, getSavedJobIds, toggleSavedJob, type Job } from "@/lib/db";

const categories = ["All", "IT & Tech", "Marketing", "Finance", "Design", "Healthcare", "Education"];

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Bookmark, label: "Saved", path: "/saved" },
  { icon: FileText, label: "Applications", path: "/applications" },
  { icon: Brain, label: "AI Tools", path: "/ai-tools" },
  { icon: User, label: "Profile", path: "/profile" },
];

const sidebarItemsList = (showAdmin: boolean): { icon: typeof Home; label: string; path: string }[] => [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Briefcase, label: "Jobs", path: "/dashboard" },
  { icon: Bookmark, label: "Saved", path: "/saved" },
  { icon: FileText, label: "Applications", path: "/applications" },
  { icon: Brain, label: "AI Tools", path: "/ai-tools" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: TrendingUp, label: "Insights", path: "/dashboard" },
  ...(showAdmin ? [{ icon: Shield, label: "Admin", path: "/admin" }] : []),
];

function jobLogo(company: string) {
  return company.slice(0, 2).toUpperCase();
}

const JobCard = ({ job, index, savedIds, onToggleSaved }: { job: Job; index: number; savedIds: string[]; onToggleSaved: (id: string) => void }) => {
  const saved = savedIds.includes(job.id);
  const navigate = useNavigate();

  const posted = job.createdAt && typeof (job.createdAt as { toMillis?: () => number }).toMillis === "function"
    ? formatPosted((job.createdAt as { toMillis: () => number }).toMillis())
    : "Recently";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass-card p-4 sm:p-5 hover-lift cursor-pointer group"
      onClick={() => navigate(`/job/${job.id}`)}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
          {jobLogo(job.company)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold text-foreground text-sm sm:text-base group-hover:text-primary transition-colors truncate">
                {job.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Building2 size={13} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs sm:text-sm truncate">{job.company}</span>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={(e) => { e.stopPropagation(); onToggleSaved(job.id); }}
              className="shrink-0"
            >
              <Bookmark size={18} className={saved ? "fill-primary text-primary" : "text-muted-foreground"} />
            </motion.button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={12} /> {job.location}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign size={12} /> {job.salary}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={12} /> {posted}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs rounded-lg px-2.5 py-1">{job.type}</Badge>
              <div className="flex items-center gap-1 text-xs font-semibold text-success">
                <Sparkles size={12} />
                {Math.min(95, 70 + Math.floor(Math.random() * 25))}% Match
              </div>
            </div>
            <Button variant="default" size="sm" className="hidden sm:flex text-xs h-8 rounded-lg">
              Apply <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function formatPosted(ms: number): string {
  const d = Date.now() - ms;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

const employmentTypes = ["All", "Full-time", "Part-time", "Remote", "Hybrid", "Contract"];

const SeekerDashboard = () => {
  const { user, profile, isAdmin } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeNav, setActiveNav] = useState("Home");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getJobs({
      category: activeCategory !== "All" ? activeCategory : undefined,
      location: locationFilter.trim() || undefined,
      employmentType: employmentFilter !== "All" ? employmentFilter : undefined,
    }).then(setJobs).finally(() => setLoading(false));
    getSavedJobIds(user.uid).then(setSavedIds);
  }, [user, activeCategory, locationFilter, employmentFilter]);

  const handleToggleSaved = (jobId: string) => {
    if (!user) return;
    toggleSavedJob(user.uid, jobId).then(() => {
      setSavedIds((prev) =>
        prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
      );
    });
  };

  const displayName = profile?.displayName?.split(" ")[0] ?? "User";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-sidebar border-r border-sidebar-border z-40">
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L36 10V22C36 31.94 30.84 41.18 24 44C17.16 41.18 12 31.94 12 22V10L24 4Z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <span className="font-display font-bold text-sidebar-foreground text-lg">JobVerse</span>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItemsList(isAdmin).map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                item.label === "Dashboard"
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4">
          <div className="gradient-accent rounded-2xl p-4 text-accent-foreground">
            <Sparkles size={20} className="mb-2" />
            <p className="text-sm font-semibold">Upgrade to Pro</p>
            <p className="text-xs opacity-80 mt-1">Unlock AI tools & priority listings</p>
            <Button variant="glass" size="sm" className="mt-3 w-full text-xs">
              Upgrade Now
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pb-24 lg:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl sm:text-2xl font-display font-bold text-foreground"
              >
                Good day, {displayName}! 👋
              </motion.h1>
              <p className="text-sm text-muted-foreground mt-0.5">Let's find your dream job today</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Star size={18} className="text-primary" />
              </div>
              <div className="w-10 h-10 rounded-xl overflow-hidden gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Profile completion */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 glass-card p-4 flex items-center gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Profile Completion</span>
                <span className="text-xs font-bold text-primary">72%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "72%" }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full gradient-primary"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs shrink-0">
              Complete
            </Button>
          </motion.div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search jobs, companies, skills..." className="h-12 rounded-xl pl-11 bg-card border-border" />
            </div>
            <Input placeholder="Location" className="h-12 rounded-xl sm:w-40" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
            <select className="h-12 rounded-xl border border-input bg-background px-3 text-sm" value={employmentFilter} onChange={(e) => setEmploymentFilter(e.target.value)}>
              {employmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "gradient-primary text-primary-foreground shadow-soft"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Recommended */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                AI Recommended
              </h2>
              <button className="text-sm text-primary font-medium hover:underline">See all</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <p className="text-muted-foreground col-span-full">Loading jobs...</p>
              ) : jobs.length === 0 ? (
                <p className="text-muted-foreground col-span-full">No jobs yet. Check back soon!</p>
              ) : (
                jobs.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} savedIds={savedIds} onToggleSaved={handleToggleSaved} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="nav-bottom lg:hidden flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => { setActiveNav(item.label); navigate(item.path); }}
            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
              activeNav === item.label ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SeekerDashboard;
