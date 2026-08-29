import { useState } from 'react';
import { BookOpen, KeyRound, Receipt, Webhook } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TopBar } from '@/components/common/TopBar';
import { ApiKeysTab } from './ApiKeysTab';
import { WebhooksTab } from './WebhooksTab';
import { UsageTab } from './UsageTab';
import { DocsTab } from './DocsTab';

const TABS = [
  { value: 'keys',     label: 'API keys', icon: KeyRound },
  { value: 'webhooks', label: 'Webhooks', icon: Webhook },
  { value: 'usage',    label: 'Usage & billing', icon: Receipt },
  { value: 'docs',     label: 'Documentation', icon: BookOpen },
];

export default function DeveloperPage() {
  const [tab, setTab] = useState('keys');

  return (
    <>
      <TopBar />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Outfit',sans-serif] tracking-tight">
            Developer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drive Mune Work from your own systems — post jobs, pull applicants with their AI match,
            and receive events as they happen.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="keys" className="mt-5"><ApiKeysTab /></TabsContent>
          <TabsContent value="webhooks" className="mt-5"><WebhooksTab /></TabsContent>
          <TabsContent value="usage" className="mt-5"><UsageTab /></TabsContent>
          <TabsContent value="docs" className="mt-5"><DocsTab /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
