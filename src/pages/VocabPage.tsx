import { useMemo, useState } from 'react';
import { Search, X, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RegionalNote } from '@/components/NeedsVerifyBadge';
import { EmptyState } from '@/components/decor/Illustrations';
import { allWords, allTopics, topicLabel, POS_LABEL } from '@/content';
import { hrefFor } from '@/lib/router';
import { PERSON_LABEL, PERSONS, type Word, type Verb } from '@/content/schema';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/** 忽略大小寫與重音的比對，讓搜尋 "cafe" 也能找到 "café" */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const isVerb = (w: Word): w is Verb => w.pos === 'verb';

function WordCard({ word }: { word: Word }) {
  const { t, L, Lo } = useT();
  const topic = L(topicLabel(word.topic));
  const pos = L(POS_LABEL[word.pos]);
  const genderNote = Lo(word.genderNote);

  return (
    <article className="rounded-3xl border border-line/70 bg-surface p-5 shadow-soft transition-shadow duration-300 hover:shadow-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h3 lang="es" className="break-es text-xl font-extrabold text-body">
          {word.es}
        </h3>
        {word.pos === 'noun' && word.gender ? (
          // 直接把冠詞印出來當標記 —— el / la 本身就是要記的資訊，比任何性別符號都直接
          <Badge
            variant={word.gender === 'm' ? 'primary' : 'secondary'}
            title={t(word.gender === 'm' ? 'masculineHint' : 'feminineHint')}
          >
            <span lang="es" className="font-extrabold">
              {word.gender === 'm' ? 'el' : 'la'}
            </span>
          </Badge>
        ) : null}
        <Badge variant="neutral">{pos}</Badge>
        {topic === pos ? null : (
          <span className="ml-auto text-xs font-semibold text-muted">{topic}</span>
        )}
      </div>

      <p className="mt-1 text-[15px] font-semibold text-body">{L(word.gloss)}</p>

      {genderNote ? (
        <p className="mt-2 rounded-2xl bg-accent-100/70 px-3 py-2 text-sm leading-relaxed text-ink-800 dark:bg-accent-900/30 dark:text-accent-100">
          {genderNote}
        </p>
      ) : null}

      <div className="mt-3 rounded-2xl bg-surface-2 px-3 py-2.5">
        <p lang="es" className="break-es text-sm font-semibold text-body">
          {word.exampleEs}
        </p>
        <p className="mt-0.5 text-sm text-muted">{L(word.exampleGloss)}</p>
      </div>

      {isVerb(word) ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            {t('presentTense')}（{t(word.irregular ? 'irregular' : 'regular')}）
          </p>
          <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {PERSONS.map((p) => (
              <div
                key={p}
                className="flex items-baseline gap-2 rounded-xl bg-surface-2 px-2.5 py-1.5"
              >
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
  const { t, L, locale } = useT();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [pos, setPos] = useState<Word['pos'] | null>(null);

  const topics = useMemo(() => allTopics(), []);
  const posOptions = useMemo(() => {
    const seen = new Set(allWords.map((w) => w.pos));
    return (Object.keys(POS_LABEL) as Word['pos'][]).filter((p) => seen.has(p));
  }, []);

  const results = useMemo(() => {
    const raw = query.trim();
    const q = fold(raw);
    return allWords.filter((w) => {
      if (topic && w.topic !== topic) return false;
      if (pos && w.pos !== pos) return false;
      if (!q) return true;
      // 兩種語言的字義都納入搜尋，切到英文時打中文也還找得到
      return (
        fold(w.es).includes(q) ||
        fold(w.gloss.en).includes(q) ||
        w.gloss.zh.includes(raw) ||
        fold(w.exampleEs).includes(q)
      );
    });
  }, [query, topic, pos]);

  const hasFilter = Boolean(query || topic || pos);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-body">{t('vocabTitle')}</h1>
          <p className="text-sm text-muted">{t('vocabSubtitle', { n: allWords.length })}</p>
        </div>
        <Button asChild variant="secondary">
          <a href={hrefFor({ name: 'drill', id: 'all' })}>
            <Layers aria-hidden="true" />
            {t('drillCtaAll')}
          </a>
        </Button>
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
            placeholder={t('searchPlaceholder')}
            className="pl-10"
            aria-label={t('searchLabel')}
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
              {L(POS_LABEL[p])}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {topics.map(({ topic: tp, count }) => (
            <Button
              key={tp}
              size="sm"
              variant={topic === tp ? 'secondary' : 'ghost'}
              className={cn(topic === tp ? '' : 'border border-line')}
              onClick={() => setTopic(topic === tp ? null : tp)}
            >
              {L(topicLabel(tp))}
              <span className="text-xs opacity-70">{count}</span>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <p className="text-sm font-semibold text-muted">
            {t('matchCount', { n: results.length })}
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
              {t('clearFilters')}
            </Button>
          ) : null}
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState title={t('noMatch')} hint={t('noMatchHint')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((w) => (
            <WordCard key={`${locale}-${w.id}`} word={w} />
          ))}
        </div>
      )}
    </div>
  );
}
