import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Shield } from "lucide-react";
import { useAuth, validateAdminPin } from "@/lib/auth";
import { toast } from "sonner";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { unlockAdmin } = useAuth();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      toast.error("Enter admin PIN.");
      return;
    }
    if (!validateAdminPin(pin.trim())) {
      toast.error("Invalid admin PIN.");
      return;
    }
    setLoading(true);
    try {
      await unlockAdmin(pin.trim());
      toast.success("Admin access granted.");
      navigate("/admin", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Admin unlock failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-destructive" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-1">Restricted access</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <Label>Admin PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              placeholder="Enter PIN"
              className="mt-1.5 h-12 rounded-xl"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" variant="default" size="lg" className="w-full" disabled={loading}>
            {loading ? "Unlocking..." : (
              <>
                Unlock Admin <ArrowRight className="ml-1" size={16} />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <button type="button" onClick={() => navigate("/auth")} className="text-primary hover:underline">
            ← Back to main login
          </button>
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
