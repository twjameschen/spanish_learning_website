import type { ReactNode } from 'react';

/**
 * 課文的中文說明裡會用到 **粗體**、`程式碼`、> 引言、``` 對照表 這幾種標記。
 * 為了離線與零依賴，這裡自己做最小限度的解析，不引入 markdown 套件。
 * 只支援實際用到的語法，遇到不認識的就原樣輸出。
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // 同時處理 **粗體** 與 `行內程式碼`
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      out.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-extrabold text-body">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      out.push(
        <code
          key={`${keyPrefix}-c${i}`}
          lang="es"
          className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[.9em] text-primary-700 dark:text-primary-300"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markish({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // ``` 圍起來的對照表：等寬字體、可橫向捲動
    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        body.push(lines[i] ?? '');
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre
          key={`k${key++}`}
          className="overflow-x-auto rounded-2xl bg-ink-800 p-3.5 text-[13px] leading-relaxed text-ink-50 dark:bg-ink-950"
        >
          <code>{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // > 引言：拿來放「一句話重點」
    if (line.trimStart().startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('>')) {
        body.push((lines[i] ?? '').trimStart().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`k${key++}`}
          className="rounded-2xl border-l-4 border-primary-400 bg-primary-50 px-4 py-3 text-[15px] font-semibold leading-relaxed text-ink-800 dark:bg-primary-900/25 dark:text-primary-50"
        >
          {inline(body.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // - 開頭的清單
    if (/^\s*[-•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-•]\s/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*[-•]\s/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={`k${key++}`} className="ml-1 space-y-1.5">
          {items.map((item, n) => (
            <li key={n} className="flex gap-2 text-[15px] leading-relaxed">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-400" />
              <span>{inline(item, `l${key}-${n}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    blocks.push(
      <p key={`k${key++}`} className="text-[15px] leading-[1.85]">
        {inline(line, `p${key}`)}
      </p>,
    );
    i += 1;
  }

  return <div className="space-y-3">{blocks}</div>;
}
