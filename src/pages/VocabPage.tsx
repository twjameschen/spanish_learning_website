import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RegionalNote } from '@/components/NeedsVerifyBadge';
import { EmptyState } from '@/components/decor/Illustrations';
import { allWords, allTopics, topicLabel, POS_LABEL } from '@/content';
import { PERSON_LABEL, PERSONS, type Word, type Verb } from '@/content/schema';
import { cn } from '@/lib/utils';

/** 忽略大小寫與重音的比對，讓搜尋 "cafe" 也能找到 "café" */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const isVerb = (w: Word): w is Verb => w.pos === 'verb';

function GenderMark({ word }: { word: Word }) {
  if (word.pos !== 'noun' || !word.gender) return null;
  const masculine = word.gender === 'm';
  // 直接把冠詞印出來當標記 —— 對學習者來說 el / la 本身就是要記的資訊，
  // 比任何性別符號都直接。顏色只是輔助辨識。
  return (
    <Badge
      variant={masculine ? 'primary' : 'secondary'}
      title={masculine ? '陽性名詞（配 el / un）' : '陰性名詞（配 la / una）'}
    >
      <span lang="es" className="font-extrabold">{masculine ? 'el' : 'la'}</span>
    </Badge>
  );
}

function WordCard({ word }: { word: Word }) {
  return (
    <article className="rounded-3xl border border-line/70 bg-surface p-5 shadow-soft transition-shadow duration-300 hover:shadow-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h3 lang="es" className="break-es text-xl font-extrabold text-body">
          {word.es}
        </h3>
        <GenderMark word={word} />
        <Badge variant="neutral">{POS_LABEL[word.pos]}</Badge>
        {/* 動詞的主題標籤也叫「動詞」，跟詞性徽章重複，相同時就不再顯示一次 */}
        {topicLabel(word.topic) === POS_LABEL[word.pos] ? null : (
          <span className="ml-auto text-xs font-semibold text-muted">
            {topicLabel(word.topic)}
          </span>
        )}
      </div>

      <p className="mt-1 text-[15px] font-semibold text-body">{word.zh}</p>

      {word.genderNote ? (
        <p className="mt-2 rounded-2xl bg-accent-100/70 px-3 py-2 text-sm leading-relaxed text-ink-800 dark:bg-accent-900/30 dark:text-accent-100">
          {word.genderNote}
        </p>
      ) : null}

      <div className="mt-3 rounded-2xl bg-surface-2 px-3 py-2.5">
        <p lang="es" className="break-es text-sm font-semibold text-body">
          {word.exampleEs}
        </p>
        <p className="mt-0.5 text-sm text-muted">{word.exampleZh}</p>
      </div>

      {isVerb(word) ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            現在式變化{word.irregular ? '（不規則）' : '（規則）'}
          </p>
          <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {PERSONS.map((p) => (
              <div key={p} className="flex items-baseline gap-2 rounded-xl bg-surface-2 px-2.5 py-1.5">
                <dt className="text-xs text-muted">{PERSON_LABEL[p].es}</dt>
                <dd lang="es" className="ml-auto text-sm font-bold text-body">
                  {word.conjugations.presente[p]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {word.regional ? (
        <div className="mt-3">
          <RegionalNote regional={word.regional} />
        </div>
      ) : null}
    </article>
  );
}

export function VocabPage() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [pos, setPos] = useState<Word['pos'] | null>(null);

  const topics = useMemo(() => allTopics(), []);
  const posOptions = useMemo(() => {
    const seen = new Set(allWords.map((w) => w.pos));
    return (Object.keys(POS_LABEL) as Word['pos'][]).filter((p) => seen.has(p));
  }, []);

  const results = useMemo(() => {
    const q = fold(query.trim());
    return allWords.filter((w) => {
      if (topic && w.topic !== topic) return false;
      if (pos && w.pos !== pos) return false;
      if (!q) return true;
      return (
        fold(w.es).includes(q) ||
        w.zh.includes(query.trim()) ||
        fold(w.exampleEs).includes(q)
      );
    });
  }, [query, topic, pos]);

  const hasFilter = Boolean(query || topic || pos);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-body">單字表</h1>
        <p className="text-sm text-muted">
          A0 共 {allWords.length} 個字。名詞一律標上 el / la —— 請養成連冠詞一起記的習慣。
        </p>
      </header>

      <div className="space-y-3 rounded-3xl border border-line/70 bg-surface p-4 shadow-soft">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋西班牙文或中文（可忽略重音，打 cafe 也找得到 café）"
            className="pl-10"
            aria-label="搜尋單字"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {posOptions.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={pos === p ? 'primary' : 'outline'}
              onClick={() => setPos(pos === p ? null : p)}
            >
              {POS_LABEL[p]}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {topics.map(({ topic: t, count }) => (
            <Button
              key={t}
              size="sm"
              variant={topic === t ? 'secondary' : 'ghost'}
              className={cn(topic === t ? '' : 'border border-line')}
              onClick={() => setTopic(topic === t ? null : t)}
            >
              {topicLabel(t)}
              <span className="text-xs opacity-70">{count}</span>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <p className="text-sm font-semibold text-muted">
            符合 <span className="text-primary-600">{results.length}</span> 個字
          </p>
          {hasFilter ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuery('');
                setTopic(null);
                setPos(null);
              }}
            >
              <X aria-hidden="true" />
              清除篩選
            </Button>
          ) : null}
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="沒有符合的單字"
          hint="換個關鍵字試試，或按上面的「清除篩選」回到完整清單。"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((w) => (
            <WordCard key={w.id} word={w} />
          ))}
        </div>
      )}
    </div>
  );
}
