import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getApplicationsByUser, withdrawApplication } from "@/lib/db";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  applied: { label: "Applied", color: "bg-primary/10 text-primary", icon: Clock },
  shortlisted: { label: "Shortlisted", color: "bg-success/10 text-success", icon: CheckCircle },
  interview: { label: "Interview", color: "bg-accent/10 text-accent", icon: MessageSquare },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const ApplicationsPage = () => {
  const [filter, setFilter] = useState("all");
  const [applications, setApplications] = useState<Awaited<ReturnType<typeof getApplicationsByUser>>>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    getApplicationsByUser(user.uid).then(setApplications).finally(() => setLoading(false));
  }, [user]);

  const filters = ["all", "applied", "shortlisted", "interview", "rejected"];
  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  const handleWithdraw = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    try {
      await withdrawApplication(appId);
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      toast.success("Application withdrawn.");
    } catch {
      toast.error("Failed to withdraw.");
    }
  };

  const formatDate = (createdAt: unknown) => {
    if (!createdAt || typeof (createdAt as { toMillis?: () => number }).toMillis !== "function") return "";
    const ms = (createdAt as { toMillis: () => number }).toMillis();
    const d = Date.now() - ms;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
    return `${Math.floor(d / 86400000)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:ml-64">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="lg:hidden w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Applications</h1>
            <p className="text-sm text-muted-foreground">{applications.length} total applications</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                filter === f ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No applications yet.</p>
        ) : (
          filtered.map((app, i) => {
            const config = statusConfig[app.status] ?? statusConfig.applied;
            const StatusIcon = config.icon;
            const job = app.job;
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 hover-lift cursor-pointer flex items-center gap-4"
                onClick={() => job && navigate(`/job/${job.id}`)}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {job ? job.company.slice(0, 2).toUpperCase() : "—"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{job?.title ?? "Job"}</h3>
                  <p className="text-xs text-muted-foreground">{job?.company ?? ""} · {formatDate(app.createdAt)}</p>
                </div>
                <Badge className={`${config.color} border-0 rounded-lg text-xs gap-1 shrink-0`}>
                  <StatusIcon size={12} /> {config.label}
                </Badge>
                <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={(e) => handleWithdraw(e, app.id)}>Withdraw</Button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;
