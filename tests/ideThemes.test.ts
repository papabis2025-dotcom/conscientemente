import test from 'node:test';
import assert from 'node:assert/strict';
import { IDE_THEMES, getIdeThemeById, IDE_THEME_STORAGE_KEY } from '../src/utils/ideThemes.ts';

test('catálogo de temas do Antigravity IDE contém os temas principais', () => {
  assert.ok(IDE_THEMES.length >= 8);
  const tokyoNight = getIdeThemeById('tokyo-night');
  assert.ok(tokyoNight);
  assert.equal(tokyoNight?.mode, 'dark');
  assert.equal(tokyoNight?.bg, '#1a1b26');

  const synthwave = getIdeThemeById('synthwave');
  assert.ok(synthwave);
  assert.equal(synthwave?.bg, '#262335');

  const abyss = getIdeThemeById('abyss');
  assert.ok(abyss);
  assert.equal(abyss?.bg, '#000c18');

  const monokai = getIdeThemeById('monokai');
  assert.ok(monokai);
  assert.equal(monokai?.bg, '#272822');

  const solarizedDark = getIdeThemeById('solarized-dark');
  assert.ok(solarizedDark);
  assert.equal(solarizedDark?.bg, '#002b36');

  const solarizedLight = getIdeThemeById('solarized-light');
  assert.ok(solarizedLight);
  assert.equal(solarizedLight?.mode, 'light');

  const antigravityDark = getIdeThemeById('antigravity-dark');
  assert.ok(antigravityDark);
  assert.equal(antigravityDark?.bg, '#18181b');
});

test('retorna undefined para tema inexistente', () => {
  assert.equal(getIdeThemeById('tema-invalido'), undefined);
  assert.equal(getIdeThemeById(''), undefined);
  assert.equal(getIdeThemeById(null), undefined);
});

test('chave de armazenamento segue prefixo seguro cn_', () => {
  assert.ok(IDE_THEME_STORAGE_KEY.startsWith('cn_'));
});
