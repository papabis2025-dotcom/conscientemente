export interface IdeTheme {
  id: string;
  name: string;
  description: string;
  mode: 'dark' | 'light';
  bg: string;
  surface: string;
  border: string;
  accent: string;
  secondary: string;
  tag: string;
}

export const IDE_THEMES: IdeTheme[] = [
  {
    id: 'antigravity-dark',
    name: 'Antigravity Dark',
    description: 'Grafite neutro e elegante, padrão da IDE.',
    mode: 'dark',
    bg: '#18181b',
    surface: '#27272a',
    border: '#3f3f46',
    accent: '#6366f1',
    secondary: '#38bdf8',
    tag: 'Padrão IDE'
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Luzes noturnas de Downtown Tokyo em azul profundo.',
    mode: 'dark',
    bg: '#1a1b26',
    surface: '#24283b',
    border: '#414868',
    accent: '#7aa2f7',
    secondary: '#bb9af7',
    tag: 'Mais Popular'
  },
  {
    id: 'tokyo-storm',
    name: 'Tokyo Night Storm',
    description: 'Variante tempestade com azul ardósia refinado.',
    mode: 'dark',
    bg: '#24283b',
    surface: '#1f2335',
    border: '#3b4261',
    accent: '#7aa2f7',
    secondary: '#7dcfff',
    tag: 'Foco Suave'
  },
  {
    id: 'synthwave',
    name: "SynthWave '84",
    description: 'Cyberpunk retro anos 80 com neon magenta e ciano.',
    mode: 'dark',
    bg: '#262335',
    surface: '#34294f',
    border: '#493e6b',
    accent: '#ff7edb',
    secondary: '#36f9f6',
    tag: 'Neon Cyberpunk'
  },
  {
    id: 'abyss',
    name: 'Abyss',
    description: 'Azul oceano profundo de altíssimo contraste.',
    mode: 'dark',
    bg: '#000c18',
    surface: '#051336',
    border: '#0b2559',
    accent: '#007acc',
    secondary: '#2b7489',
    tag: 'Oceano Profundo'
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'Visual icônico com preto e realces vibrantes.',
    mode: 'dark',
    bg: '#272822',
    surface: '#3e3d32',
    border: '#49483e',
    accent: '#a6e22e',
    secondary: '#f92672',
    tag: 'Clássico Dev'
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    description: 'Verde petróleo ergonomicamente calibrado para os olhos.',
    mode: 'dark',
    bg: '#002b36',
    surface: '#073642',
    border: '#0d4757',
    accent: '#2aa198',
    secondary: '#b58900',
    tag: 'Ergonômico'
  },
  {
    id: 'antigravity-light',
    name: 'Antigravity Light',
    description: 'Branco estelar limpo com contrastes modernos.',
    mode: 'light',
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    accent: '#4f46e5',
    secondary: '#0284c7',
    tag: 'Claro Moderno'
  },
  {
    id: 'tokyo-light',
    name: 'Tokyo Night Light',
    description: 'Versão diurna suave e elegante do Tokyo Night.',
    mode: 'light',
    bg: '#e1e2e7',
    surface: '#d5d6db',
    border: '#cfc9c2',
    accent: '#34548a',
    secondary: '#8c4351',
    tag: 'Claro Elegante'
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    description: 'Fundo creme/papiro com contraste suave para leitura.',
    mode: 'light',
    bg: '#fdf6e3',
    surface: '#eee8d5',
    border: '#e0d6b9',
    accent: '#268bd2',
    secondary: '#b58900',
    tag: 'Leitura Suave'
  }
];

export const IDE_THEME_STORAGE_KEY = 'cn_ide_theme';

export const getIdeThemeById = (id: string | null | undefined): IdeTheme | undefined => {
  if (!id) return undefined;
  return IDE_THEMES.find(t => t.id === id);
};

export const applyIdeThemeTokens = (theme: IdeTheme | null) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (!theme) {
    root.removeAttribute('data-ide-theme');
    root.style.removeProperty('--ide-theme-bg');
    root.style.removeProperty('--ide-theme-surface');
    root.style.removeProperty('--ide-theme-border');
    root.style.removeProperty('--ide-theme-accent');
    root.style.removeProperty('--ide-theme-secondary');
    return;
  }

  root.setAttribute('data-ide-theme', theme.id);
  root.style.setProperty('--ide-theme-bg', theme.bg);
  root.style.setProperty('--ide-theme-surface', theme.surface);
  root.style.setProperty('--ide-theme-border', theme.border);
  root.style.setProperty('--ide-theme-accent', theme.accent);
  root.style.setProperty('--ide-theme-secondary', theme.secondary);
};
