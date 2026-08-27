import { useRef, useState } from 'react';
import { Download, Upload, Check, TriangleAlert, ClipboardCopy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import {
  exportBackup,
  backupFileName,
  downloadJson,
  parseBackup,
  importBackup,
} from '@/lib/backup';

type Status =
  | { kind: 'idle' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string }
  /** 下載被環境擋掉時，把 JSON 攤開讓使用者自己複製 */
  | { kind: 'manual'; text: string };

export function BackupControls({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    try {
      const backup = await exportBackup();
      const count = Object.keys(backup.data).length;
      if (count === 0) {
        setStatus({ kind: 'error', message: t('exportEmpty') });
        return;
      }
      const ok = downloadJson(backupFileName(), backup);
      setStatus(
        ok
          ? { kind: 'ok', message: t('exportOk', { n: count }) }
          : { kind: 'manual', text: JSON.stringify(backup, null, 2) },
      );
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : t('exportFailed') });
    }
  }

  async function handleFile(file: File) {
    try {
      const backup = parseBackup(await file.text());
      const summary = await importBackup(backup, 'replace');
      setStatus({
        kind: 'ok',
        message: t('importOk', { n: summary.keys, t: summary.exportedAt }),
      });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : t('importFailed') });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size={compact ? 'sm' : 'md'}
          onClick={handleExport}
          title={t('exportTitle')}
        >
          <Download aria-hidden="true" />
          {t('exportBtn')}
        </Button>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'md'}
          onClick={() => fileRef.current?.click()}
          title={t('importTitle')}
        >
          <Upload aria-hidden="true" />
          {t('importBtn')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {status.kind === 'ok' ? (
        <p className="flex items-start gap-1.5 text-sm font-semibold text-success-700 dark:text-success-200">
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {status.message}
        </p>
      ) : null}

      {status.kind === 'error' ? (
        <p className="flex items-start gap-1.5 text-sm font-semibold text-error-600">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {status.message}
        </p>
      ) : null}

      {status.kind === 'manual' ? (
        <div className="space-y-2 rounded-2xl bg-surface-2 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-body">
            <ClipboardCopy aria-hidden="true" className="size-4" />
            {t('manualCopy')}
          </p>
          <textarea
            readOnly
            value={status.text}
            onFocus={(e) => e.currentTarget.select()}
            className="h-40 w-full resize-y rounded-2xl border border-line bg-surface p-3 font-mono text-xs text-body"
          />
        </div>
      ) : null}
    </div>
  );
}
