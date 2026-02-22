import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  UserProfile,
  UserRole,
  Job,
  Application,
  ApplicationStatus,
  FormFieldSchema,
} from "./types";

const USERS = "users";
const JOBS = "jobs";
const APPLICATIONS = "applications";
const EXTERNAL_CLICKS = "externalClicks";

/** Normalize role: treat "seeker" as "user" for compatibility */
export function normalizeRole(role: string): UserRole {
  if (role === "seeker" || role === "user") return "user";
  if (role === "employer" || role === "admin") return role;
  return "user";
}

export type { UserProfile, UserRole, Job, Application, ApplicationStatus, FormFieldSchema };

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data() as UserProfile & { role?: string };
  return { ...d, uid: snap.id, role: normalizeRole(d.role ?? "user") } as UserProfile;
}

export async function setUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const ref = doc(db, USERS, uid);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "uid" | "createdAt" | "updatedAt">
): Promise<void> {
  const ref = doc(db, USERS, uid);
  const role = data.role === "user" ? "user" : data.role;
  const payload = {
    ...data,
    uid,
    role,
    savedJobIds: data.savedJobIds ?? [],
    employerStatus: data.role === "employer" ? "pending" : undefined,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
}

export function subscribeUserProfile(uid: string, cb: (profile: UserProfile | null) => void): Unsubscribe {
  return onSnapshot(doc(db, USERS, uid), (snap) => {
    if (!snap.exists()) return cb(null);
    const d = snap.data() as UserProfile & { role?: string };
    cb({ ...d, uid: snap.id, role: normalizeRole(d.role ?? "user") } as UserProfile);
  });
}

// ---- Jobs ----

export async function getJobs(opts?: {
  category?: string;
  limitCount?: number;
  location?: string;
  salaryMin?: string;
  skills?: string[];
  jobType?: string;
  employmentType?: string;
  featured?: boolean;
}): Promise<Job[]> {
  const q = query(collection(db, JOBS), limit(opts?.limitCount ?? 100));
  const snap = await getDocs(q);
  let jobs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Job))
    .filter((j) => j.status === "active")
    .sort((a, b) => ts(b.createdAt) - ts(a.createdAt));

  if (opts?.featured) jobs = jobs.filter((j) => j.featured);
  if (opts?.location?.trim()) {
    const loc = opts.location.toLowerCase();
    jobs = jobs.filter((j) => j.location?.toLowerCase().includes(loc));
  }
  if (opts?.employmentType?.trim() && opts.employmentType !== "All") {
    jobs = jobs.filter((j) => j.type === opts.employmentType);
  }
  if (opts?.jobType === "internal" || opts?.jobType === "external") {
    jobs = jobs.filter((j) => j.jobType === opts.jobType);
  }
  if (opts?.skills?.length) {
    const set = new Set(opts.skills.map((s) => s.toLowerCase()));
    jobs = jobs.filter((j) => (j.requirements ?? []).some((r) => set.has(r.toLowerCase())));
  }
  if (opts?.category && opts.category !== "All") {
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(opts!.category!.toLowerCase()) ||
        j.type === opts.category
    );
  }
  return jobs.slice(0, opts?.limitCount ?? 50);
}

function ts(v: unknown): number {
  return typeof (v as { toMillis?: () => number })?.toMillis === "function"
    ? (v as { toMillis: () => number }).toMillis()
    : 0;
}

function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export async function getJob(id: string): Promise<Job | null> {
  const snap = await getDoc(doc(db, JOBS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Job, "id">) } as Job;
}

export async function incrementJobView(jobId: string): Promise<void> {
  const ref = doc(db, JOBS, jobId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    await updateDoc(ref, { viewCount: (data?.viewCount ?? 0) + 1 });
  }
}

export async function createJob(data: Omit<Job, "id" | "createdAt" | "applicantsCount" | "viewCount">): Promise<string> {
  const ref = await addDoc(collection(db, JOBS), {
    ...removeUndefined(data as unknown as Record<string, unknown>),
    applicantsCount: 0,
    viewCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateJob(id: string, data: Partial<Job>): Promise<void> {
  await updateDoc(doc(db, JOBS, id), {
    ...removeUndefined(data as unknown as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJob(id: string): Promise<void> {
  await deleteDoc(doc(db, JOBS, id));
}

export async function bulkDeleteJobs(ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(doc(db, JOBS, id)));
  await batch.commit();
}

export async function setJobFeatured(jobId: string, featured: boolean): Promise<void> {
  await updateDoc(doc(db, JOBS, jobId), { featured, updatedAt: serverTimestamp() });
}

export async function getJobsByEmployer(employerId: string): Promise<Job[]> {
  const q = query(collection(db, JOBS), where("employerId", "==", employerId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Job))
    .sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
}

export async function getAllJobsForAdmin(): Promise<Job[]> {
  const snap = await getDocs(
    query(collection(db, JOBS), orderBy("createdAt", "desc"), limit(500))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Job));
}

// ---- Applications ----

export async function getApplicationByUserAndJob(userId: string, jobId: string): Promise<Application | null> {
  const q = query(
    collection(db, APPLICATIONS),
    where("userId", "==", userId),
    where("jobId", "==", jobId)
  );
  const snap = await getDocs(q);
  const doc = snap.docs[0];
  return doc ? ({ id: doc.id, ...doc.data() } as Application) : null;
}

export async function getApplicationsByUser(userId: string): Promise<(Application & { job?: Job })[]> {
  const q = query(collection(db, APPLICATIONS), where("userId", "==", userId));
  const snap = await getDocs(q);
  const apps = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Application))
    .sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  const withJobs = await Promise.all(
    apps.map(async (a) => {
      const job = await getJob(a.jobId);
      return { ...a, job: job ?? undefined };
    })
  );
  return withJobs;
}

export async function getApplicationsForJob(jobId: string): Promise<Application[]> {
  const q = query(collection(db, APPLICATIONS), where("jobId", "==", jobId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Application))
    .sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
}

export async function createApplication(data: {
  jobId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  resumeUrl?: string;
  formResponses?: Record<string, unknown>;
}): Promise<string> {
  const ref = await addDoc(collection(db, APPLICATIONS), {
    ...data,
    status: "applied",
    createdAt: serverTimestamp(),
  });
  const jobRef = doc(db, JOBS, data.jobId);
  const jobSnap = await getDoc(jobRef);
  if (jobSnap.exists()) {
    const count = (jobSnap.data()?.applicantsCount ?? 0) + 1;
    await updateDoc(jobRef, { applicantsCount: count });
  }
  return ref.id;
}

export async function updateApplicationStatus(appId: string, status: ApplicationStatus): Promise<void> {
  await updateDoc(doc(db, APPLICATIONS, appId), { status });
}

export async function withdrawApplication(appId: string): Promise<void> {
  const ref = doc(db, APPLICATIONS, appId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const jobId = snap.data()?.jobId;
  await deleteDoc(ref);
  if (jobId) {
    const jobRef = doc(db, JOBS, jobId);
    const jobSnap = await getDoc(jobRef);
    if (jobSnap.exists()) {
      const count = Math.max(0, (jobSnap.data()?.applicantsCount ?? 1) - 1);
      await updateDoc(jobRef, { applicantsCount: count });
    }
  }
}

// ---- External clicks ----

export async function recordExternalClick(jobId: string, userId?: string): Promise<void> {
  await addDoc(collection(db, EXTERNAL_CLICKS), {
    jobId,
    userId: userId ?? null,
    timestamp: serverTimestamp(),
  });
}

export async function getExternalClicksCount(jobId: string): Promise<number> {
  const q = query(collection(db, EXTERNAL_CLICKS), where("jobId", "==", jobId));
  const snap = await getDocs(q);
  return snap.size;
}

// ---- Saved jobs ----

export async function getSavedJobIds(userId: string): Promise<string[]> {
  const ref = doc(db, USERS, userId);
  const snap = await getDoc(ref);
  return (snap.data() as { savedJobIds?: string[] } | undefined)?.savedJobIds ?? [];
}

export async function toggleSavedJob(userId: string, jobId: string): Promise<boolean> {
  const ref = doc(db, USERS, userId);
  const snap = await getDoc(ref);
  const data = snap.data() as UserProfile & { savedJobIds?: string[] };
  const list = data?.savedJobIds ?? [];
  const has = list.includes(jobId);
  const next = has ? list.filter((id) => id !== jobId) : [...list, jobId];
  await updateDoc(ref, { savedJobIds: next, updatedAt: serverTimestamp() });
  return !has;
}

export async function getSavedJobs(userId: string): Promise<Job[]> {
  const ids = await getSavedJobIds(userId);
  if (ids.length === 0) return [];
  const jobs = await Promise.all(ids.map((id) => getJob(id)));
  return jobs.filter((j): j is Job => j != null);
}

// ---- Users (admin) ----

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, USERS));
  return snap.docs.map((d) => {
    const data = d.data() as UserProfile & { role?: string };
    return { ...data, uid: d.id, role: normalizeRole(data.role ?? "user") } as UserProfile;
  });
}

export async function updateUserStatus(uid: string, status: "active" | "suspended"): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { status, updatedAt: serverTimestamp() });
}

export async function updateEmployerStatus(
  uid: string,
  status: "pending" | "approved" | "rejected"
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { employerStatus: status, updatedAt: serverTimestamp() });
}

// ---- Seed (optional) ----

export async function seedInitialJobsIfEmpty(employerId: string, employerName: string): Promise<void> {
  const snap = await getDocs(query(collection(db, JOBS), limit(1)));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  const jobs: Omit<Job, "id" | "createdAt" | "applicantsCount" | "viewCount">[] = [
    {
      title: "Senior React Developer",
      company: "TechCorp",
      location: "Bangalore",
      salary: "₹18-25 LPA",
      type: "Full-time",
      description: "We are looking for a Senior React Developer to join our engineering team.",
      requirements: ["React", "TypeScript", "Node.js"],
      employerId,
      employerName,
      status: "active",
      jobType: "internal",
      formSchema: [
        { id: "exp", label: "Years of experience", type: "number", required: true },
        { id: "note", label: "Cover note", type: "textarea", required: false },
      ],
    },
    {
      title: "Product Designer",
      company: "DesignLab",
      location: "Mumbai",
      salary: "₹12-18 LPA",
      type: "Remote",
      description: "Join our design team.",
      requirements: ["Figma", "UI/UX"],
      employerId,
      employerName,
      status: "active",
      jobType: "external",
      externalLink: "https://example.com/apply",
    },
  ];
  jobs.forEach((j) => {
    const ref = doc(collection(db, JOBS));
    batch.set(ref, { ...j, applicantsCount: 0, viewCount: 0, createdAt: serverTimestamp() });
  });
  await batch.commit();
}
