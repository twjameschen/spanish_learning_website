import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { VerbListPage, VerbPage } from './VerbPage';
import { allVerbs, getVerb } from '@/content';
import { SIMPLE_TENSES, PERSONS, TENSE_LABEL } from '@/content/schema';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 動詞變位表。
 *
 * 存在的理由：105 個動詞每一個都有 7 個簡單時態（3675 個形式），
 * 但在這一頁之前畫面上唯一印得出來的是單字表的現在式 —— 只看得到 525 個。
 * 而 73 題變位題裡有 44 題考的不是現在式，等於考了一張查不到的表。
 */

const search = (value: string) => {
  const input = screen.getByRole('textbox', { name: /搜尋動詞|Search verbs/ });
  fireEvent.change(input, { target: { value } });
};

const rows = () => screen.queryAllByRole('listitem');

describe('動詞列表', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
  });

  it('印出全部 105 個動詞', () => {
    render(<VerbListPage />);
    expect(rows()).toHaveLength(allVerbs.length);
    expect(allVerbs.length).toBe(105);
  });

  it('等級篩得動', () => {
    render(<VerbListPage />);
    fireEvent.click(screen.getByRole('button', { name: 'A0' }));
    const shown = rows().length;
    expect(shown).toBe(allVerbs.filter((v) => v.level === 'A0').length);
    expect(shown).toBeLessThan(allVerbs.length);
  });

  it('規則／不規則篩得動', () => {
    render(<VerbListPage />);
    fireEvent.click(screen.getByRole('button', { name: /^不規則$/ }));
    expect(rows()).toHaveLength(allVerbs.filter((v) => v.irregular).length);
  });

  /*
   * 這條是這一輪的重點：讀到 fui 想查原形時，以前完全找不到。
   * 而 fui 同時屬於 ser 和 ir，正是最需要幫忙的那種歧義。
   */
  it('打變位形式 fui，ser 與 ir 兩列都出現並標出時態人稱', () => {
    render(<VerbListPage />);
    search('fui');

    const texts = rows().map((li) => li.textContent ?? '');
    expect(texts.some((x) => x.startsWith('ser'))).toBe(true);
    expect(texts.some((x) => x.startsWith('ir'))).toBe(true);
    // 而且要說清楚 fui 是什麼形式，不是只把卡片列出來
    expect(texts.every((x) => x.includes('fui＝簡單過去式・我'))).toBe(true);
  });

  it('反身動詞：打 llamo 也找得到 llamarse', () => {
    render(<VerbListPage />);
    search('llamo');
    expect(rows().map((li) => li.textContent ?? '').some((x) => x.startsWith('llamarse'))).toBe(
      true,
    );
  });

  it('找不到東西時給空狀態，不是一片空白', () => {
    render(<VerbListPage />);
    search('zzzzzz');
    expect(rows()).toHaveLength(0);
    expect(screen.getByText(/沒有符合的動詞/)).toBeTruthy();
  });

  it('反身動詞在列表上看得出來 —— 以前完全沒有標記', () => {
    render(<VerbListPage />);
    search('llamarse');
    expect(within(rows()[0]!).getByText('反身')).toBeTruthy();
  });
});

describe('單一動詞的變位表', () => {
  beforeEach(() => {
    useSettingsStore.setState({ locale: 'zh' });
  });

  it('七個時態的標題都在，每個時態五個人稱都印出來', () => {
    render(<VerbPage id="ser" />);
    const ser = getVerb('ser')!;

    for (const tense of SIMPLE_TENSES) {
      expect(screen.getByText(TENSE_LABEL[tense].es)).toBeTruthy();
      for (const person of PERSONS) {
        expect(screen.getAllByText(ser.conjugations[tense]![person]).length).toBeGreaterThan(0);
      }
    }
  });

  it('不規則動詞印的是資料裡的形式，不是照規則推出來的', () => {
    render(<VerbPage id="ser" />);
    // 規則推導會得到 *seí；資料裡是 fui
    expect(screen.getAllByText('fui').length).toBeGreaterThan(0);
    expect(screen.queryByText('seí')).toBeNull();
    expect(screen.getAllByText('era').length).toBeGreaterThan(0);
  });

  it('過去分詞與現在分詞印得出來 —— 以前沒有任何地方看得到', () => {
    render(<VerbPage id="ser" />);
    expect(screen.getByText('sido')).toBeTruthy();
    expect(screen.getByText('siendo')).toBeTruthy();
  });

  it('有命令式的動詞會印出命令式', () => {
    render(<VerbPage id="hablar" />);
    expect(screen.getByText('命令式')).toBeTruthy();
    expect(screen.getAllByText(getVerb('hablar')!.imperativo!.tu!).length).toBeGreaterThan(0);
  });

  /*
   * haber / poder / preocuparse 的資料裡沒有命令式。
   * 不補、不編 —— 整區不顯示，而不是印一張空表。
   */
  it.each(['haber', 'poder', 'preocuparse'])('%s 沒有命令式就整區不顯示', (id) => {
    expect(getVerb(id)!.imperativo).toBeUndefined();
    render(<VerbPage id={id} />);
    expect(screen.queryByText('命令式')).toBeNull();
  });

  it('連得到練過這個動詞的課', () => {
    render(<VerbPage id="ser" />);
    expect(screen.getByText(/練過這個動詞的課/)).toBeTruthy();
  });

  it('找不到的 id 給錯誤畫面與回列表的出口，不是白畫面', () => {
    render(<VerbPage id="zzzzz" />);
    expect(screen.getByText(/找不到這個動詞/)).toBeTruthy();
    expect(screen.getByText(/zzzzz/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /回動詞列表/ })).toBeTruthy();
  });

  it('切成英文時說明跟著換，西班牙文本身不動', () => {
    const { rerender } = render(<VerbPage id="ser" />);
    expect(screen.getByText('現在式')).toBeTruthy();

    useSettingsStore.setState({ locale: 'en' });
    rerender(<VerbPage id="ser" />);

    expect(screen.getByText('present')).toBeTruthy();
    expect(screen.queryByText('現在式')).toBeNull();
    // 要學的東西不隨語言改變
    expect(screen.getAllByText('fui').length).toBeGreaterThan(0);
  });
});
