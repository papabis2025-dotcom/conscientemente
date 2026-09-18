import React, { useState } from 'react';
import { PRESET_PALETTE_COLORS, getColorHex } from '../utils/colors';
import { Check, Pipette } from 'lucide-react';

interface ColorPickerPaletteProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  title?: string;
}

export const ColorPickerPalette: React.FC<ColorPickerPaletteProps> = ({
  selectedColor,
  onSelectColor,
  title = 'Cor da Disciplina'
}) => {
  const currentHex = getColorHex(selectedColor);
  const [customHex, setCustomHex] = useState(currentHex.startsWith('#') ? currentHex : '#3b82f6');

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomHex(hex);
    onSelectColor(hex);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
          {title}
        </label>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-inner"
            style={{ backgroundColor: currentHex }}
          />
          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
            {currentHex}
          </span>
        </div>
      </div>

      {/* Grade tipo colmeia / favo de mel de cores predefinidas */}
      <div className="p-3 bg-zinc-50/80 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5 justify-items-center">
          {PRESET_PALETTE_COLORS.map((c) => {
            const isSelected = currentHex.toLowerCase() === c.hex.toLowerCase();
            const clean = c.hex.replace('#', '');
            const r = parseInt(clean.substring(0, 2), 16) || 0;
            const g = parseInt(clean.substring(2, 4), 16) || 0;
            const b = parseInt(clean.substring(4, 6), 16) || 0;
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            const isLightColor = yiq >= 165;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectColor(c.hex)}
                title={`${c.name} (${c.hex})`}
                className={`w-6 h-6 rounded-lg transition-all duration-200 flex items-center justify-center cursor-pointer relative hover:scale-125 hover:z-10 shadow-xs ${
                  isLightColor ? 'border border-black/15 dark:border-white/20' : ''
                } ${
                  isSelected
                    ? 'ring-2 ring-zinc-900 dark:ring-white scale-110 shadow-md z-10'
                    : 'hover:shadow-sm opacity-90 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {isSelected && (
                  <Check
                    size={11}
                    className={isLightColor ? "text-zinc-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"}
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Linha de cor personalizada */}
        <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
            <Pipette size={11} /> Personalizar cor:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customHex}
              onChange={handleCustomColorChange}
              className="w-7 h-7 p-0 border border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden cursor-pointer bg-transparent"
              title="Clique para escolher uma cor livre"
            />
            <input
              type="text"
              value={customHex}
              onChange={(e) => {
                const val = e.target.value;
                setCustomHex(val);
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  onSelectColor(val);
                }
              }}
              placeholder="#3b82f6"
              className="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[10px] font-mono font-bold uppercase text-zinc-800 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPickerPalette;
