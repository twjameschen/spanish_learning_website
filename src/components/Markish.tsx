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

/**
 * 只做行內格式（**粗體**、`程式碼`），不產生區塊元素。
 * 題目提示這種「一行字但想強調某個詞」的地方用這個，
 * 不要用 Markish —— 那會包一層 <p> 進去，把外面的排版打亂。
 */
export function Inline({ text }: { text: string }) {
  return <>{inline(text, 'i')}</>;
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

    // | 管線分隔的表格：第二列是 |---|---| 的分隔線
    // 課文用它排「哪種情況配哪個時態」這類對照，純段落排不出對齊
    if (line.trimStart().startsWith('|') && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const cells = (row: string) =>
        row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2; // 跳過標題列與分隔線
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').trimStart().startsWith('|')) {
        rows.push(cells(lines[i] ?? ''));
        i += 1;
      }
      blocks.push(
        // 窄畫面放不下時讓表格自己橫向捲動，不要把整頁撐寬
        <div key={`k${key++}`} className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[26rem] border-collapse text-[15px]">
            <thead>
              <tr>
                {head.map((h, n) => (
                  <th
                    key={n}
                    className="border-b-2 border-line px-3 py-2 text-left font-extrabold text-body"
                  >
                    {inline(h, `th${key}-${n}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rn) => (
                <tr key={rn} className="align-top">
                  {row.map((c, cn) => (
                    <td key={cn} className="border-b border-line/60 px-3 py-2 leading-relaxed">
                      {inline(c, `td${key}-${rn}-${cn}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
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
