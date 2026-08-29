import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const url = original?.url ?? '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/signup') ||
      url.includes('/auth/otp') ||
      url.includes('/auth/2fa') ||
      url.includes('/auth/verify');

    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (refreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      original._retry = true;
      refreshing = true;
      try {
        const { data } = await axios.post(`${BASE}/auth/refresh-token`, {}, { withCredentials: true });
        const token = data.accessToken ?? data.data?.accessToken;
        useAuthStore.getState().updateToken(token);
        queue.forEach((cb) => cb(token));
        queue = [];
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        queue = [];
        useAuthStore.getState().clearAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } finally {
        refreshing = false;
      }
    }

    const msg = err.response?.data?.message ?? 'Something went wrong';
    if (err.response?.status !== 401 && !isAuthEndpoint) toast.error(msg);
    return Promise.reject(err);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:                   (data: any) => api.post('/auth/login', data),
  applicantSignup:         (data: any) => api.post('/auth/applicant/signup', data),
  employerSignup:          (data: any) => api.post('/auth/employer/signup', data),
  logout:                  ()          => api.post('/auth/logout'),
  sendOtp:                 (data: { email: string; action?: string; name?: string }) =>
                             api.post('/auth/otp/send', data),
  verifyOtp:               (data: { email: string; code: string }) =>
                             api.post('/auth/otp/verify', data),
  verifyAccount:           (data: { email: string; code: string }) =>
                             api.post('/auth/verify-account', data),
  resetPassword:           (data: { email: string; code: string; newPassword: string }) =>
                             api.post('/auth/reset-password', data),
  changePassword:          (data: any) => api.put('/auth/change-password', data),
  generateTwoFactorSecret: ()          => api.post('/auth/2fa/setup'),
  enableTwoFactor:         (secret: string, token: string) =>
                             api.post('/auth/2fa/enable', { secret, token }),
  disableTwoFactor:        ()          => api.post('/auth/2fa/disable'),
  verify2FA:               (data: { code: string; tempToken: string; rememberMe?: boolean }) =>
                             api.post('/auth/2fa/verify', data),
  applicantSignupWithCv:   (form: FormData) => api.post('/auth/applicant/signup-with-cv', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getSessions:             ()                => api.get('/auth/sessions'),
  revokeSession:           (deviceId: string) => api.delete(`/auth/sessions/${deviceId}`),
  revokeAllSessions:       ()                => api.delete('/auth/sessions'),
  deleteAccount:           ()                => api.delete('/auth/account'),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const jobsApi = {
  search:               (params?: any) => api.get('/jobs', { params }),
  get:                  (id: string)   => api.get(`/jobs/${id}`),
  postJob:              (data: any)    => api.post('/jobs', data),
  /** Reads a recruitment flier and returns a pre-filled job draft plus warnings. */
  extractFromFlier:     (form: FormData) =>
                          api.post('/jobs/extract-from-flier', form, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                            timeout: 90000,
                          }),
  updateJob:            (id: string, data: any) => api.patch(`/jobs/${id}`, data),
  deleteJob:            (id: string)   => api.delete(`/jobs/${id}`),
  apply:                (id: string, data: any) => api.post(`/jobs/${id}/apply`, data),
  toggleBookmark:       (id: string)   => api.post(`/jobs/${id}/bookmark`),
  getMyApplications:    (params?: any) => api.get('/jobs/my/applications', { params }),
  getRecommendations:   (params?: any) => api.get('/jobs/my/recommendations', { params }),
  getEmployerJobs:      (params?: any) => api.get('/jobs/employer/my-jobs', { params }),
  getApplicationsForJob: (jobId: string, params?: any) => api.get(`/jobs/${jobId}/applications`, { params }),
  updateApplicationStatus: (appId: string, status: string, notes?: string) =>
    api.patch(`/jobs/applications/${appId}/status`, { status, notes }),
  scheduleInterview: (appId: string, data: any) =>
    api.post(`/jobs/applications/${appId}/interview`, data),
  screenApplicants:    (jobId: string) => api.post(`/jobs/${jobId}/screen`),
  getAnalytics:        ()             => api.get('/employers/me/analytics'),
  getBookmarkedJobs:        (params?: any)              => api.get('/jobs/my/bookmarks', { params }),
  getMyInterviews:          (params?: any)              => api.get('/jobs/my/interviews', { params }),
  cancelInterview:          (id: string)                => api.patch(`/jobs/interviews/${id}/cancel`),
  getScreeningQuestions:    (jobId: string)             => api.get(`/jobs/${jobId}/screening-questions`),
  addScreeningQuestions:    (jobId: string, data: any)  => api.post(`/jobs/${jobId}/screening-questions`, data),
  submitScreeningAnswers:   (appId: string, data: any)  => api.post(`/jobs/applications/${appId}/screening-answers`, data),
  withdrawApplication:      (jobId: string)             => api.patch(`/jobs/my/applications/withdraw/${jobId}`),
  getApplicationById:       (appId: string)             => api.get(`/jobs/my/application-by/${appId}`),
  getMatchDetails:          (applicantId: string, jobId: string) =>
    api.get('/jobs/job-match/applicant', { params: { applicantId, jobId } }),
};

// ─── CVs ──────────────────────────────────────────────────────────────────────
export const cvsApi = {
  list:               ()             => api.get('/cvs'),
  get:                (id: string)   => api.get(`/cvs/${id}`),
  create:             (data: any)    => api.post('/cvs', data),
  upload:             (form: FormData) => api.post('/cvs/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadVideo:        (form: FormData) => api.post('/cvs/upload-video', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:             (id: string, data: any) => api.patch(`/cvs/${id}`, data),
  setDefault:         (id: string)   => api.patch(`/cvs/${id}/set-default`),
  syncProfileFromCv:  (id: string)   => api.post(`/cvs/${id}/auto-fill-profile`),
  delete:             (id: string)   => api.delete(`/cvs/${id}`),
};


// ─── Cover Letters ────────────────────────────────────────────────────────────
export const coverLettersApi = {
  list:       ()             => api.get('/cover-letters'),
  get:        (id: string)   => api.get(`/cover-letters/${id}`),
  create:     (data: any)    => api.post('/cover-letters', data),
  upload:     (form: FormData) => api.post('/cover-letters/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:     (id: string, data: any) => api.patch(`/cover-letters/${id}`, data),
  setDefault: (id: string)   => api.patch(`/cover-letters/${id}/set-default`),
  delete:     (id: string)   => api.delete(`/cover-letters/${id}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  updateApplicantProfile: (data: any)    => api.patch('/applicants/me', data),
  updateEmployerProfile:  (data: any)    => api.patch('/employers/me', data),
  updateApplicantPicture: (form: FormData) => api.post('/applicants/me/profile-picture', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateEmployerLogo:     (form: FormData) => api.post('/employers/me/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getApplicantProfile:    ()             => api.get('/applicants/me'),
  getEmployerProfile:     ()             => api.get('/employers/me'),
  getPublicApplicant:     (id: string)   => api.get(`/applicants/${id}`),
  getPublicEmployer:      (id: string)   => api.get(`/employers/${id}`),
  getPrivacySettings:     ()             => api.get('/applicants/me/privacy'),
  updatePrivacySettings:  (data: any)    => api.patch('/applicants/me/privacy', data),
  getProfileCompleteness: ()             => api.get('/applicants/me/completeness'),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list:        (params?: any) => api.get('/notifications', { params }),
  markRead:    (id: string)   => api.patch(`/notifications/${id}/read`),
  markAllRead: ()             => api.patch('/notifications/read-all'),
  delete:      (id: string)   => api.delete(`/notifications/${id}`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  getConversations:   ()                             => api.get('/chat/conversations'),
  startDirect:        (recipientId: string)          => api.post('/chat/conversations/direct', { recipientId }),
  startSupport:       ()                             => api.post('/chat/conversations/support'),
  getMessages:        (convId: string, params?: any) => api.get(`/chat/conversations/${convId}/messages`, { params }),
  sendMessage:        (convId: string, content: string, extras?: any) => api.post(`/chat/conversations/${convId}/messages`, { content, ...extras }),
  markRead:           (convId: string)               => api.patch(`/chat/conversations/${convId}/read`),
  deleteConversation: (convId: string)               => api.delete(`/chat/conversations/${convId}`),
};


// ─── Network ──────────────────────────────────────────────────────────────────
export const networkApi = {
  discover:          (params?: any) => api.get('/network/discover', { params }),
  getConnections:    (params?: any) => api.get('/network/connections', { params }),
  getRequests:       (params?: any) => api.post('/network/requests', params ?? {}),
  sendRequest:       (userId: string) => api.post(`/network/connect/${userId}`),
  withdrawRequest:   (userId: string) => api.delete(`/network/connect/${userId}`),
  acceptRequest:     (userId: string) => api.get(`/network/accept/${userId}`),
  rejectRequest:     (userId: string) => api.post(`/network/reject/${userId}`),
  removeConnection:  (userId: string) => api.delete(`/network/connections/${userId}`),
};

// ─── Auto Apply ───────────────────────────────────────────────────────────────
export const autoApplyApi = {
  getSettings:    ()          => api.get('/auto-apply/settings'),
  updateSettings: (data: any) => api.put('/auto-apply/settings', data),
  getJobs:        (params?: any) => api.get('/auto-apply/jobs', { params }),
};

// ─── Companies ────────────────────────────────────────────────────────────────
export const companiesApi = {
  list:     (params?: any) => api.get('/employers', { params }),
  follow:   (id: string)  => api.post(`/employers/${id}/follow`),
  unfollow: (id: string)  => api.delete(`/employers/${id}/follow`),
};

// ─── Candidates (Employer Talent Scout) ───────────────────────────────────────
export const candidatesApi = {
  search:     (params?: any) => api.get('/applicants', { params }),
  bookmark:   (id: string)   => api.post(`/applicants/${id}/bookmark`),
  unbookmark: (id: string)   => api.delete(`/applicants/${id}/bookmark`),
};

// ─── Help ─────────────────────────────────────────────────────────────────────
export const helpApi = {
  submitContact: (data: any) => api.post('/help/contact', data),
  submitDemo:    (data: any) => api.post('/help/demo-request', data),
};

// ─── AI Assistant ─────────────────────────────────────────────────────────────
export const aiApi = {
  generateCoverLetter: (data: { jobId: string; cvId?: string; tone?: string }) =>
    api.post('/ai/cover-letter', data),
  analyzeResume: (data: { cvId?: string; targetRole?: string }) =>
    api.post('/ai/resume-analyze', data),
  interviewPrep: (data: { jobId: string; cvId?: string }) =>
    api.post('/ai/interview-prep', data),
  generateJobDescription: (partial: Record<string, any>) =>
    api.post('/ai/job-description', { partial }),
  agentChat: (prompt: string, cvId?: string) =>
    api.post('/ai/chat', { prompt, cvId }),
};


// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptionsApi = {
  getPlans:          ()                        => api.get('/subscriptions/plans'),
  getMySubscription: ()                        => api.get('/subscriptions/my'),
  initialize:        (data: any)               => api.post('/subscriptions/initialize', data),
  confirm:           (data: any)               => api.post('/subscriptions/confirm', data),
  cancel:            ()                        => api.delete('/subscriptions/cancel'),
  getInvoices:       ()                        => api.get('/subscriptions/invoices'),
  toggleAutoRenew:   (autoRenew: boolean)      => api.patch('/subscriptions/auto-renew', { autoRenew }),
};


// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  /** Fetch full settings for a userType ('applicant' | 'employer') */
  get:                         (userType: string) => api.get('/settings/user', { params: { userType } }),
  /** Bulk update all settings */
  update:                      (data: any)        => api.put('/settings/update', data),
  /** Granular applicant notification endpoints */
  updateApplicationStatus:     (data: any)        => api.put('/settings/application-status/update', data),
  updateJobRecommendations:    (data: any)        => api.put('/settings/job-recommendations/update', data),
  updateInterviewInvitation:   (data: any)        => api.put('/settings/interview-invitation/update', data),
  updateAutoApplyNotification: (data: any)        => api.put('/settings/auto-apply/update', data),
  updateSavedJob:              (data: any)        => api.put('/settings/saved-job/update', data),
  updateEmployerAction:        (data: any)        => api.put('/settings/employer-action/update', data),
  updatePlatform:              (data: any)        => api.put('/settings/platform/update', data),
  updateGeneral:               (data: any)        => api.put('/settings/general/update', data),
  updateCommunication:         (data: any)        => api.put('/settings/communication/update', data),
  updatePrivacy:               (data: any)        => api.put('/settings/privacy/update', data),
  /** Employer-only */
  updateManageJobApplications: (data: any)        => api.put('/settings/manage-job-applications/update', data),
  updateJobPostingStatus:      (data: any)        => api.put('/settings/job-posting-status/update', data),
  updatePaymentAndBilling:     (data: any)        => api.put('/settings/payment-and-billing/update', data),
};

// ─── Developer platform ───────────────────────────────────────────────────────
export const developerApi = {
  // API keys — the secret is only ever returned by create/rotate
  listKeys:      ()                    => api.get('/developer/keys'),
  createKey:     (data: any)           => api.post('/developer/keys', data),
  revokeKey:     (id: string)          => api.delete(`/developer/keys/${id}`),
  rotateKey:     (id: string)          => api.post(`/developer/keys/${id}/rotate`),

  // Webhooks
  listWebhooks:  ()                    => api.get('/developer/webhooks'),
  createWebhook: (data: any)           => api.post('/developer/webhooks', data),
  updateWebhook: (id: string, d: any)  => api.patch(`/developer/webhooks/${id}`, d),
  deleteWebhook: (id: string)          => api.delete(`/developer/webhooks/${id}`),
  rotateSecret:  (id: string)          => api.post(`/developer/webhooks/${id}/rotate-secret`),
  pingWebhook:   (id: string)          => api.post(`/developer/webhooks/${id}/ping`),
  deliveries:    (id: string, p?: any) => api.get(`/developer/webhooks/${id}/deliveries`, { params: p }),
  replay:        (id: string)          => api.post(`/developer/deliveries/${id}/replay`),

  // Credit & usage
  wallet:        ()                    => api.get('/developer/wallet'),
  transactions:  (params?: any)        => api.get('/developer/wallet/transactions', { params }),
  setThreshold:  (threshold: number)   => api.patch('/developer/wallet/threshold', { threshold }),
  pricing:       ()                    => api.get('/developer/pricing'),
  usage:         (days = 30)           => api.get('/developer/usage', { params: { days } }),
  logs:          (params?: any)        => api.get('/developer/logs', { params }),
};

// ─── WhatsApp notifications ───────────────────────────────────────────────────
export const whatsappApi = {
  status:       ()                  => api.get('/whatsapp'),
  startVerify:  (phone: string)     => api.post('/whatsapp/verify', { phone }),
  confirm:      (code: string)      => api.post('/whatsapp/verify/confirm', { code }),
  setDigest:    (frequency: string) => api.put('/whatsapp/digest', { frequency }),
  optOut:       ()                  => api.delete('/whatsapp'),
  history:      (params?: any)      => api.get('/whatsapp/history', { params }),
};
