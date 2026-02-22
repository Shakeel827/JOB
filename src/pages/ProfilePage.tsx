import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Camera, Upload, FileText, Shield, Award, ChevronRight,
  Mail, Phone, MapPin, Briefcase, LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { uploadResume } from "@/lib/storage";
import { toast } from "sonner";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const displayName = profile?.displayName ?? "User";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      await uploadResume(user.uid, file);
      toast.success("Resume uploaded.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:ml-64">
      <header className="gradient-hero px-4 sm:px-6 pt-4 pb-20 safe-top">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="lg:hidden w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center text-primary-foreground">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-display font-bold text-primary-foreground">Profile</h1>
          <Button variant="glass" size="sm">Edit</Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-elevated p-6 text-center">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold mx-auto">
              {initial}
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground">
              <Camera size={14} />
            </button>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
              <Shield size={10} className="text-success-foreground" />
            </div>
          </div>
          <h2 className="mt-4 font-display font-bold text-xl text-foreground">{displayName}</h2>
          <p className="text-sm text-muted-foreground">{profile?.jobTitle ?? profile?.role ?? "Member"}</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">1.2k</p>
              <p className="text-[10px] text-muted-foreground uppercase">Views</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">48</p>
              <p className="text-[10px] text-muted-foreground uppercase">Applied</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">12</p>
              <p className="text-[10px] text-muted-foreground uppercase">Saved</p>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 space-y-3">
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeChange} />
          {[
            { icon: Mail, label: "Email", value: profile?.email ?? "—" },
            { icon: Phone, label: "Phone", value: profile?.phone ?? "—" },
            { icon: MapPin, label: "Location", value: "—" },
            { icon: Briefcase, label: "Experience", value: profile?.experienceLevel ?? "—" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="glass-card p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <item.icon size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Skills */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 glass-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {(profile?.skills?.length ? profile.skills : ["Add skills in edit"]).map((s) => (
              <Badge key={s} variant="secondary" className="rounded-lg px-3 py-1.5">{s}</Badge>
            ))}
          </div>
        </motion.div>

        {/* Resume */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-6 glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <Upload size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Resume</p>
            <p className="text-xs text-muted-foreground">
              {profile?.resumeUrl ? "Uploaded" : "PDF, DOC up to 5MB"}
            </p>
          </div>
          {profile?.resumeUrl ? (
            <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">View</a>
          ) : (
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          )}
        </motion.div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {[
            { icon: FileText, label: "Resume Builder", desc: "Create with AI" },
            { icon: Award, label: "Upgrade to Premium", desc: "Unlock all features" },
          ].map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="w-full glass-card p-4 flex items-center gap-4 hover-lift text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <item.icon size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6">
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut size={18} className="mr-2" /> Sign out
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
