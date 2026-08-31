// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserType = 'applicant' | 'employer' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending_verification' | 'verified' | 'suspended';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship' | 'temporary' | 'volunteer';
export type WorkMode = 'remote' | 'onsite' | 'hybrid';
export type JobLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'executive';
export type JobStatus = 'draft' | 'posted' | 'active' | 'paused' | 'closed' | 'expired' | 'archived';
export type ApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'offer_extended'
  | 'offer_accepted'
  | 'offer_declined'
  | 'hired'
  | 'rejected'
  | 'withdrawn';
export type NotificationType = 'job_match' | 'application_update' | 'interview_scheduled' | 'message' | 'system';
export type PaymentGateway = 'paystack' | 'flutterwave' | 'stripe';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  userType: UserType;
  status: UserStatus;
  isVerified: boolean;
  twoFactorEnabled?: boolean;
  profilePicture?: string;
  // Applicant fields
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  // Employer fields
  companyName?: string;
  companyLogo?: string;
  industry?: string;
  website?: string;
  // Attached CV (for employer-side candidate view)
  cv?: Pick<CV, 'parsedData'>;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

// ─── Applicant profile sub-types ─────────────────────────────────────────────

export interface ProfileEducation {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  country?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  description?: string;
}

export interface ProfileExperience {
  id?: string;
  company: string;
  position: string;
  location?: string;
  city?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface ProfileSkill {
  skill: string;
  level?: string;
  proficiency?: string;
  yearsOfExperience?: string;
}

export interface ProfileLanguage {
  language: string;
  level: string;
}

export interface ProfileCertification {
  certification: string;
  institution?: string;
  dateObtained?: string;
  description?: string;
}

export interface ProfileAward {
  title: string;
  recipient?: string;
  date?: string;
  description?: string;
}

export interface ProfileReference {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  relationship?: string;
}

export interface ProfileSalaryRange {
  currency: string;
  minAmount: number;
  maxAmount: number;
  frequency: 'yearly' | 'monthly' | 'daily' | 'weekly' | 'hourly';
}

export interface ProfileLocation {
  country: string;
  city: string;
}

// ─── User / Profiles ──────────────────────────────────────────────────────────

export interface ApplicantProfile extends AuthUser {
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber?: string;
  bio?: string;
  dateOfBirth?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  address?: string;
  professionalTitle?: string;
  professionalSummary?: string;
  headline?: string;
  yearsOfExperience?: string;
  linkedInProfile?: string;
  githubProfile?: string;
  twitterProfile?: string;
  instagramProfile?: string;
  facebookProfile?: string;
  youtubeProfile?: string;
  portfolioLinks?: string[];
  governmentId?: string;
  // Career preferences
  desiredJobTitles?: string[];
  jobTypes?: string[];
  workTypes?: string[];
  preferredLocations?: ProfileLocation[];
  preferredCountries?: string[];
  preferredCompanies?: string[];
  preferredBenefits?: string[];
  salaryRanges?: ProfileSalaryRange[];
  expectedSalaries?: ProfileSalaryRange[];
  openToRelocation?: boolean;
  // Profile sections
  education?: ProfileEducation[];
  workExperience?: ProfileExperience[];
  skills?: ProfileSkill[];
  languages?: ProfileLanguage[];
  certifications?: ProfileCertification[];
  awards?: ProfileAward[];
  references?: ProfileReference[];
  // File links
  cvLink?: string;
  coverLetterLink?: string;
  videoCv?: string;
}

export interface EmployerProfile extends AuthUser {
  companyName: string;
  companyDescription?: string;
  companyPhone?: string;
  companyAddress?: string;
  industry?: string;
  companyWebsite?: string;
  companyLogo?: string;
  coverPage?: string;
  aboutCompany?: string;
  companySize?: string;
  country?: string;
  city?: string;
  registrationNumber?: string;
  taxId?: string;
  brandVisuals?: string[];
  linkedInProfile?: string;
  twitterProfile?: string;
  facebookProfile?: string;
  instagramProfile?: string;
  managerRole?: string;
  managerEmail?: string;
  managerPhone?: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  frequency: 'yearly' | 'monthly' | 'daily' | 'weekly' | 'hourly';
}

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: 'short_text' | 'long_text' | 'yes_no' | 'single_choice' | 'multiple_choice';
  options?: string[];
  isRequired: boolean;
}

export interface AiSettings {
  autoScreen: boolean;
  matchThreshold: number;
}

export interface Job {
  id: string;
  title: string;
  company?: string;
  description?: string;
  /** HTML string from rich-text editor */
  requirements?: string;
  /** HTML string from rich-text editor */
  responsibility?: string;
  department?: string;
  location: string;
  jobType: JobType;
  /** Entity field: employmentType (remote/onsite/hybrid) */
  employmentType?: WorkMode;
  /** Entity field: level (intern/junior/mid/senior/lead/manager/executive) */
  level?: JobLevel;
  /** Entity field: jobStatus */
  jobStatus?: JobStatus;
  /** Kept for backward-compat reads; prefer jobStatus */
  status?: JobStatus;
  salaryRange?: SalaryRange;
  /** Entity field: endDate — the application deadline */
  endDate?: string;
  startDate?: string;
  experienceYears?: number;
  skillSet?: string[];
  preferredCandidateCountry?: string[];
  preferredCandidatePreviousCompany?: string[];
  preferredCandidateUniversity?: string[];
  preferredCandidateQualification?: string[];
  preferredCandidateGrade?: string[];
  hiringManager?: string;
  screeningQuestions?: ScreeningQuestion[];
  aiSettings?: AiSettings;
  applicationMethod?: Record<string, boolean>;
  isBookmarked?: boolean;
  hasApplied?: boolean;
  employer?: EmployerProfile;
  employerId?: string;
  createdAt: string;
  updatedAt?: string;
  // AI-enriched
  aiMatchScore?: number;
  matchScore?: number;
  // Relation count from backend _count
  _count?: { applications: number };
}

// ─── Applications ─────────────────────────────────────────────────────────────

export interface Application {
  id: string;
  status: ApplicationStatus;
  coverLetter?: string;
  aiMatchScore?: number;
  screeningAnswers?: Record<string, string>;
  employerNotes?: string;
  isAutoApplied: boolean;
  autoRejectReason?: string;
  job?: Job;
  jobId: string;
  applicant?: ApplicantProfile & { cv?: Pick<CV, 'parsedData'> };
  applicantId: string;
  cvId?: string;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── CV ───────────────────────────────────────────────────────────────────────

export interface CvExperience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface CvEducation {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  grade?: string;
}

export interface CvParsedData {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  skills: string[];
  experience: CvExperience[];
  education: CvEducation[];
  certifications?: Array<{ name: string; issuer: string; date?: string }>;
  languages?: Array<{ name: string; proficiency: string }>;
}

export interface CV {
  id: string;
  title: string;
  label?: string;
  description?: string;
  isDefault: boolean;
  cvType?: 'uploaded' | 'built' | 'linked';
  fileUrl?: string;
  cvLink?: string;
  videoCv?: string;
  parsedData?: CvParsedData;
  applicantId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CoverLetterItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  coverLetterLink?: string;
  isDefault: boolean;
  applicantId: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  attachmentUrl?: string;
  conversationId: string;
  senderId: string;
  sender?: AuthUser;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  lastMessageAt?: string;
  lastMessage?: Message;
  participants?: AuthUser[];
  otherParticipant?: { id: string; name: string; avatar?: string };
  messages?: Message[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  userId: string;
  createdAt: string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  interval: 'month' | 'year';
  currency: string;
  features: Record<string, any>;
}

export interface Subscription {
  id: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  startsAt: string;
  expiresAt: string;
  plan?: Plan;
  gateway?: PaymentGateway;
  amountPaid?: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
}
