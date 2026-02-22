import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BarChart3, Briefcase, Users, FileText, Brain, Shield, TrendingUp,
  Search, AlertTriangle, Ban, CheckCircle, XCircle, Download, Settings
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  getAllUsers,
  getAllJobsForAdmin,
  updateUserStatus,
  updateEmployerStatus,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  setJobFeatured,
  createJob,
  type UserProfile,
  type Job,
} from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  downloadJobTemplate,
  parseJobExcel,
  findDuplicateRows,
  type BulkJobRow,
} from "@/lib/excel";

const sidebarItems = [
  { icon: BarChart3, label: "Overview" },
  { icon: Briefcase, label: "Jobs" },
  { icon: Users, label: "Users" },
  { icon: Shield, label: "Employers" },
  { icon: Brain, label: "AI Monitoring" },
  { icon: FileText, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("Overview");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkRows, setBulkRows] = useState<BulkJobRow[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const { user: authUser, profile: authProfile } = useAuth();

  const load = () => {
    setLoading(true);
    Promise.all([getAllUsers(), getAllJobsForAdmin()])
      .then(([u, j]) => {
        setUsers(u);
        setJobs(j);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load admin data.";
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const activeUsers = users.filter((u) => (u as UserProfile & { status?: string }).status !== "suspended").length;
  const pendingEmployers = users.filter((u) => u.role === "employer" && (u as UserProfile & { employerStatus?: string }).employerStatus === "pending").length;

  const overviewStats = [
    { label: "Active Users", value: String(activeUsers), icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Active Jobs", value: String(activeJobs), icon: Briefcase, color: "bg-accent/10 text-accent" },
    { label: "Total Jobs", value: String(jobs.length), icon: TrendingUp, color: "bg-success/10 text-success" },
    { label: "Pending Employers", value: String(pendingEmployers), icon: Shield, color: "bg-warning/10 text-warning" },
  ];

  const handleSuspend = async (uid: string) => {
    await updateUserStatus(uid, "suspended");
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status: "suspended" as const } : u)));
    toast.success("User suspended.");
  };

  const handleActivate = async (uid: string) => {
    await updateUserStatus(uid, "active");
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status: "active" as const } : u)));
    toast.success("User activated.");
  };

  const handleApproveEmployer = async (uid: string) => {
    await updateEmployerStatus(uid, "approved");
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, employerStatus: "approved" as const } : u)));
    toast.success("Employer approved.");
  };

  const handleRejectEmployer = async (uid: string) => {
    await updateEmployerStatus(uid, "rejected");
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, employerStatus: "rejected" as const } : u)));
    toast.success("Employer rejected.");
  };

  const toggleJobSelect = (id: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteJobs = async () => {
    if (selectedJobIds.size === 0) return;
    await bulkDeleteJobs([...selectedJobIds]);
    setSelectedJobIds(new Set());
    load();
    toast.success(`Deleted ${selectedJobIds.size} job(s).`);
  };

  const handleSetFeatured = async (jobId: string, featured: boolean) => {
    await setJobFeatured(jobId, featured);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, featured } : j)));
    toast.success(featured ? "Job featured." : "Job unfeatured.");
  };

  const bulkDuplicateIndices = new Set(findDuplicateRows(bulkRows));

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const { rows, errors } = await parseJobExcel(file);
    setBulkErrors(errors);
    setBulkRows(rows);
    if (rows.length > 0) toast.info(`${rows.length} row(s) loaded. Duplicates will be skipped on Publish.`);
  };

  const handleBulkPublish = async () => {
    if (!authUser?.uid) {
      toast.error("You must be signed in to publish jobs.");
      return;
    }
    const toPublish = bulkRows.filter((_, i) => !bulkDuplicateIndices.has(i));
    if (toPublish.length === 0) {
      toast.error("No rows to publish (all duplicates or empty).");
      return;
    }
    setBulkPublishing(true);
    try {
      for (const row of toPublish) {
        const jobType = (row["Job Type"]?.toLowerCase() === "external" ? "external" : "internal") as "internal" | "external";
        await createJob({
          employerId: authUser.uid,
          employerName: authProfile?.displayName ?? "Admin",
          title: (row.Title ?? "").trim(),
          company: (row.Company ?? "").trim(),
          location: (row.Location ?? "").trim(),
          salary: (row.Salary ?? "").trim(),
          type: (row.Type ?? "Full-time").trim() || "Full-time",
          status: "active",
          jobType,
          externalLink: jobType === "external" ? (row["External Link"] ?? "").trim() : undefined,
          description: (row.Description ?? "").trim(),
          requirements: (row.Skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          formSchema: [],
        });
      }
      toast.success(`Published ${toPublish.length} job(s).`);
      setBulkRows([]);
      setBulkErrors([]);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk publish failed.");
    } finally {
      setBulkPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="fixed left-0 top-0 bottom-0 w-64 flex-col bg-sidebar border-r border-sidebar-border z-40 hidden md:flex">
        <div className="p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/80 flex items-center justify-center">
            <Shield size={20} className="text-destructive-foreground" />
          </div>
          <div>
            <span className="font-display font-bold text-sidebar-foreground text-lg">JobVerse</span>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Admin</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveSection(item.label)}
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
      </aside>

      <main className="flex-1 md:ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-display font-bold text-foreground">{activeSection}</h1>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search..." className="h-10 rounded-xl pl-9 w-64 bg-card" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive font-bold text-sm">A</div>
            </div>
          </div>
        </header>

        <div className="px-6 lg:px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {overviewStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4"
              >
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon size={18} />
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {activeSection === "Jobs" && (
            <div>
              <div className="glass-card p-6 border-2 border-dashed border-border/50 mb-6">
                <h3 className="font-display font-semibold text-foreground mb-1">Bulk Upload (Excel)</h3>
                <p className="text-sm text-muted-foreground mb-4">Download template, fill jobs, then upload .xlsx to preview and publish as admin.</p>
                <input ref={bulkFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkFileChange} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadJobTemplate()}>Download template</Button>
                  <Button variant="secondary" size="sm" onClick={() => bulkFileInputRef.current?.click()}>Choose file</Button>
                  {bulkRows.length > 0 && (
                    <>
                      <Button variant="default" size="sm" disabled={bulkPublishing} onClick={handleBulkPublish}>
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
              </div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-foreground">All Jobs</h2>
                {selectedJobIds.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDeleteJobs}>Bulk delete ({selectedJobIds.size})</Button>
                )}
              </div>
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase w-10"></th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Job</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Employer</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                          <td className="p-3"><input type="checkbox" checked={selectedJobIds.has(job.id)} onChange={() => toggleJobSelect(job.id)} /></td>
                          <td className="p-3 font-medium text-sm">{job.title}</td>
                          <td className="p-3 text-sm text-muted-foreground">{job.employerName}</td>
                          <td className="p-3"><Badge variant="secondary" className="text-xs">{job.jobType ?? "internal"}</Badge></td>
                          <td className="p-3"><Badge className={`text-xs ${job.status === "active" ? "bg-success/10 text-success" : "bg-muted"}`}>{job.status}</Badge></td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant={job.featured ? "default" : "outline"} onClick={() => handleSetFeatured(job.id, !job.featured)}>{job.featured ? "Featured" : "Feature"}</Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteJob(job.id).then(load)}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Brain size={18} className="text-primary" /> AI Monitoring
            </h2>
            <p className="text-sm text-muted-foreground">Real-time alerts will appear here when configured.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-foreground">Users</h2>
              <Button variant="outline" size="sm"><Download size={14} /> Export</Button>
            </div>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">User</th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                      <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="p-4 text-muted-foreground">Loading...</td></tr>
                    ) : (
                      users.map((u) => {
                        const status = (u as UserProfile & { status?: string }).status ?? "active";
                        const employerStatus = (u as UserProfile & { employerStatus?: string }).employerStatus;
                        return (
                          <tr key={u.uid} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                                  {u.displayName?.charAt(0) ?? "?"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{u.displayName}</p>
                                  <p className="text-xs text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="secondary" className="capitalize rounded-lg text-xs">{u.role}</Badge>
                              {u.role === "employer" && employerStatus && <span className="ml-1 text-xs">({employerStatus})</span>}
                            </td>
                            <td className="p-4">
                              <Badge className={`border-0 rounded-lg text-xs ${status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                {status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {u.role === "employer" && employerStatus === "pending" && (
                                  <>
                                    <Button size="sm" onClick={() => handleApproveEmployer(u.uid)}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRejectEmployer(u.uid)}>Reject</Button>
                                  </>
                                )}
                                {status === "active" && <button onClick={() => handleSuspend(u.uid)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-destructive"><Ban size={14} /></button>}
                                {status === "suspended" && <button onClick={() => handleActivate(u.uid)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-success">Activate</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
