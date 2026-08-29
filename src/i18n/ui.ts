import type { Localized } from '@/content/schema';

/**
 * 介面字串。內容（單字、課文、題目）的雙語存在 JSON 裡，
 * 這裡只放 UI chrome —— 按鈕、標題、狀態訊息。
 *
 * 刻意用扁平的物件而不是巢狀 key 路徑：TypeScript 能直接檢查 key 是否存在，
 * 打錯字在編譯期就會被抓到，不必等到執行期看到 "missing translation"。
 */
export const UI = {
  // 品牌與導覽
  appName: { zh: 'Camino a Quito', en: 'Camino a Quito' },
  appTagline: { zh: '西班牙文之路 · 拉美變體', en: 'The road to Spanish · Latin American' },
  navHome: { zh: '首頁', en: 'Home' },
  navVocab: { zh: '單字表', en: 'Vocabulary' },
  navLessons: { zh: '課程', en: 'Lessons' },

  // 主題與語言
  themeLight: { zh: '淺色', en: 'Light' },
  themeDark: { zh: '深色', en: 'Dark' },
  themeSystem: { zh: '跟隨系統', en: 'System' },
  themeToggle: { zh: '切換主題', en: 'Switch theme' },
  themeCurrent: { zh: '目前', en: 'currently' },
  langToggle: { zh: '切換語言', en: 'Switch language' },
  langCurrent: { zh: '中文', en: 'English' },

  // 首頁
  heroTitle: { zh: '¡Bienvenido al camino!', en: '¡Bienvenido al camino!' },
  heroBody: {
    zh: '從台北出發，經邁阿密轉機，抵達基多、昆卡，最後到加拉巴哥。這條路上的西班牙文全部是拉丁美洲用法 —— 沒有 vosotros，沒有 /θ/。',
    en: 'Starting in Taipei, connecting through Miami, then on to Quito, Cuenca and finally the Galápagos. Every bit of Spanish on this road is Latin American — no vosotros, no /θ/.',
  },
  progress: { zh: '進度', en: 'Progress' },
  journeyTitle: { zh: '旅程', en: 'The journey' },
  journeyDesc: {
    zh: '五個城市，五組課程。目前開放 {n} 站。',
    en: 'Five cities, five sets of lessons. {n} currently open.',
  },
  lessonsCount: { zh: '{n} 課', en: '{n} lessons' },
  notOpenYet: { zh: '尚未開放', en: 'Not open yet' },

  // 卡片
  vocabCardDesc: {
    zh: 'A0 到 B1 共 {n} 個字，全部附例句與翻譯。名詞一律標 el / la。',
    en: '{n} words from A0 to B1, each with an example sentence and translation. Every noun is tagged el / la.',
  },
  lessonsCardDesc: {
    zh: '{l} 課、{e} 題。每一課都點出最容易犯的錯。',
    en: '{l} lessons, {e} exercises. Every lesson names the mistakes that are easiest to make.',
  },

  // 儲存
  storageTitle: { zh: '儲存方式', en: 'Storage' },
  storageDetecting: { zh: '偵測中…', en: 'Detecting…' },
  storageIdb: { zh: '進度會自動保存，容量充裕。', en: 'Progress saves automatically, with plenty of room.' },
  storageLocal: {
    zh: '會自動保存，但約 5MB 上限，建議定期匯出。',
    en: 'Saves automatically, but with a ~5MB limit — export a backup now and then.',
  },
  storageMemory: {
    zh: '瀏覽器不讓本頁寫入資料，關掉分頁就沒了，務必手動匯出。',
    en: "This browser won't let the page store data. Everything is lost when the tab closes, so export manually.",
  },
  memoryLabel: { zh: '記憶體（暫存）', en: 'In memory (temporary)' },
  bannerTitle: {
    zh: '這個瀏覽器不讓本頁儲存資料，進度不會自動保存。',
    en: "This browser won't let the page store data, so progress won't be saved automatically.",
  },
  bannerBody: {
    zh: '常見原因是無痕／隱私模式、瀏覽器停用了網站資料，或儲存配額已滿。離開前請按「匯出進度」，下次再用「匯入進度」接回來。',
    en: 'Common causes are private browsing, site data being disabled, or a full storage quota. Export your progress before leaving and import it again next time.',
  },
  bannerFile: {
    zh: '你是直接開啟本機檔案（file://）。改用 python -m http.server 開啟通常就能正常保存（見 README）。',
    en: "You've opened the file directly (file://). Serving it with python -m http.server usually restores saving — see the README.",
  },

  // 備份
  exportBtn: { zh: '匯出進度', en: 'Export progress' },
  importBtn: { zh: '匯入進度', en: 'Import progress' },
  exportTitle: { zh: '把全部學習進度存成一個 JSON 檔', en: 'Save all your progress to a single JSON file' },
  importTitle: { zh: '從先前匯出的 JSON 檔還原進度', en: 'Restore progress from a previously exported JSON file' },
  exportOk: { zh: '已匯出 {n} 筆資料。', en: 'Exported {n} entries.' },
  exportEmpty: { zh: '目前還沒有任何進度可以匯出。', en: 'There is no progress to export yet.' },
  importOk: {
    zh: '已匯入 {n} 筆資料（備份時間 {t}）。重新整理後生效。',
    en: 'Imported {n} entries (backed up {t}). Reload to apply.',
  },
  exportFailed: { zh: '匯出失敗。', en: 'Export failed.' },
  importFailed: { zh: '匯入失敗。', en: 'Import failed.' },
  manualCopy: {
    zh: '瀏覽器擋下了自動下載，請手動全選複製以下內容存成 .json 檔：',
    en: 'The browser blocked the download. Select and copy the text below and save it as a .json file:',
  },

  // 快照
  snapshotTitle: { zh: '自動快照', en: 'Automatic snapshots' },
  snapshotDesc: {
    zh: '每次開站自動存一份，每天一份、保留最近 3 天。瀏覽器誤清資料時可以救回來。',
    en: 'One snapshot per day, taken when you open the app, keeping the last 3 days. A safety net if the browser clears your data.',
  },
  snapshotEmpty: { zh: '還沒有任何快照', en: 'No snapshots yet' },
  snapshotEmptyHint: {
    zh: '開始練習之後，每天開站都會自動存一份，保留最近 3 天。',
    en: 'Once you start practising, a snapshot is saved each day you open the app, keeping the last 3.',
  },
  entries: { zh: '{n} 筆資料', en: '{n} entries' },

  // 單字表
  vocabTitle: { zh: '單字表', en: 'Vocabulary' },
  vocabSubtitle: {
    zh: 'A0 到 B1 共 {n} 個字。名詞一律標上 el / la —— 請養成連冠詞一起記的習慣。',
    en: '{n} words from A0 to B1. Every noun is tagged el / la — make a habit of learning the article with the word.',
  },
  searchPlaceholder: {
    zh: '搜尋西班牙文或中文（可忽略重音，打 cafe 也找得到 café）',
    en: 'Search Spanish or English (accents optional — cafe finds café)',
  },
  searchLabel: { zh: '搜尋單字', en: 'Search words' },
  matchCount: { zh: '符合 {n} 個字', en: '{n} matching words' },
  clearFilters: { zh: '清除篩選', en: 'Clear filters' },
  noMatch: { zh: '沒有符合的單字', en: 'No matching words' },
  noMatchHint: {
    zh: '換個關鍵字試試，或按上面的「清除篩選」回到完整清單。',
    en: 'Try a different search, or use "Clear filters" above to see the full list.',
  },
  presentTense: { zh: '現在式變化', en: 'Present tense' },
  irregular: { zh: '不規則', en: 'irregular' },
  regular: { zh: '規則', en: 'regular' },
  masculineHint: { zh: '陽性名詞（配 el / un）', en: 'Masculine noun (takes el / un)' },
  feminineHint: { zh: '陰性名詞（配 la / una）', en: 'Feminine noun (takes la / una)' },

  // 課程
  lessonsTitle: { zh: '課程', en: 'Lessons' },
  lessonsSubtitle: {
    zh: 'A0 到 B1 共 {n} 課，五座城市全部開放。照順序走，每一課都有前一課當基礎。',
    en: '{n} lessons from A0 to B1, with all five cities open. Work through them in order — each one builds on the last.',
  },
  lessonNo: { zh: '第 {n} 課', en: 'Lesson {n}' },
  rulesAndExercises: { zh: '{r} 條規則 · {e} 題', en: '{r} rules · {e} exercises' },
  backToLessons: { zh: '課程列表', en: 'All lessons' },
  strictlyStaged: { zh: '例句嚴格分級', en: 'Strictly staged examples' },
  strictlyStagedHint: {
    zh: '本課示範規則的例句只使用了本課與前置課教過的文法',
    en: 'The examples illustrating each rule use only grammar taught in this lesson or earlier ones',
  },
  pitfallsHeading: { zh: '最容易犯的錯', en: 'Common mistakes' },
  rulesHeading: { zh: '規則與例句', en: 'Rules and examples' },
  pronHeading: { zh: '發音重點', en: 'Pronunciation notes' },
  regionalHeading: { zh: '區域用法', en: 'Regional usage' },
  exercisesHeading: { zh: '練習題', en: 'Exercises' },
  exercisesCount: { zh: '（{n} 題）', en: '({n} exercises)' },
  previewNote: {
    zh: '以下是題目預覽，正確答案直接標示出來。想實際作答請按上面的「開始練習」。',
    en: 'Below is a preview with the answers shown. Use "Start practice" above to actually answer them.',
  },
  wrongAnswerExplain: { zh: '答錯時會看到的解釋', en: 'Explanation shown on a wrong answer' },
  lessonNotFound: { zh: '找不到這一課', en: 'Lesson not found' },
  lessonNotFoundHint: {
    zh: '課程代碼「{id}」不存在。可能是網址打錯了，或這一課還沒開放。',
    en: 'There is no lesson with the id "{id}". The URL may be wrong, or the lesson isn\'t open yet.',
  },
  difficultyEasy: { zh: '易', en: 'Easy' },
  difficultyMedium: { zh: '中', en: 'Medium' },
  difficultyHard: { zh: '難', en: 'Hard' },

  // 其他
  loadingStorage: { zh: '正在確認儲存方式…', en: 'Checking storage…' },
  loadingProgress: { zh: '正在載入你的進度…', en: 'Loading your progress…' },
  needsVerify: { zh: '待母語者確認', en: 'Needs native check' },
  needsVerifyHint: {
    zh: '這條區域用法我沒有百分之百把握，建議找母語者確認後再當定論使用。',
    en: "I'm not fully certain about this regional usage — worth confirming with a native speaker before relying on it.",
  },
  dailyGoal: { zh: '每日目標', en: 'Daily goal' },
  minutes: { zh: '{n} 分鐘', en: '{n} min' },
  // ---- 答題流程 ----
  correctLabel: { zh: '答對了', en: 'Correct' },
  wrongLabel: { zh: '答錯了', en: 'Not quite' },
  nextQuestion: { zh: '下一題', en: 'Next' },
  finish: { zh: '完成', en: 'Finish' },
  check: { zh: '檢查', en: 'Check' },
  // 送出鍵只有圖示，需要可讀出來的名字（螢幕閱讀器否則只會唸「按鈕」）
  submitAnswer: { zh: '送出答案', en: 'Submit answer' },
  clear: { zh: '清空', en: 'Clear' },
  comboCount: { zh: '連對 {n}', en: '{n} in a row' },
  correctAnswer: { zh: '正確答案', en: 'Correct answer' },
  accentImperfect: {
    zh: '答對了。正確寫法是 **{answer}** —— 重音符號要記得打。',
    en: 'Correct. The proper spelling is **{answer}** — remember the accent marks.',
  },

  // ---- 各題型的題面 ----
  flashcardToMeaning: { zh: '這個字是什麼意思？', en: 'What does this word mean?' },
  flashcardToSpanish: { zh: '西班牙文怎麼說？', en: 'How do you say this in Spanish?' },
  flashcardReveal: { zh: '翻開答案', en: 'Reveal' },
  flashcardKnew: { zh: '我記得', en: 'I knew it' },
  flashcardForgot: { zh: '想不起來', en: "Didn't know" },
  translateToSpanish: { zh: '翻成西班牙文', en: 'Translate into Spanish' },
  typeInSpanish: { zh: '用西班牙文輸入…', en: 'Type in Spanish…' },
  conjugatePrompt: { zh: '寫出對應的動詞變化', en: 'Write the matching verb form' },
  typeTheForm: { zh: '輸入動詞形式…', en: 'Type the form…' },
  wordOrderPrompt: { zh: '把字排成正確的句子', en: 'Put the words in the right order' },
  yourSentence: { zh: '你排的句子', en: 'Your sentence' },
  tapWordsToBuild: { zh: '點下面的字塊來造句', en: 'Tap the words below to build the sentence' },
  listeningPrompt: { zh: '聽完後把句子打出來', en: 'Listen, then type what you hear' },
  listeningFallbackPrompt: {
    zh: '照著下面的句子打一次',
    en: 'Type out the sentence shown below',
  },
  typeWhatYouHear: { zh: '打出你聽到的句子…', en: 'Type what you hear…' },
  playAudio: { zh: '播放', en: 'Play' },
  playSlower: { zh: '放慢再聽一次', en: 'Play more slowly' },
  noSpanishVoice: {
    zh: '這台裝置沒有西班牙文語音，改成抄寫練習。',
    en: 'No Spanish voice on this device — this becomes a copying exercise instead.',
  },
  genderSortPrompt: { zh: '限時分類：這個名詞配 el 還是 la？', en: 'Beat the clock: el or la?' },
  genderSortProgress: { zh: '{done} / {total}', en: '{done} / {total}' },
  genderSortDone: { zh: '這一輪結束', en: 'Round complete' },

  // ---- 結算 ----
  sessionDone: { zh: '這一輪完成了', en: 'Session complete' },
  sessionSummary: { zh: '答對 {correct} / {total} 題', en: '{correct} of {total} correct' },
  accuracy: { zh: '正確率', en: 'Accuracy' },
  xpEarned: { zh: '獲得 XP', en: 'XP earned' },
  bestCombo: { zh: '最長連對', en: 'Best streak' },
  practiceAgain: { zh: '再練一次', en: 'Practise again' },
  backToLesson: { zh: '回到課文', en: 'Back to lesson' },

  // ---- 練習與複習 ----
  practiceTitle: { zh: '練習', en: 'Practice' },
  startPractice: { zh: '開始練習', en: 'Start practice' },
  reviewTitle: { zh: '今日複習', en: "Today's review" },
  reviewSubtitle: { zh: '有 {n} 張卡片到期', en: '{n} cards due' },
  reviewEmpty: { zh: '今天沒有要複習的東西', en: 'Nothing due today' },
  reviewEmptyHint: {
    zh: '複習佇列由間隔重複排程決定。去上一課新的，之後這裡就會排進來。',
    en: 'The queue is set by spaced repetition. Work through a lesson and items will start appearing here.',
  },
  goToLessons: { zh: '去看課程', en: 'Browse lessons' },
  dueToday: { zh: '今天要複習 {n} 張', en: '{n} cards due today' },
  navReview: { zh: '複習', en: 'Review' },
  mastery: { zh: '掌握度', en: 'Mastery' },

  // ---- 遊戲化 ----
  achievementsTitle: { zh: '成就', en: 'Achievements' },
  achievementsProgress: { zh: '已解鎖 {done} / {total}', en: '{done} of {total} unlocked' },
  navAchievements: { zh: '成就', en: 'Achievements' },
  // 手機底部列只有五分之一個螢幕寬，長字會擠爆或折行，另給短標
  navVocabShort: { zh: '單字', en: 'Words' },
  navAchievementsShort: { zh: '成就', en: 'Awards' },
  streakDays: { zh: '連續 {n} 天', en: '{n}-day streak' },
  streakNone: { zh: '還沒開始連續紀錄', en: 'No streak yet' },
  freezesLeft: { zh: '{n} 張補簽卡', en: '{n} streak freezes' },
  freezeExplain: {
    zh: '每週會拿到一張補簽卡，漏一天時自動用掉，連續紀錄不會斷。',
    en: 'You get one streak freeze a week. Miss a day and it is spent automatically, keeping your streak alive.',
  },
  levelUp: { zh: '升級了！', en: 'Level up!' },
  levelUpTo: { zh: '達到等級 {n}', en: 'You reached level {n}' },
  achievementUnlocked: { zh: '解鎖成就', en: 'Achievement unlocked' },
  dailyGoalMet: { zh: '今天的目標達成了', en: "Today's goal is done" },
  dailyGoalProgress: { zh: '今天 {done} / {goal} 分鐘', en: '{done} of {goal} min today' },
  journeyMapTitle: { zh: '旅程地圖', en: 'Journey map' },
  nice: { zh: '好', en: 'Nice' },
} as const satisfies Record<string, Localized>;

export type UIKey = keyof typeof UI;
