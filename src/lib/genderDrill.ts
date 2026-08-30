import type { Exercise, Word } from '@/content/schema';
import { allWords, topicLabel } from '@/content';
import { shuffleSeeded } from './shuffle';

/**
 * 依主題即時產生陰陽性分類題。
 *
 * 為什麼不是把三十組手寫進課文 JSON：
 * 陰陽性分類是**詞彙**練習，不是文法練習。把一組 el/la 分類塞進
 * 「si 條件句」或「過去虛擬式」那種課，跟該課教的東西毫無關係；
 * 而且每次擴充單字表都要回頭改題目。改成依主題產生之後，
 * 主題有多少名詞就能出多少組，加新字自動跟上。
 *
 * 課文裡仍然保留手寫的分類題，但只放在性別與一致性真的在教的課，
 * 而且每一組打的是不同的陷阱（-ma 希臘字、-e 結尾、el agua…），
 * 那些是教學內容，不能機器產生。
 */

export const GENDER_DRILL_PREFIX = 'gender-';

/** 一組要幾個字。太少看不出規律，太多會超過限時。 */
const SET_SIZE = 8;
/** 兩種性別各至少要幾個 —— 全同一性別的話「分類」就沒有意義了 */
const MIN_PER_GENDER = 2;
const SECONDS = 75;

/**
 * 能拿來分類的名詞。
 * 排除 `genderSortExempt` —— el/la estudiante 兩個都對、el agua 陰性卻配 el，
 * 這兩種字問「配 el 還是 la」都會判錯正確答案。
 */
const isSortableNoun = (w: Word): boolean =>
  w.pos === 'noun' && Boolean(w.gender) && !w.genderSortExempt;

/** 某個主題底下所有可用來分類的名詞 */
export function nounsForTopic(topic: string): Word[] {
  return allWords.filter((w) => w.topic === topic && isSortableNoun(w));
}

/** 這個主題出得出一組嗎（要有足夠的字，而且兩性都要有） */
export function canDrillTopic(topic: string): boolean {
  const nouns = nounsForTopic(topic);
  if (nouns.length < SET_SIZE) return false;
  const m = nouns.filter((w) => w.gender === 'm').length;
  return m >= MIN_PER_GENDER && nouns.length - m >= MIN_PER_GENDER;
}

/** 所有出得出一組的主題 */
export function drillableTopics(): string[] {
  return [...new Set(allWords.map((w) => w.topic))].filter(canDrillTopic).sort();
}

/**
 * 挑出一組，並**保證兩性各至少 MIN_PER_GENDER 個**。
 * 純隨機抽有機會抽到八個全陽性，那道題就變成「全部拖到同一邊」，練不到東西。
 */
function pickBalanced(nouns: Word[], seedText: string): Word[] {
  // 種子用主題名稱而不是日期：同一個主題每次進來都是同一組字，這樣才記得起來
  const shuffled = shuffleSeeded(nouns, seedText);
  const masc = shuffled.filter((w) => w.gender === 'm');
  const fem = shuffled.filter((w) => w.gender === 'f');
  if (masc.length < MIN_PER_GENDER || fem.length < MIN_PER_GENDER) return [];

  // 先各取保底的數量，剩下的名額再由兩邊依洗牌順序補滿
  const picked = [...masc.slice(0, MIN_PER_GENDER), ...fem.slice(0, MIN_PER_GENDER)];
  const rest = shuffled.filter((w) => !picked.includes(w));
  picked.push(...rest.slice(0, SET_SIZE - picked.length));
  // 再洗一次，否則保底的四個永遠排在最前面
  return shuffleSeeded(picked, `${seedText}-order`);
}

/** 由主題產生一題陰陽性分類；主題不夠出一組時回傳 null */
export function buildGenderDrill(topic: string): Exercise | null {
  const nouns = nounsForTopic(topic);
  if (nouns.length < SET_SIZE) return null;
  const picked = pickBalanced(nouns, topic);
  if (picked.length < SET_SIZE) return null;

  const label = topicLabel(topic);
  return {
    id: `${GENDER_DRILL_PREFIX}${topic}`,
    type: 'genderSort',
    wordIds: picked.map((w) => w.id),
    seconds: SECONDS,
    difficulty: 'medium',
    explain: {
      zh: `這一組是「${label.zh}」主題的名詞。性別無法從字義推測，必須跟冠詞一起背 —— 背 la mesa，不要背 mesa。`,
      en: `This set comes from the “${label.en}” topic. Gender can’t be guessed from meaning, so learn each noun together with its article — learn la mesa, not mesa.`,
    },
  };
}

/** 產生所有主題的分類題，依名詞數由多到少排 */
export function buildAllGenderDrills(): Exercise[] {
  return drillableTopics()
    .map((t) => buildGenderDrill(t))
    .filter((e): e is Exercise => e !== null)
    .sort((a, b) =>
      nounsForTopic(b.id.slice(GENDER_DRILL_PREFIX.length)).length
      - nounsForTopic(a.id.slice(GENDER_DRILL_PREFIX.length)).length);
}

/** 這個 drill id 是不是陰陽性分類（DrillPage 用來分流） */
export const isGenderDrillId = (id: string): boolean => id.startsWith(GENDER_DRILL_PREFIX);

/** 從 drill id 取回主題名稱 */
export const topicFromDrillId = (id: string): string => id.slice(GENDER_DRILL_PREFIX.length);
