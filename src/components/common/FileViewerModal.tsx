import { useEffect, useState } from 'react';
import { Loader2, Download, AlertCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { filesApi } from '@/lib/api';

/**
 * In-app viewer for uploaded files (CV, cover letter, …). Fetches the file
 * through the authenticated backend proxy — the raw Cloudinary link 401s and an
 * <a target=_blank> loses the session — then renders PDFs/images inline and
 * offers a download for anything the browser can't display (e.g. .docx).
 */
export function FileViewerModal({ open, onClose, url, title }: {
  open: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState('');
  const [filename, setFilename] = useState('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !url) return;
    let revoked = false;
    let created: string | null = null;
    setLoading(true);
    setError(false);
    setObjectUrl(null);

    filesApi.proxy(url)
      .then((res) => {
        if (revoked) return;
        const blob = res.data as Blob;
        setContentType(blob.type || (res.headers as any)['content-type'] || '');
        const cd = (res.headers as any)['content-disposition'] || '';
        const m = /filename="?([^"]+)"?/.exec(cd);
        if (m) setFilename(m[1]);
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      })
      .catch(() => !revoked && setError(true))
      .finally(() => !revoked && setLoading(false));

    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [open, url]);

  const isPdf = contentType.includes('pdf');
  const isImage = contentType.startsWith('image/');
  const canInline = isPdf || isImage;

  const download = () => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[92vw] h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm truncate">{title || 'Document'}</DialogTitle>
          {objectUrl && (
            <Button size="sm" variant="outline" className="text-xs gap-1.5 mr-8" onClick={download}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 bg-surface-raised overflow-auto">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Loading document…</p>
            </div>
          )}

          {!loading && error && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-semibold">Couldn't load this file</p>
              <p className="text-xs text-muted-foreground max-w-sm">The file may have been removed or is temporarily unavailable.</p>
            </div>
          )}

          {!loading && !error && objectUrl && canInline && (
            isPdf ? (
              <iframe src={objectUrl} title={title || 'Document'} className="w-full h-full border-0" />
            ) : (
              <div className="h-full flex items-center justify-center p-4">
                <img src={objectUrl} alt={title || 'Document'} className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            )
          )}

          {!loading && !error && objectUrl && !canInline && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
              <ExternalLink className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold">Preview not available for this file type</p>
              <p className="text-xs text-muted-foreground">Download it to open in the right app.</p>
              <Button size="sm" className="gap-1.5" onClick={download}>
                <Download className="h-3.5 w-3.5" /> Download {filename}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
