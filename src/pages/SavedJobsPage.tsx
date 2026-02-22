import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, MapPin, DollarSign, Building2, Sparkles, ArrowLeft, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getSavedJobs, toggleSavedJob, type Job } from "@/lib/db";

const SavedJobsPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    getSavedJobs(user.uid).then(setJobs).finally(() => setLoading(false));
  }, [user]);

  const handleRemove = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!user) return;
    toggleSavedJob(user.uid, jobId).then(() => setJobs((prev) => prev.filter((j) => j.id !== jobId)));
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
              <Bookmark size={18} className="text-primary" /> Saved Jobs
            </h1>
            <p className="text-sm text-muted-foreground">{jobs.length} jobs saved</p>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground col-span-full">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-muted-foreground col-span-full">No saved jobs.</p>
        ) : (
          jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-5 hover-lift cursor-pointer"
              onClick={() => navigate(`/job/${job.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {job.company.slice(0, 2).toUpperCase()}
                </div>
                <button
                  onClick={(e) => handleRemove(e, job.id)}
                  className="text-destructive/60 hover:text-destructive transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm">{job.title}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Building2 size={12} /> {job.company}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> {job.location}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><DollarSign size={11} /> {job.salary}</span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <Badge variant="secondary" className="text-xs rounded-lg">{job.type}</Badge>
                <span className="flex items-center gap-1 text-xs font-semibold text-success"><Sparkles size={12} /> Match</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default SavedJobsPage;
