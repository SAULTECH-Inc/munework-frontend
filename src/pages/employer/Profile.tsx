import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Phone, Globe, MapPin, Users, Shield, Image,
  Loader2, Check, Camera, Link2, Trash2, Plus, FileText,
  Search, X,
} from 'lucide-react';
import { PublicProfileLinks } from '@/components/common/PublicProfileLinks';
import { TopBar } from '@/components/common/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usersApi } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';
import { COUNTRIES, INDUSTRIES, COMPANY_SIZES } from '@/lib/profile-data';
import type { EmployerProfile } from '@/types';
import toast from 'react-hot-toast';

const SECTION_NAV = [
  { id: 'company',    icon: Building2, label: 'Company Info' },
  { id: 'about',      icon: FileText,  label: 'About Company' },
  { id: 'contact',    icon: Phone,     label: 'Contact' },
  { id: 'branding',   icon: Image,     label: 'Branding & Visuals' },
  { id: 'socials',    icon: Globe,     label: 'Social Links' },
  { id: 'compliance', icon: Shield,    label: 'Compliance' },
];

export default function EmployerProfilePage() {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<EmployerProfile>({
    queryKey: ['employer-profile-me'],
    queryFn: () => usersApi.getEmployerProfile().then(r => r.data.data ?? r.data),
  });

  const update = useMutation({
    mutationFn: (data: any) => usersApi.updateEmployerProfile(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employer-profile-me'] }); toast.success('Saved'); },
    onError: () => toast.error('Failed to save'),
  });

  const uploadLogo = useMutation({
    mutationFn: (form: FormData) => usersApi.updateEmployerLogo(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employer-profile-me'] }); toast.success('Logo updated'); },
  });

  const save = (data: Partial<EmployerProfile>) => update.mutate(data);

  if (isLoading) {
    return (
      <>
        <TopBar title="Company Profile" />
        <div className="p-6 grid lg:grid-cols-[220px_1fr] gap-6 max-w-5xl mx-auto">
          <Skeleton className="h-80 rounded-xl" />
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Company Profile" />
      <div className="p-6 grid lg:grid-cols-[220px_1fr] gap-6 max-w-5xl mx-auto items-start">

        {/* Sidebar */}
        <div className="lg:sticky lg:top-4 space-y-3">
          {/* Logo card */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <Avatar className="h-16 w-16 rounded-xl">
                <AvatarImage src={profile?.companyLogo} />
                <AvatarFallback className="rounded-xl text-lg font-bold">
                  {getInitials(profile?.companyName ?? 'C')}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-3 w-3 text-primary-foreground" />
                <input type="file" accept="image/*" className="sr-only" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const form = new FormData(); form.append('file', f);
                  uploadLogo.mutate(form);
                }} />
              </label>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{profile?.companyName || 'Company Name'}</p>
              <p className="text-xs text-muted-foreground">{profile?.industry ?? 'Industry not set'}</p>
            </div>

            {/* Candidates reach this page from job posts, so it is worth being
                able to see and share what they see. */}
            {profile?.id && <PublicProfileLinks id={profile.id} role="employer" />}
          </div>

          {/* Section nav */}
          <div className="bg-surface border border-border rounded-xl p-2 space-y-0.5">
            {SECTION_NAV.map(({ id, icon: Icon, label }) => (
              <button key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-5 min-w-0">

          {/* Company Info */}
          <SectionCard id="company" icon={Building2} label="Company Information">
            <CompanyInfoForm profile={profile!} onSave={save} saving={update.isPending} />
          </SectionCard>

          {/* About */}
          <SectionCard id="about" icon={FileText} label="About Company">
            <AboutForm profile={profile!} onSave={save} saving={update.isPending} />
          </SectionCard>

          {/* Contact */}
          <SectionCard id="contact" icon={Phone} label="Contact Information">
            <ContactForm profile={profile!} onSave={save} saving={update.isPending} />
          </SectionCard>

          {/* Branding */}
          <SectionCard id="branding" icon={Image} label="Branding & Visual Identity">
            <BrandingForm profile={profile!} onSave={save} saving={update.isPending} />
          </SectionCard>

          {/* Socials */}
          <SectionCard id="socials" icon={Globe} label="Social Links">
            <SocialsForm profile={profile!} onSave={save} saving={update.isPending} />
          </SectionCard>

          {/* Compliance */}
          <SectionCard id="compliance" icon={Shield} label="Compliance & Verification">
            <ComplianceForm profile={profile!} onSave={save} saving={update.isPending} />
          </SectionCard>
        </div>
      </div>
    </>
  );
}

// ─── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({ id, icon: Icon, label, children }: {
  id: string; icon: React.ElementType; label: string; children: React.ReactNode;
}) {
  return (
    <div id={id} className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function LabeledInput({ label, value, onChange, type = 'text', placeholder, className }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="h-8 text-sm" />
    </div>
  );
}

function Combobox({ label, value, onChange, options, placeholder, className }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  const showAdd = q.trim() && !options.some(o => o.toLowerCase() === q.toLowerCase());

  function select(v: string) { onChange(v); setQ(''); setOpen(false); }

  return (
    <div ref={ref} className={cn('space-y-1 relative', className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={open ? q : value}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setQ(''); setOpen(true); }}
          placeholder={value || placeholder || 'Search…'}
          className="w-full h-8 pl-8 pr-7 text-sm bg-surface-raised border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); setQ(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg">
          {showAdd && (
            <button type="button" onClick={() => select(q.trim())}
              className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-surface-raised">
              Add "{q.trim()}"
            </button>
          )}
          {filtered.length === 0 && !showAdd && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
          )}
          {filtered.map(o => (
            <button type="button" key={o} onClick={() => select(o)}
              className={cn('w-full text-left px-3 py-2 text-xs hover:bg-surface-raised transition-colors',
                o === value ? 'text-primary font-medium' : 'text-foreground')}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end pt-3 border-t border-border mt-4">
      <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Save
      </Button>
    </div>
  );
}

// ─── Section forms ─────────────────────────────────────────────────────────────

function CompanyInfoForm({ profile, onSave, saving }: { profile: EmployerProfile; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    companyName: profile?.companyName ?? '',
    industry: profile?.industry ?? '',
    companySize: profile?.companySize ?? '',
    country: profile?.country ?? '',
    city: profile?.city ?? '',
    companyAddress: profile?.companyAddress ?? '',
    companyWebsite: profile?.companyWebsite ?? '',
  });
  useEffect(() => {
    if (profile) setForm({
      companyName: profile.companyName ?? '',
      industry: profile.industry ?? '',
      companySize: profile.companySize ?? '',
      country: profile.country ?? '',
      city: profile.city ?? '',
      companyAddress: profile.companyAddress ?? '',
      companyWebsite: profile.companyWebsite ?? '',
    });
  }, [profile]);

  const f = (field: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [field]: v }));

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <LabeledInput label="Company name *" value={form.companyName} onChange={f('companyName')} placeholder="Acme Corp" className="sm:col-span-2" />
        <Combobox label="Industry" value={form.industry} onChange={f('industry')} options={INDUSTRIES} placeholder="Select industry…" />
        <Combobox label="Company size" value={form.companySize} onChange={f('companySize')} options={COMPANY_SIZES} placeholder="Select size…" />
        <Combobox label="Country" value={form.country} onChange={f('country')} options={COUNTRIES} placeholder="Search country…" />
        <LabeledInput label="City" value={form.city} onChange={f('city')} placeholder="Lagos" />
        <LabeledInput label="Address" value={form.companyAddress} onChange={f('companyAddress')} placeholder="123 Victoria Island" className="sm:col-span-2" />
        <LabeledInput label="Website" value={form.companyWebsite} onChange={f('companyWebsite')} placeholder="https://acmecorp.com" className="sm:col-span-2" />
      </div>
      <SaveBar onSave={() => onSave(form)} saving={saving} />
    </>
  );
}

function AboutForm({ profile, onSave, saving }: { profile: EmployerProfile; onSave: (d: any) => void; saving: boolean }) {
  const [description, setDescription] = useState(profile?.companyDescription ?? '');
  const [about, setAbout] = useState(profile?.aboutCompany ?? '');
  useEffect(() => {
    if (profile) { setDescription(profile.companyDescription ?? ''); setAbout(profile.aboutCompany ?? ''); }
  }, [profile]);

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Company Description (brief)</label>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="A short one-paragraph description shown on job listings…"
            className="w-full resize-none bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">About Company (full)</label>
          <textarea rows={6} value={about} onChange={e => setAbout(e.target.value)}
            placeholder="Tell candidates about your company's mission, culture, values, and what makes you a great place to work…"
            className="w-full resize-none bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>
      <SaveBar onSave={() => onSave({ companyDescription: description, aboutCompany: about })} saving={saving} />
    </>
  );
}

function ContactForm({ profile, onSave, saving }: { profile: EmployerProfile; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    companyPhone: profile?.companyPhone ?? '',
    managerEmail: profile?.managerEmail ?? '',
    managerPhone: profile?.managerPhone ?? '',
    managerRole: profile?.managerRole ?? '',
  });
  useEffect(() => {
    if (profile) setForm({
      companyPhone: profile.companyPhone ?? '',
      managerEmail: profile.managerEmail ?? '',
      managerPhone: profile.managerPhone ?? '',
      managerRole: profile.managerRole ?? '',
    });
  }, [profile]);
  const f = (field: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [field]: v }));

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <LabeledInput label="Company phone" value={form.companyPhone} onChange={f('companyPhone')} placeholder="+234 801 000 0000" type="tel" />
        <LabeledInput label="Manager role" value={form.managerRole} onChange={f('managerRole')} placeholder="Head of Talent" />
        <LabeledInput label="Manager email" value={form.managerEmail} onChange={f('managerEmail')} placeholder="hr@acmecorp.com" type="email" />
        <LabeledInput label="Manager phone" value={form.managerPhone} onChange={f('managerPhone')} placeholder="+234 801 000 0001" type="tel" />
      </div>
      <SaveBar onSave={() => onSave(form)} saving={saving} />
    </>
  );
}

function BrandingForm({ profile, onSave, saving }: { profile: EmployerProfile; onSave: (d: any) => void; saving: boolean }) {
  const [galleryLinks, setGalleryLinks] = useState<string[]>(profile?.brandVisuals ?? []);
  const [newLink, setNewLink] = useState('');
  useEffect(() => { if (profile) setGalleryLinks(profile.brandVisuals ?? []); }, [profile]);

  const add = () => {
    if (!newLink.trim()) return;
    setGalleryLinks(prev => [...prev, newLink.trim()]);
    setNewLink('');
  };
  const remove = (i: number) => setGalleryLinks(prev => prev.filter((_, j) => j !== i));

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Brand Gallery / Visual Identity (image URLs)</p>
          <div className="grid grid-cols-3 gap-2">
            {galleryLinks.map((url, i) => (
              <div key={i} className="relative group aspect-video rounded-lg overflow-hidden border border-border bg-surface-raised">
                <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <button onClick={() => remove(i)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://cdn.example.com/photo.jpg" className="h-8 text-sm"
              onKeyDown={e => e.key === 'Enter' && add()} />
            <Button size="sm" variant="outline" onClick={add} className="h-8"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
      <SaveBar onSave={() => onSave({ brandVisuals: galleryLinks })} saving={saving} />
    </>
  );
}

function SocialsForm({ profile, onSave, saving }: { profile: EmployerProfile; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    linkedInProfile: profile?.linkedInProfile ?? '',
    twitterProfile: profile?.twitterProfile ?? '',
    facebookProfile: profile?.facebookProfile ?? '',
    instagramProfile: profile?.instagramProfile ?? '',
  });
  useEffect(() => {
    if (profile) setForm({
      linkedInProfile: profile.linkedInProfile ?? '',
      twitterProfile: profile.twitterProfile ?? '',
      facebookProfile: profile.facebookProfile ?? '',
      instagramProfile: profile.instagramProfile ?? '',
    });
  }, [profile]);
  const f = (field: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [field]: v }));

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <LabeledInput label="LinkedIn" value={form.linkedInProfile} onChange={f('linkedInProfile')} placeholder="https://linkedin.com/company/acme" />
        <LabeledInput label="Twitter / X" value={form.twitterProfile} onChange={f('twitterProfile')} placeholder="https://x.com/acme" />
        <LabeledInput label="Facebook" value={form.facebookProfile} onChange={f('facebookProfile')} placeholder="https://facebook.com/acme" />
        <LabeledInput label="Instagram" value={form.instagramProfile} onChange={f('instagramProfile')} placeholder="https://instagram.com/acme" />
      </div>
      <SaveBar onSave={() => onSave(form)} saving={saving} />
    </>
  );
}

function ComplianceForm({ profile, onSave, saving }: { profile: EmployerProfile; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    registrationNumber: profile?.registrationNumber ?? '',
    taxId: profile?.taxId ?? '',
  });
  useEffect(() => {
    if (profile) setForm({ registrationNumber: profile.registrationNumber ?? '', taxId: profile.taxId ?? '' });
  }, [profile]);
  const f = (field: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [field]: v }));

  return (
    <>
      <div className="bg-warning/5 border border-warning/20 rounded-lg px-4 py-3 mb-4">
        <p className="text-xs text-warning">
          <strong>Verified employers</strong> get a badge on their profile and access to premium candidate scouting features.
          All information is encrypted and used only for verification purposes.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <LabeledInput label="Business registration number" value={form.registrationNumber} onChange={f('registrationNumber')} placeholder="RC 1234567" />
        <LabeledInput label="Tax identification number (TIN)" value={form.taxId} onChange={f('taxId')} placeholder="TIN-XXXX-XXXX" />
      </div>
      <SaveBar onSave={() => onSave(form)} saving={saving} />
    </>
  );
}
