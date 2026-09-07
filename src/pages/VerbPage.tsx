import { memo, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Search, X, Table2, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpeakButton } from '@/components/SpeakButton';
import { MasteryStars } from '@/components/MasteryStars';
import { RegionalNote } from '@/components/NeedsVerifyBadge';
import { ConjugationTable, ImperativeTable } from '@/components/ConjugationTable';
import { EmptyState, BrokenSignpost } from '@/components/decor/Illustrations';
import { allVerbs, getVerb, allLessons } from '@/content';
import { LEVELS, type Level, type Verb } from '@/content/schema';
import { hrefFor } from '@/lib/router';
import { hitsForVerb, formLabel } from '@/lib/verbForms';
import { useProgressStore, starsForWord } from '@/store/useProgressStore';
import { foldAccents } from '@/lib/normalize';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/** 忽略大小寫與重音的比對，讓搜尋 "hable" 也能找到 "hablé" */
const fold = (s: string): string => foldAccents(s).toLowerCase();

/* ------------------------------------------------------------------ *
 * 列表
 * ------------------------------------------------------------------ */

/**
 * 一列動詞。
 *
 * `memo` 與 `content-visibility` 的理由跟單字表同一套（Phase 14 實測過）：
 * 105 列各帶一顆喇叭，搜尋框每按一個鍵不該重繪全部。
 */
const VerbRow = memo(function VerbRow({
  verb,
  query,
  stars,
}: {
  verb: Verb;
  query: string;
  stars: number;
}) {
  const { t, L } = useT();
  // 使用者打的是變位形式時，把「這是哪個時態哪個人稱」直接標在該列上
  const hits = query.trim() ? hitsForVerb(query, verb.id) : [];

  return (
    <li
      className={cn(
        '[content-visibility:auto] [contain-intrinsic-size:auto_84px]',
        'flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border border-line/70',
        'bg-surface px-4 py-3 shadow-soft transition-shadow duration-300 hover:shadow-card',
      )}
    >
      {/*
        喇叭是 <button>，所以**不能**包在 <a> 裡面 —— HTML 不允許互動元素
        巢狀。以前整列都是一個 <a>，105 列就有 105 個不合法的巢狀結構。
        改成連結只包住動詞本身，喇叭與標記是它的兄弟節點。
      */}
      <a
        href={hrefFor({ name: 'verb', id: verb.id })}
        lang="es"
        className="break-es text-lg font-extrabold text-body hover:underline"
      >
        {verb.es}
      </a>
      <SpeakButton text={verb.es} />
      <MasteryStars stars={stars} />
      <Badge variant={verb.irregular ? 'accent' : 'neutral'}>
        {t(verb.irregular ? 'irregular' : 'verbRegular')}
      </Badge>
      {verb.reflexive ? (
        <Badge variant="secondary" title={t('verbReflexiveHint')}>
          {t('verbReflexive')}
        </Badge>
      ) : null}
      <Badge variant="outline">{verb.level}</Badge>
      <span className="w-full text-sm text-muted sm:w-auto">{L(verb.gloss)}</span>

      {hits.length > 0 ? (
        <span className="w-full text-xs font-semibold text-primary-800 dark:text-primary-300">
          {hits
            .map((h) => t('verbFormMatch', { form: h.form, what: L(formLabel(h.what)) }))
            .join('、')}
        </span>
      ) : null}
    </li>
  );
});

export function VerbListPage() {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level | null>(null);
  /** null = 全部；true = 只看不規則；false = 只看規則 */
  const [irregular, setIrregular] = useState<boolean | null>(null);
  /*
   * 訂閱 cards 是為了「答完題回來星星要跟著變」。
   * 值本身由 starsForWord 讀 —— 它走的是 getState()，
   * 但因為這裡有訂閱，cards 一變就重繪，拿到的一定是最新的。
   * 星等當 prop 傳下去，memo 過的列才看得到變化。
   */
  const cards = useProgressStore((s) => s.cards);
  const starsOf = useMemo(() => {
    void cards;
    return (id: string) => starsForWord(id);
  }, [cards]);

  const results = useMemo(() => {
    const raw = query.trim();
    const q = fold(raw);
    return allVerbs.filter((v) => {
      if (level && v.level !== level) return false;
      if (irregular !== null && v.irregular !== irregular) return false;
      if (!q) return true;
      return (
        fold(v.es).includes(q) ||
        fold(v.gloss.en).includes(q) ||
        v.gloss.zh.includes(raw) ||
        // 打變位形式也要找得到 —— 讀到 fui 想查原形的那條路
        hitsForVerb(raw, v.id).length > 0
      );
    });
  }, [query, level, irregular]);

  const hasFilter = Boolean(query || level || irregular !== null);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-body">{t('verbsTitle')}</h1>
        <p className="text-sm text-muted">{t('verbsSubtitle', { n: allVerbs.length })}</p>
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
            placeholder={t('verbsSearchPlaceholder')}
            className="pl-10"
            aria-label={t('verbsSearchLabel')}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((lv) => (
            <Button
              key={lv}
              size="sm"
              variant={level === lv ? 'primary' : 'outline'}
              onClick={() => setLevel(level === lv ? null : lv)}
            >
              {lv}
            </Button>
          ))}
          <Button
            size="sm"
            variant={irregular === true ? 'secondary' : 'ghost'}
            className={cn(irregular === true ? '' : 'border border-line')}
            onClick={() => setIrregular(irregular === true ? null : true)}
          >
            {t('irregular')}
          </Button>
          <Button
            size="sm"
            variant={irregular === false ? 'secondary' : 'ghost'}
            className={cn(irregular === false ? '' : 'border border-line')}
            onClick={() => setIrregular(irregular === false ? null : false)}
          >
            {t('verbRegular')}
          </Button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <p className="text-sm font-semibold text-muted">
            {t('verbCount', { n: results.length })}
          </p>
          {hasFilter ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuery('');
                setLevel(null);
                setIrregular(null);
              }}
            >
              <X aria-hidden="true" />
              {t('clearFilters')}
            </Button>
          ) : null}
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState title={t('verbNoMatch')} hint={t('verbNoMatchHint')} />
      ) : (
        <ul className="space-y-2">
          {results.map((v) => (
            <VerbRow key={v.id} verb={v} query={query} stars={starsOf(v.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 單一動詞
 * ------------------------------------------------------------------ */

export function VerbPage({ id }: { id: string }) {
  const { t, L } = useT();
  const verb = getVerb(id);

  if (!verb) {
    return (
      <EmptyState
        icon={<BrokenSignpost />}
        title={t('verbNotFound')}
        hint={t('verbNotFoundHint', { id })}
        action={
          <Button asChild variant="outline">
            <a href={hrefFor({ name: 'verbs' })}>
              <ArrowLeft aria-hidden="true" />
              {t('backToVerbs')}
            </a>
          </Button>
        }
      />
    );
  }

  const idx = allVerbs.findIndex((v) => v.id === verb.id);
  const prev = idx > 0 ? allVerbs[idx - 1] : undefined;
  const next = idx < allVerbs.length - 1 ? allVerbs[idx + 1] : undefined;

  // 哪幾課考過這個動詞的變位 —— 資料裡本來就有 verbId，只是沒人讀
  const lessons = allLessons.filter((l) =>
    l.exercises.some((e) => e.type === 'conjugation' && e.verbId === verb.id),
  );

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <a
          href={hrefFor({ name: 'verbs' })}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary-800 hover:underline dark:text-primary-300"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('backToVerbs')}
        </a>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={verb.irregular ? 'accent' : 'neutral'}>
            {t(verb.irregular ? 'irregular' : 'verbRegular')}
          </Badge>
          {verb.reflexive ? (
            <Badge variant="secondary" title={t('verbReflexiveHint')}>
              {t('verbReflexive')}
            </Badge>
          ) : null}
          <Badge variant="outline">{verb.level}</Badge>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 lang="es" className="break-es text-3xl font-extrabold tracking-tight text-body">
            {verb.es}
          </h1>
          <SpeakButton text={verb.es} />
        </div>
        <p className="text-[15px] font-semibold text-body">{L(verb.gloss)}</p>

        {/* 分詞不屬於任何時態，放在標題區才不會硬塞進表格 */}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm">
          <div className="flex items-baseline gap-2">
            <dt className="text-xs font-semibold text-muted">{t('participioLabel')}</dt>
            <dd lang="es" className="font-bold text-body">
              {verb.participio}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-xs font-semibold text-muted">{t('gerundioLabel')}</dt>
            <dd lang="es" className="font-bold text-body">
              {verb.gerundio}
            </dd>
          </div>
        </dl>
      </header>

      <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-card">
        <p lang="es" className="break-es font-bold text-body">
          {verb.exampleEs}
          <SpeakButton text={verb.exampleEs} className="ml-1.5" />
        </p>
        <p className="mt-1 text-sm text-muted">{L(verb.exampleGloss)}</p>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-body">
          <Table2 aria-hidden="true" className="size-5 text-primary-500" />
          {t('verbFormsHeading')}
        </h2>
        <div className="rounded-3xl border border-line/70 bg-surface p-4 shadow-card">
          <ConjugationTable verb={verb} />
        </div>
      </section>

      {/* 命令式只在真的有的時候才出現。haber / poder / preocuparse 沒有，
          那三個就整區不顯示 —— 不補、不編 */}
      {verb.imperativo ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-body">{t('verbImperativeHeading')}</h2>
          <div className="rounded-3xl border border-line/70 bg-surface p-4 shadow-card">
            <ImperativeTable verb={verb} />
          </div>
        </section>
      ) : null}

      {verb.regional ? <RegionalNote regional={verb.regional} /> : null}

      {lessons.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-body">
            <GraduationCap aria-hidden="true" className="size-5 text-primary-500" />
            {t('verbLessonsHeading')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {lessons.map((l) => (
              <li key={l.id}>
                <Button asChild size="sm" variant="outline">
                  <a href={hrefFor({ name: 'lesson', id: l.id })}>{L(l.title)}</a>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-3 border-t border-line pt-5">
        {prev ? (
          <Button asChild variant="outline">
            <a href={hrefFor({ name: 'verb', id: prev.id })}>
              <ArrowLeft aria-hidden="true" />
              <span lang="es">{prev.es}</span>
            </a>
          </Button>
        ) : null}
        {next ? (
          <Button asChild variant="primary" className="ml-auto">
            <a href={hrefFor({ name: 'verb', id: next.id })}>
              <span lang="es">{next.es}</span>
              <ArrowRight aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </nav>
    </article>
  );
}
