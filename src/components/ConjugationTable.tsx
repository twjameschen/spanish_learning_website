import { SpeakButton } from '@/components/SpeakButton';
import {
  PERSONS,
  PERSON_LABEL,
  SIMPLE_TENSES,
  TENSE_LABEL,
  type Verb,
} from '@/content/schema';
import { useT } from '@/i18n';

/**
 * 一個動詞的完整變位表。
 *
 * 資料裡 105 個動詞每一個都有 7 個簡單時態，但在這之前畫面上唯一印得出來的
 * 是單字表的現在式 —— 3675 個形式只看得到 525 個。而 73 題變位題裡有 44 題
 * 考的不是現在式，等於考了一張學習者查不到的表。
 *
 * 橫向捲動沿用 `Markish` 的作法（`-mx-1 overflow-x-auto px-1` 外層 +
 * `min-w-*` 的 table）：窄畫面讓表格自己捲，不要把整頁撐寬。
 */
export function ConjugationTable({ verb }: { verb: Verb }) {
  const { t, L } = useT();

  // schema 裡除了 presente 之外都是選填的，所以只印真的有資料的時態
  const tenses = SIMPLE_TENSES.filter((tense) => verb.conjugations[tense]);

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[34rem] border-collapse text-[15px]">
        <caption className="sr-only">
          {t('verbsTitle')}：{verb.es}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b-2 border-line px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wide text-muted"
            >
              {t('verbFormsHeading')}
            </th>
            {PERSONS.map((p) => (
              <th
                key={p}
                scope="col"
                className="border-b-2 border-line px-3 py-2 text-left text-xs font-bold text-muted"
              >
                {/* 西文人稱代名詞是要記的東西本身，中英標籤放小字在下面 */}
                <span lang="es" className="block font-extrabold text-body">
                  {PERSON_LABEL[p].es}
                </span>
                <span className="font-semibold">{L(PERSON_LABEL[p].label)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tenses.map((tense) => {
            const set = verb.conjugations[tense]!;
            return (
              <tr key={tense} className="align-top">
                <th
                  scope="row"
                  className="border-b border-line/60 px-3 py-2 text-left align-middle"
                >
                  <span lang="es" className="block text-sm font-extrabold text-body">
                    {TENSE_LABEL[tense].es}
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    {L(TENSE_LABEL[tense].label)}
                  </span>
                </th>
                {PERSONS.map((p) => (
                  <td key={p} className="border-b border-line/60 px-3 py-2">
                    <span lang="es" className="break-es font-bold text-body">
                      {set[p]}
                    </span>
                    <SpeakButton text={set[p]} className="ml-1" />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 命令式另外一張表 —— 它沒有 yo，硬塞進上面那張表只會多一欄空格。
 * 102 個動詞有命令式；`haber`、`poder`、`preocuparse` 沒有，
 * 那三個由呼叫端整區不顯示（不補、不編）。
 */
export function ImperativeTable({ verb }: { verb: Verb }) {
  const { t, L } = useT();
  const imp = verb.imperativo;
  if (!imp) return null;

  const rows = PERSONS.filter((p) => p !== 'yo' && imp[p as keyof typeof imp]);
  if (rows.length === 0) return null;

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[20rem] border-collapse text-[15px]">
        <tbody>
          {rows.map((p) => (
            <tr key={p} className="align-baseline">
              <th scope="row" className="border-b border-line/60 px-3 py-2 text-left">
                <span lang="es" className="block text-sm font-extrabold text-body">
                  {PERSON_LABEL[p].es}
                </span>
                <span className="text-xs font-semibold text-muted">
                  {L(PERSON_LABEL[p].label)}
                </span>
              </th>
              <td className="border-b border-line/60 px-3 py-2">
                <span lang="es" className="break-es font-bold text-body">
                  {imp[p as keyof typeof imp]}
                </span>
                <SpeakButton text={imp[p as keyof typeof imp]!} className="ml-1" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 px-3 text-xs text-muted">{t('verbImperativeNote')}</p>
    </div>
  );
}
