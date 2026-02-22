/** Only 3 roles: Job Seeker (user), Employer, Admin */
export type UserRole = "user" | "employer" | "admin";

export type EmployerStatus = "pending" | "approved" | "rejected";

/** Internal = apply form in app. External = redirect to link. */
export type JobType = "internal" | "external";

export type ApplicationStatus = "applied" | "shortlisted" | "rejected" | "interview";

export interface FormFieldSchema {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "email" | "select";
  required: boolean;
  options?: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  /** For employers: pending until admin approves */
  employerStatus?: EmployerStatus;
  jobTitle?: string;
  experienceLevel?: string;
  skills: string[];
  status?: "active" | "suspended";
  savedJobIds?: string[];
  /** Resume file URL (Storage) */
  resumeUrl?: string;
  createdAt: unknown;
  updatedAt?: unknown;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary: string;
  /** Employment type: Full-time, Part-time, Remote, etc. */
  type: string;
  description: string;
  requirements: string[];
  employerId: string;
  employerName: string;
  status: "active" | "paused" | "closed";
  /** internal = in-app form, external = redirect */
  jobType: JobType;
  /** Required when jobType === "external" */
  externalLink?: string;
  /** Custom application form for internal jobs */
  formSchema?: FormFieldSchema[];
  viewCount?: number;
  applicantsCount?: number;
  featured?: boolean;
  createdAt: unknown;
  updatedAt?: unknown;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  resumeUrl?: string;
  status: ApplicationStatus;
  formResponses?: Record<string, unknown>;
  createdAt: unknown;
}

export interface ExternalClick {
  id: string;
  jobId: string;
  userId?: string;
  timestamp: unknown;
}
