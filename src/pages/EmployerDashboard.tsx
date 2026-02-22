import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Briefcase, Users, Plus, FileText, MessageSquare, Star, Settings,
  Upload, Trash2, Menu, X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  getJobsByEmployer,
  createJob,
  seedInitialJobsIfEmpty,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  getApplicationsForJob,
  updateApplicationStatus,
  type Job,
  type Application,
  type FormFieldSchema,
} from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getJobDescriptionSuggestion } from "@/lib/openrouter";
import {
  downloadJobTemplate,
  parseJobExcel,
  findDuplicateRows,
  type BulkJobRow,
} from "@/lib/excel";

const sidebarItems = [
  { icon: BarChart3, label: "Dashboard" },
  { icon: Plus, label: "Post Job" },
  { icon: Briefcase, label: "Manage Jobs" },
  { icon: Users, label: "Applicants" },
  { icon: MessageSquare, label: "Messages" },
  { icon: Star, label: "Subscription" },
  { icon: Settings, label: "Settings" },
];

const FIELD_TYPES: { value: FormFieldSchema["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Paragraph" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "select", label: "Dropdown" },
];

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<(Application & { jobTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    salary: "",
    type: "Full-time",
    description: "",
    requirements: "",
    jobType: "internal" as "internal" | "external",
    externalLink: "",
    formSchema: [] as FormFieldSchema[],
  });
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkJobRow[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !profile) return;
    seedInitialJobsIfEmpty(user.uid, profile.displayName).then(() => {
      getJobsByEmployer(user.uid).then(setJobs).finally(() => setLoading(false));
    });
  }, [user, profile]);

  useEffect(() => {
    if (profile) setForm((f) => ({ ...f, company: profile.displayName ?? "" }));
  }, [profile]);

  useEffect(() => {
    if (activeSection !== "Applicants" || !user) return;
    const load = async () => {
      const list: (Application & { jobTitle?: string })[] = [];
      for (const job of jobs) {
        const apps = await getApplicationsForJob(job.id);
        apps.forEach((a) => list.push({ ...a, jobTitle: job.title }));
      }
      list.sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
      setApplications(list);
    };
    load();
  }, [activeSection, user, jobs]);

  const handlePostJob = async () => {
    if (!user || !profile || !form.title.trim()) {
      toast.error("Fill required fields.");
      return;
    }
    if (form.jobType === "external" && !form.externalLink.trim()) {
      toast.error("External link is required for external jobs.");
      return;
    }
    setPostLoading(true);
    try {
      await createJob({
        title: form.title.trim(),
        company: form.company.trim() || profile.displayName,
        location: form.location.trim(),
        salary: form.salary.trim(),
        type: form.type,
        description: form.description.trim(),
        requirements: form.requirements.split(",").map((s) => s.trim()).filter(Boolean),
        employerId: user.uid,
        employerName: profile.displayName,
        status: "active",
        jobType: form.jobType,
        externalLink: form.jobType === "external" ? form.externalLink.trim() : undefined,
        formSchema: form.jobType === "internal" && form.formSchema.length > 0 ? form.formSchema : undefined,
      });
      toast.success("Job posted.");
      setPostOpen(false);
      setForm({
        title: "",
        company: profile.displayName ?? "",
        location: "",
        salary: "",
        type: "Full-time",
        description: "",
        requirements: "",
        jobType: "internal",
        externalLink: "",
        formSchema: [],
      });
      getJobsByEmployer(user.uid).then(setJobs);
    } catch {
      toast.error("Failed to post job.");
    } finally {
      setPostLoading(false);
    }
  };

  const addFormField = () => {
    setForm((f) => ({
      ...f,
      formSchema: [
        ...f.formSchema,
        { id: `f_${Date.now()}`, label: "New field", type: "text", required: false },
      ],
    }));
  };

  const updateFormField = (index: number, upd: Partial<FormFieldSchema>) => {
    setForm((f) => ({
      ...f,
      formSchema: f.formSchema.map((field, i) => (i === index ? { ...field, ...upd } : field)),
    }));
  };

  const removeFormField = (index: number) => {
    setForm((f) => ({ ...f, formSchema: f.formSchema.filter((_, i) => i !== index) }));
  };

  const toggleJobStatus = async (job: Job) => {
    const next = job.status === "active" ? "paused" : "active";
    await updateJob(job.id, { status: next });
    if (user) getJobsByEmployer(user.uid).then(setJobs);
  };

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (selectedJobIds.size === 0) {
      toast.error("Select jobs to delete.");
      return;
    }
    try {
      await bulkDeleteJobs([...selectedJobIds]);
      toast.success(`Deleted ${selectedJobIds.size} job(s).`);
      setSelectedJobIds(new Set());
      if (user) getJobsByEmployer(user.uid).then(setJobs);
    } catch {
      toast.error("Failed to delete jobs.");
    }
  };

  const updateAppStatus = async (appId: string, status: Application["status"]) => {
    await updateApplicationStatus(appId, status);
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    toast.success("Status updated.");
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload an .xlsx or .xls file.");
      return;
    }
    const { rows, errors } = await parseJobExcel(file);
    setBulkRows(rows);
    setBulkErrors(errors);
    if (errors.length) toast.error(errors[0]);
    else if (rows.length) toast.success(`Parsed ${rows.length} job(s). Review and publish.`);
  };

  const handleBulkPublish = async () => {
    if (!user || !profile || bulkRows.length === 0) return;
    const duplicateIndices = findDuplicateRows(bulkRows);
    const toCreate = bulkRows.filter((_, i) => !duplicateIndices.has(i));
    if (toCreate.length === 0) {
      toast.error("No valid rows to publish (all duplicates or empty).");
      return;
    }
    setBulkPublishing(true);
    let created = 0;
    try {
      for (const row of toCreate) {
        if (!row.Title.trim()) continue;
        const jobType = (row["Job Type"] || "internal").toLowerCase() === "external" ? "external" : "internal";
        await createJob({
          title: row.Title.trim(),
          company: row.Company.trim() || profile.displayName,
          location: row.Location.trim(),
          salary: row.Salary.trim(),
          type: row.Type.trim() || "Full-time",
          description: row.Description.trim(),
          requirements: row.Skills.split(",").map((s) => s.trim()).filter(Boolean),
          employerId: user.uid,
          employerName: profile.displayName,
          status: "active",
          jobType,
          externalLink: jobType === "external" && row["External Link"] ? row["External Link"].trim() : undefined,
        });
        created++;
      }
      toast.success(`Published ${created} job(s).`);
      setBulkRows([]);
      setBulkErrors([]);
      getJobsByEmployer(user.uid).then(setJobs);
    } catch {
      toast.error("Failed to publish some jobs.");
    } finally {
      setBulkPublishing(false);
    }
  };

  const bulkDuplicateIndices = bulkRows.length ? findDuplicateRows(bulkRows) : new Set<number>();

  const SidebarContent = () => (
    <nav className="space-y-1">
      {sidebarItems.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            setActiveSection(item.label);
            setDrawerOpen(false);
            if (item.label === "Post Job") setPostOpen(true);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            activeSection === item.label
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }`}
        >
          <item.icon size={18} />
          {item.label}
        </button>
      ))}
    </nav>
  );

  const activeCount = jobs.filter((j) => j.status === "active").length;
  const totalApplicants = jobs.reduce((s, j) => s + (j.applicantsCount ?? 0), 0);
  const totalViews = jobs.reduce((s, j) => s + (j.viewCount ?? 0), 0);
  const conversionRate = totalViews > 0 ? ((totalApplicants / totalViews) * 100).toFixed(1) : "0";
  const employerStatus = (profile as { employerStatus?: string })?.employerStatus;
  const isApproved = employerStatus !== "pending" && employerStatus !== "rejected";

  return (
    <div className="min-h-screen bg-background">
      {profile?.role === "employer" && !isApproved && (
        <div className="bg-warning/15 border-b border-warning/30 px-4 py-3 text-center text-sm text-warning">
          Your employer account is {employerStatus === "rejected" ? "rejected" : "pending approval"}. You can post jobs after admin approval.
        </div>
      )}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-sidebar border-r border-sidebar-border z-40">
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
            <Briefcase size={20} className="text-accent-foreground" />
          </div>
          <div>
            <span className="font-display font-bold text-sidebar-foreground text-lg">JobVerse</span>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Employer</p>
          </div>
        </div>
        <div className="flex-1 px-3 py-4">
          <SidebarContent />
        </div>
      </aside>

      {drawerOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setDrawerOpen(false)} />
          <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar p-5">
            <div className="flex items-center justify-between mb-6">
              <span className="font-display font-bold text-sidebar-foreground text-lg">JobVerse</span>
              <button onClick={() => setDrawerOpen(false)} className="text-sidebar-foreground"><X size={20} /></button>
            </div>
            <SidebarContent />
          </motion.aside>
        </motion.div>
      )}

      <main className="lg:ml-64 pb-8">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setDrawerOpen(true)} className="lg:hidden w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Menu size={18} />
              </button>
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">{activeSection}</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {profile?.displayName ?? "Employer"}</p>
              </div>
            </div>
            <Dialog open={postOpen} onOpenChange={setPostOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm" onClick={() => setPostOpen(true)}>
                  <Plus size={16} /> Post Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Post a job</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Job title *</Label>
                    <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior React Developer" className="mt-1" />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company name" className="mt-1" />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Bangalore" className="mt-1" />
                  </div>
                  <div>
                    <Label>Salary</Label>
                    <Input value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} placeholder="e.g. ₹18-25 LPA" className="mt-1" />
                  </div>
                  <div>
                    <Label>Employment type</Label>
                    <Input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Full-time / Remote / Hybrid" className="mt-1" />
                  </div>
                  <div>
                    <Label>Job type *</Label>
                    <div className="flex gap-4 mt-1.5">
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={form.jobType === "internal"} onChange={() => setForm((f) => ({ ...f, jobType: "internal" }))} />
                        Internal (application form in app)
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={form.jobType === "external"} onChange={() => setForm((f) => ({ ...f, jobType: "external" }))} />
                        External (redirect to link)
                      </label>
                    </div>
                  </div>
                  {form.jobType === "external" && (
                    <div>
                      <Label>External apply link *</Label>
                      <Input value={form.externalLink} onChange={(e) => setForm((f) => ({ ...f, externalLink: e.target.value }))} placeholder="https://..." className="mt-1" />
                    </div>
                  )}
                  {form.jobType === "internal" && (
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Application form (optional)</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addFormField}>+ Add field</Button>
                      </div>
                      <div className="space-y-2 mt-2">
                        {form.formSchema.map((field, i) => (
                          <div key={field.id} className="flex flex-wrap gap-2 items-end p-2 rounded-lg bg-muted/50">
                            <Input placeholder="Label" value={field.label} onChange={(e) => updateFormField(i, { label: e.target.value })} className="w-32" />
                            <select value={field.type} onChange={(e) => updateFormField(i, { type: e.target.value as FormFieldSchema["type"] })} className="h-9 rounded-md border px-2">
                              {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <label className="flex items-center gap-1 text-sm">
                              <input type="checkbox" checked={field.required} onChange={(e) => updateFormField(i, { required: e.target.checked })} />
                              Required
                            </label>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeFormField(i)}><Trash2 size={14} /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Description</Label>
                      <Button type="button" variant="ghost" size="sm" disabled={aiDescLoading || !form.title.trim()} onClick={async () => {
                        setAiDescLoading(true);
                        try {
                          const suggestion = await getJobDescriptionSuggestion(form.title, form.company || "Our company");
                          setForm((f) => ({ ...f, description: suggestion }));
                          toast.success("Description generated.");
                        } catch { toast.error("AI failed."); }
                        finally { setAiDescLoading(false); }
                      }}>{aiDescLoading ? "Generating..." : "Generate with AI"}</Button>
                    </div>
                    <textarea className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm mt-1" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Job description..." />
                  </div>
                  <div>
                    <Label>Skills (comma-separated)</Label>
                    <Input value={form.requirements} onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))} placeholder="React, TypeScript, Node" className="mt-1" />
                  </div>
                  <Button variant="hero" className="w-full" onClick={handlePostJob} disabled={postLoading}>{postLoading ? "Posting..." : "Post Job"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Briefcase, label: "Active Jobs", value: String(activeCount), color: "bg-primary/10 text-primary" },
              { icon: Users, label: "Applicants", value: String(totalApplicants), color: "bg-accent/10 text-accent" },
              { icon: Eye, label: "Total Views", value: String(totalViews), color: "bg-success/10 text-success" },
              { icon: BarChart3, label: "Conversion", value: `${conversionRate}%`, color: "bg-warning/10 text-warning" },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}><stat.icon size={18} /></div>
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-foreground">Your Jobs</h2>
              {selectedJobIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={bulkDelete}>Delete selected ({selectedJobIds.size})</Button>
              )}
            </div>
            {loading ? <p className="text-muted-foreground">Loading...</p> : jobs.length === 0 ? <p className="text-muted-foreground">No jobs yet. Post your first job above.</p> : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-4 hover-lift">
                    <input type="checkbox" checked={selectedJobIds.has(job.id)} onChange={() => toggleSelectJob(job.id)} />
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Briefcase size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm truncate">{job.title}</h3>
                      <p className="text-xs text-muted-foreground">{job.applicantsCount ?? 0} applicants · {job.jobType ?? "internal"}</p>
                    </div>
                    <Badge className={`border-0 rounded-lg text-xs ${job.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{job.status}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => toggleJobStatus(job)}>{job.status === "active" ? "Pause" : "Activate"}</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteJob(job.id).then(() => user && getJobsByEmployer(user.uid).then(setJobs))}><Trash2 size={14} /></Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {activeSection === "Applicants" && (
            <div>
              <h2 className="text-lg font-display font-bold text-foreground mb-4">Applicants</h2>
              {applications.length === 0 ? <p className="text-muted-foreground">No applications yet.</p> : (
                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Job</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Email</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                          <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app.id} className="border-b border-border/50 last:border-0">
                            <td className="p-3 text-sm">{app.jobTitle}</td>
                            <td className="p-3 text-sm">{app.userName}</td>
                            <td className="p-3 text-sm">{app.userEmail}</td>
                            <td className="p-3"><Badge className="rounded-lg text-xs">{app.status}</Badge></td>
                            <td className="p-3 text-right">
                              <Select value={app.status} onValueChange={(v) => updateAppStatus(app.id, v as Application["status"])}>
                                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="applied">Applied</SelectItem>
                                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                  <SelectItem value="interview">Interview</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 border-2 border-dashed border-border/50">
            <h3 className="font-display font-semibold text-foreground mb-1">Bulk Upload (Excel)</h3>
            <p className="text-sm text-muted-foreground mb-4">Download template, fill jobs, then upload .xlsx to preview and publish.</p>
            <input ref={bulkFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkFileChange} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadJobTemplate()}>Download template</Button>
              <Button variant="secondary" size="sm" onClick={() => bulkFileInputRef.current?.click()}>Choose file</Button>
              {bulkRows.length > 0 && (
                <>
                  <Button variant="hero" size="sm" disabled={bulkPublishing} onClick={handleBulkPublish}>
                    {bulkPublishing ? "Publishing..." : `Publish ${bulkRows.filter((_, i) => !bulkDuplicateIndices.has(i)).length} job(s)`}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setBulkRows([]); setBulkErrors([]); }}>Clear</Button>
                </>
              )}
            </div>
            {bulkErrors.length > 0 && <p className="text-sm text-destructive mt-2">{bulkErrors.join(" ")}</p>}
            {bulkRows.length > 0 && (
              <div className="mt-4 overflow-x-auto max-h-60 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Title</th>
                      <th className="text-left p-2 font-medium">Company</th>
                      <th className="text-left p-2 font-medium">Location</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-left p-2 font-medium">Job Type</th>
                      <th className="text-left p-2 font-medium w-20">Dup?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, i) => (
                      <tr key={i} className={bulkDuplicateIndices.has(i) ? "bg-destructive/10" : ""}>
                        <td className="p-2">{row.Title}</td>
                        <td className="p-2">{row.Company}</td>
                        <td className="p-2">{row.Location}</td>
                        <td className="p-2">{row.Type}</td>
                        <td className="p-2">{row["Job Type"]}</td>
                        <td className="p-2">{bulkDuplicateIndices.has(i) ? "Yes" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

function ts(v: unknown): number {
  return typeof (v as { toMillis?: () => number })?.toMillis === "function" ? (v as { toMillis: () => number }).toMillis() : 0;
}

export default EmployerDashboard;
