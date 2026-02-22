import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bookmark, MapPin, DollarSign, Clock, Building2, Users, Star, Share2, CheckCircle, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  getJob,
  getSavedJobIds,
  toggleSavedJob,
  getApplicationByUserAndJob,
  createApplication,
  recordExternalClick,
  incrementJobView,
  type Job,
  type FormFieldSchema,
} from "@/lib/db";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const jobTypeLabel = (job: Job) => (job.jobType === "external" ? "External" : "Internal");

const JobDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("description");
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getJob(id).then((j) => {
      setJob(j ?? null);
      setLoading(false);
      if (j) incrementJobView(id);
    });
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    getSavedJobIds(user.uid).then((ids) => setSaved(ids.includes(id)));
    getApplicationByUserAndJob(user.uid, id).then((app) => setApplied(!!app));
  }, [user, id]);

  const handleToggleSaved = () => {
    if (!user) return;
    toggleSavedJob(user.uid, id!).then((nowSaved) => setSaved(nowSaved));
  };

  const handleApplyClick = () => {
    if (!user || !profile || !job) return;
    const jobType = job.jobType ?? "internal";
    if (jobType === "external") {
      recordExternalClick(job.id, user.uid).then(() => {
        if (job.externalLink) window.open(job.externalLink, "_blank");
        toast.success("Redirecting to application link.");
      });
      setApplied(true);
      return;
    }
    if (job.formSchema && job.formSchema.length > 0) {
      setFormValues({});
      setApplyModalOpen(true);
    } else {
      submitInternalApplication({});
    }
  };

  const submitInternalApplication = async (responses: Record<string, unknown>) => {
    if (!user || !profile || !job) return;
    setSubmitLoading(true);
    try {
      await createApplication({
        jobId: job.id,
        userId: user.uid,
        userName: profile.displayName,
        userEmail: profile.email,
        userPhone: profile.phone,
        resumeUrl: profile.resumeUrl,
        formResponses: Object.keys(responses).length ? responses : undefined,
      });
      setApplied(true);
      setApplyModalOpen(false);
      toast.success("Application submitted.");
    } catch {
      toast.error("Failed to submit application.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!job?.formSchema) return submitInternalApplication({});
    const responses: Record<string, unknown> = {};
    let valid = true;
    for (const f of job.formSchema) {
      const v = formValues[f.id]?.trim();
      if (f.required && !v) valid = false;
      responses[f.id] = v ?? "";
    }
    if (!valid) {
      toast.error("Please fill all required fields.");
      return;
    }
    submitInternalApplication(responses);
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const posted =
    job.createdAt && typeof (job.createdAt as { toMillis?: () => number }).toMillis === "function"
      ? formatPosted((job.createdAt as { toMillis: () => number }).toMillis())
      : "Recently";
  const logo = job.company.slice(0, 2).toUpperCase();
  const isExternal = (job.jobType ?? "internal") === "external";

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="gradient-hero px-4 sm:px-6 pt-4 pb-8 safe-top">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center text-primary-foreground"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center text-primary-foreground">
                <Share2 size={18} />
              </button>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={handleToggleSaved}
                className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center text-primary-foreground"
              >
                <Bookmark size={18} className={saved ? "fill-current" : ""} />
              </motion.button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary-foreground flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {logo}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-primary-foreground">
                {job.title}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 text-primary-foreground/70 text-sm">
                <Building2 size={14} /> {job.company}
                <span className="w-1 h-1 rounded-full bg-primary-foreground/40" />
                <MapPin size={14} /> {job.location}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 rounded-lg text-xs">
                  {job.type}
                </Badge>
                <Badge className="bg-success/20 text-success border-0 rounded-lg text-xs">
                  {jobTypeLabel(job)}
                </Badge>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: DollarSign, label: "Salary", value: job.salary },
              { icon: Clock, label: "Posted", value: posted },
              { icon: Users, label: "Applicants", value: String(job.applicantsCount ?? 0) },
            ].map((info) => (
              <div
                key={info.label}
                className="bg-primary-foreground/10 rounded-xl p-3 text-center"
              >
                <info.icon size={16} className="text-primary-foreground/70 mx-auto mb-1" />
                <p className="text-[10px] text-primary-foreground/50 uppercase tracking-wide">
                  {info.label}
                </p>
                <p className="text-sm font-semibold text-primary-foreground">{info.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4">
        <div className="glass-card-elevated p-1 flex gap-1 rounded-2xl">
          {["description", "requirements", "company"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          {activeTab === "description" && (
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>{job.description}</p>
              <h3 className="font-display font-semibold text-foreground text-base">
                Responsibilities
              </h3>
              <ul className="space-y-2">
                {job.requirements?.slice(0, 5).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-success mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === "requirements" && (
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <h3 className="font-display font-semibold text-foreground text-base">
                Skills Required
              </h3>
              <div className="flex flex-wrap gap-2">
                {(job.requirements ?? []).map((s) => (
                  <Badge key={s} variant="secondary" className="rounded-lg px-3 py-1.5">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {activeTab === "company" && (
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                  {logo}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{job.company}</h3>
                  <div className="flex items-center gap-1 text-xs">
                    <Star size={12} className="text-warning fill-warning" /> Company
                  </div>
                </div>
              </div>
              <p>{job.description}</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border p-4 safe-bottom lg:ml-64">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button variant="outline" size="lg" className="flex-1">
            Message
          </Button>
          <Button
            variant="hero"
            size="lg"
            className="flex-[2]"
            onClick={handleApplyClick}
            disabled={applied}
          >
            {applied ? "Applied" : isExternal ? "Apply (External Link)" : "Apply Now"}
            {isExternal && !applied && <ExternalLink size={16} className="ml-1" />}
          </Button>
        </div>
      </div>

      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application form — {job.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {(job.formSchema ?? []).map((field: FormFieldSchema) => (
              <div key={field.id}>
                <Label>
                  {field.label}
                  {field.required && " *"}
                </Label>
                {field.type === "textarea" ? (
                  <textarea
                    className="mt-1.5 w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    value={formValues[field.id] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                  />
                ) : field.type === "select" ? (
                  <select
                    className="mt-1.5 w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                    value={formValues[field.id] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                  >
                    <option value="">Select</option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
                    className="mt-1.5"
                    value={formValues[field.id] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={submitLoading}>
              {submitLoading ? "Submitting..." : "Submit application"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function formatPosted(ms: number): string {
  const d = Date.now() - ms;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

export default JobDetails;
