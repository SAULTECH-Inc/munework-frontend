import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AppLayout } from '@/layouts/AppLayout';
import { PublicProfileLayout } from '@/layouts/PublicProfileLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

import LandingPage from '@/pages/Landing';
import LoginPage from '@/pages/auth/Login';
import SignupPage from '@/pages/auth/Signup';
import ForgotPasswordPage from '@/pages/auth/ForgotPassword';
import VerifyOtpPage from '@/pages/auth/VerifyOtp';
import ResetPasswordPage from '@/pages/auth/ResetPassword';
import ResetSuccessPage from '@/pages/auth/ResetSuccess';
import OAuthCallback from '@/pages/auth/OAuthCallback';

import ApplicantDashboard from '@/pages/applicant/Dashboard';
import ApplicationsPage from '@/pages/applicant/Applications';
import ResumePage from '@/pages/applicant/Resume';

import EmployerDashboard from '@/pages/employer/Dashboard';
import EmployerJobsPage from '@/pages/employer/Jobs';
import CandidatesPage from '@/pages/employer/Candidates';
import AnalyticsPage from '@/pages/employer/Analytics';
import DeveloperPage from '@/pages/employer/developer';

import JobsPage from '@/pages/jobs/Jobs';
import ChatPage from '@/pages/Chat';
import SettingsPage from '@/pages/Settings';
import SchedulesPage from '@/pages/Schedules';
import SavedJobsPage from '@/pages/SavedJobs';
import NetworkPage from '@/pages/Network';
import AutoApplyPage from '@/pages/AutoApply';
import NotificationsPage from '@/pages/Notifications';
import ApplicantPublicProfilePage from '@/pages/ApplicantPublicProfile';
import EmployerPublicProfilePage from '@/pages/EmployerPublicProfile';
import NotFoundPage from '@/pages/NotFound';
import NotAuthorizedPage from '@/pages/NotAuthorized';
import ApplicantAssessmentsPage from '@/pages/applicant/Assessments';
import EmployerAssessmentsPage from '@/pages/employer/Assessments';
import PlansPage from '@/pages/Plans';
import HelpPage from '@/pages/Help';
import CompaniesPage from '@/pages/Companies';
import TermsPage from '@/pages/Terms';
import HiringGuidePage from '@/pages/HiringGuide';
import ChangelogPage from '@/pages/Changelog';
import ApplicantProfileEditPage from '@/pages/applicant/Profile';
import EmployerProfileEditPage from '@/pages/employer/Profile';
import JobDetailPage from '@/pages/jobs/JobDetail';
import ResumeBuilderPage from '@/pages/applicant/ResumeBuilder';
import SignDocumentsPage from '@/pages/SignDocuments';
import CandidateScoutPage from '@/pages/employer/CandidateScout';
import EmailPreferencesPage from '@/pages/EmailPreferences';
import UnsubscribePage from '@/pages/Unsubscribe';
import PaymentResultPage from '@/pages/PaymentResult';

import { useAuthStore } from '@/store/auth.store';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function DashboardRedirect() {
  const { user } = useAuthStore();
  return <Navigate to={user?.userType === 'employer' ? '/dashboard' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth (redirect away if logged in) */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/reset-success" element={<ResetSuccessPage />} />
          </Route>

          {/* OAuth redirect target — no layout, handles its own redirect */}
          <Route path="/auth/social/:action/callback" element={<OAuthCallback />} />

          {/* Shareable profiles: readable without a session, full chrome with one */}
          <Route element={<PublicProfileLayout />}>
            <Route path="/profile/applicant/:id" element={<ApplicantPublicProfilePage />} />
            <Route path="/profile/employer/:id" element={<EmployerPublicProfilePage />} />

            {/* Browsable without an account. These are the pages worth ranking:
                gating them behind /login meant a crawler saw a redirect and no
                job posting could ever be indexed. Applicant-only actions inside
                them (apply, bookmark, match scores) are gated individually. */}
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/companies" element={<CompaniesPage />} />

            {/* Static content with no reason to require a session. */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/hiring-guide" element={<HiringGuidePage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
          </Route>

          {/* Authenticated shell */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<SmartDashboard />} />
            <Route path="/applications" element={<SmartApplications />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/employer/jobs" element={<EmployerJobsPage />} />
            <Route path="/employer/jobs/:jobId/candidates" element={<CandidatesPage />} />
            <Route path="/employer/candidates" element={<CandidatesPage />} />
            <Route path="/employer/scout" element={<CandidateScoutPage />} />
            <Route path="/employer/analytics" element={<AnalyticsPage />} />
            <Route path="/employer/developer" element={<DeveloperPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/saved-jobs" element={<SavedJobsPage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/auto-apply" element={<AutoApplyPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/assessments" element={<SmartAssessments />} />
            <Route path="/employer/assessments" element={<EmployerAssessmentsPage />} />
            <Route path="/profile" element={<ApplicantProfileEditPage />} />
            <Route path="/resume-builder" element={<ResumeBuilderPage />} />
            <Route path="/sign-documents" element={<SignDocumentsPage />} />
            <Route path="/employer/profile" element={<EmployerProfileEditPage />} />
          </Route>

          <Route path="/403" element={<NotAuthorizedPage />} />
          <Route path="/email-preferences" element={<EmailPreferencesPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/payment/result" element={<PaymentResultPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--surface))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            fontSize: '13px',
            borderRadius: '10px',
          },
        }}
      />
    </QueryClientProvider>
  );
}

function SmartDashboard() {
  const { user } = useAuthStore();
  if (!user) return null;
  if (user.userType === 'employer') return <EmployerDashboard />;
  return <ApplicantDashboard />;
}

function SmartAssessments() {
  const { user } = useAuthStore();
  if (!user) return null;
  if (user.userType === 'employer') return <EmployerAssessmentsPage />;
  return <ApplicantAssessmentsPage />;
}

function SmartApplications() {
  const { user } = useAuthStore();
  if (!user) return null;
  if (user.userType === 'employer') return <CandidatesPage />;
  return <ApplicationsPage />;
}
