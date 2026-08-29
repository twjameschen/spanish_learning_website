import { describe, it, expect } from 'vitest';
import {
  foldAccents, normalizeAnswer, matchesAnswer, isAccentImperfect, tokensMatch,
} from './normalize';

describe('重音折疊', () => {
  it('折掉母音上的銳音符', () => {
    expect(foldAccents('café')).toBe('cafe');
    expect(foldAccents('teléfono')).toBe('telefono');
    expect(foldAccents('está')).toBe('esta');
    expect(foldAccents('PAÍS')).toBe('PAIS');
  });

  it('折掉 ü 的分音符', () => {
    expect(foldAccents('vergüenza')).toBe('verguenza');
  });

  /**
   * 這是整個模組存在的理由：ñ 是獨立字母，不是加了記號的 n。
   * 折掉它會讓 ano（肛門）被判定等於 año（年）。
   */
  it('絕對不動 ñ —— año 不能變成 ano', () => {
    expect(foldAccents('año')).toBe('año');
    expect(foldAccents('niño')).toBe('niño');
    expect(foldAccents('ÑAÑO')).toBe('ÑAÑO');
    expect(foldAccents('año')).not.toBe('ano');
  });

  it('ñ 與重音同時出現時各自處理正確', () => {
    expect(foldAccents('compañía')).toBe('compañia');
  });
});

describe('答案正規化', () => {
  it('轉小寫並收斂空白', () => {
    expect(normalizeAnswer('  El   Libro  ')).toBe('el libro');
  });

  it('拿掉前置問號驚嘆號與句末標點', () => {
    expect(normalizeAnswer('¿Cómo estás?')).toBe('como estas');
    expect(normalizeAnswer('¡Hola!')).toBe('hola');
    expect(normalizeAnswer('Soy Ana.')).toBe('soy ana');
  });

  it('保留句中的逗號', () => {
    expect(normalizeAnswer('Buenos días, señora')).toBe('buenos dias, señora');
  });
});

describe('比對', () => {
  it('重音與大小寫差異都算答對', () => {
    expect(matchesAnswer('el cafe esta caliente', ['El café está caliente'])).toBe(true);
    expect(matchesAnswer('EL CAFÉ ESTÁ CALIENTE', ['El café está caliente'])).toBe(true);
  });

  it('接受多種答法中的任一個', () => {
    const accept = ['Soy de Taiwán', 'Yo soy de Taiwán'];
    expect(matchesAnswer('yo soy de taiwan', accept)).toBe(true);
    expect(matchesAnswer('soy de taiwan', accept)).toBe(true);
  });

  it('ñ 打成 n 算答錯 —— 這是真的不同的字', () => {
    expect(matchesAnswer('Tengo treinta anos', ['Tengo treinta años'])).toBe(false);
    expect(matchesAnswer('Tengo treinta años', ['Tengo treinta años'])).toBe(true);
  });

  it('空輸入永遠算錯', () => {
    expect(matchesAnswer('', ['hola'])).toBe(false);
    expect(matchesAnswer('   ', ['hola'])).toBe(false);
  });

  it('錯字仍算錯，不會因為折疊而放水', () => {
    expect(matchesAnswer('el libro esta en la mes', ['El libro está en la mesa'])).toBe(false);
  });
});

describe('重音不完整的提示', () => {
  it('少打重音符號時回報「答對但寫法不完整」', () => {
    expect(isAccentImperfect('el cafe esta caliente', 'El café está caliente.')).toBe(true);
  });

  it('完全正確時不提示', () => {
    expect(isAccentImperfect('El café está caliente.', 'El café está caliente.')).toBe(false);
  });

  it('答錯時不提示（那要走答錯的流程）', () => {
    expect(isAccentImperfect('el perro', 'El café está caliente.')).toBe(false);
  });
});

describe('語序重組比對', () => {
  it('順序正確就算對，忽略重音差異', () => {
    expect(tokensMatch(['Yo', 'soy', 'de', 'Taiwan'], ['Yo', 'soy', 'de', 'Taiwán'])).toBe(true);
  });

  it('順序錯誤算錯', () => {
    expect(tokensMatch(['soy', 'Yo', 'de', 'Taiwán'], ['Yo', 'soy', 'de', 'Taiwán'])).toBe(false);
  });

  it('長度不同算錯', () => {
    expect(tokensMatch(['Yo', 'soy'], ['Yo', 'soy', 'de', 'Taiwán'])).toBe(false);
  });
});
