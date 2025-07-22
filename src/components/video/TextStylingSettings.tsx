"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipSettings } from "./types";
import { SavedClip } from "@/app/page";

export interface TextStylingSettingsProps {
  clipId: string;
  clip: SavedClip;
  settings: ClipSettings;
  onSettingsChange: (updates: Partial<ClipSettings>) => void;
  preset?: string;
  onPresetChange?: (preset: string) => void;
}

export function TextStylingSettings({ clipId, clip, settings, onSettingsChange, preset, onPresetChange }: TextStylingSettingsProps) {
  // Local state for hex inputs to allow smooth typing
  const [titleColorHex, setTitleColorHex] = useState(settings.topTextColor ?? "#FFFFFF");
  const [creditsColorHex, setCreditsColorHex] = useState(settings.bottomTextColor ?? "#FFFFFF");
  const [captionColorHex, setCaptionColorHex] = useState(settings.captionColor ?? "#FFFFFF");

  // Update local state when settings change (e.g., from color picker)
  useEffect(() => {
    setTitleColorHex(settings.topTextColor ?? "#FFFFFF");
  }, [settings.topTextColor]);

  useEffect(() => {
    setCreditsColorHex(settings.bottomTextColor ?? "#FFFFFF");
  }, [settings.bottomTextColor]);

  useEffect(() => {
    setCaptionColorHex(settings.captionColor ?? "#FFFFFF");
  }, [settings.captionColor]);

  // Helper function to validate and apply hex color
  const applyHexColor = (hexValue: string, settingKey: keyof ClipSettings) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
      onSettingsChange({ [settingKey]: hexValue });
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold flex items-center gap-2 text-lg mb-4">
          <span role="img" aria-label="palette">🎨</span> Text Styling Options
        </h4>
        
        {/* Preset Menu */}
        {preset && onPresetChange && (
          <div className="flex items-center gap-2 mb-4">
            <label className="font-medium">Preset:</label>
            <select
              value={preset}
              onChange={e => onPresetChange(e.target.value)}
              className="rounded border px-2 py-1 bg-white dark:bg-[#2A2A2A] border-gray-200 dark:border-[#333333]"
            >
              <option value="Custom">Custom</option>
              <option value="101xFounders">101xFounders</option>
              <option value="IndianFoundersco">IndianFoundersco</option>
              <option value="BIP">BIP</option>
              <option value="Lumen Links">Lumen Links</option>
              <option value="GoodClipsMatter">GoodClipsMatter</option>
              <option value="JabWeWatched">JabWeWatched</option>
            </select>
          </div>
        )}
      </div>

      {/* Top Text */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Video Title
        </label>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
          value={settings.topText ?? ""}
          onChange={(e) => onSettingsChange({ topText: e.target.value })}
          placeholder="Enter Video Title"
        />
      </div>

      {/* Bottom Text */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Video Credits
        </label>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
          value={settings.bottomText ?? ""}
          onChange={(e) => onSettingsChange({ bottomText: e.target.value })}
          placeholder="Enter Credits"
        />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Title Color</label>
          <div className="flex items-center gap-2">
          <input
            type="color"
            className="w-10 h-10 p-0 border-none rounded"
            value={settings.topTextColor ?? "#FFFFFF"}
            onChange={(e) => onSettingsChange({ topTextColor: e.target.value })}
          />
            <input
              type="text"
              className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-xs font-mono"
              value={titleColorHex}
              onChange={(e) => {
                const hexValue = e.target.value;
                setTitleColorHex(hexValue);
                // Update settings immediately if valid hex
                applyHexColor(hexValue, 'topTextColor');
              }}
              onBlur={() => {
                // On blur, revert to current setting if invalid
                if (!applyHexColor(titleColorHex, 'topTextColor')) {
                  setTitleColorHex(settings.topTextColor ?? "#FFFFFF");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyHexColor(titleColorHex, 'topTextColor');
                }
              }}
              placeholder="#FFFFFF"
              maxLength={7}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Credits Color</label>
          <div className="flex items-center gap-2">
          <input
            type="color"
            className="w-10 h-10 p-0 border-none rounded"
            value={settings.bottomTextColor ?? "#FFFFFF"}
            onChange={(e) => onSettingsChange({ bottomTextColor: e.target.value })}
          />
            <input
              type="text"
              className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-xs font-mono"
              value={creditsColorHex}
              onChange={(e) => {
                const hexValue = e.target.value;
                setCreditsColorHex(hexValue);
                // Update settings immediately if valid hex
                applyHexColor(hexValue, 'bottomTextColor');
              }}
              onBlur={() => {
                // On blur, revert to current setting if invalid
                if (!applyHexColor(creditsColorHex, 'bottomTextColor')) {
                  setCreditsColorHex(settings.bottomTextColor ?? "#FFFFFF");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyHexColor(creditsColorHex, 'bottomTextColor');
                }
              }}
              placeholder="#FFFFFF"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {/* Font Sizes with Bold/Italic inline */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Title Font Size</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
              value={settings.topTextFontSize ?? 60}
              onChange={(e) => onSettingsChange({ topTextFontSize: parseInt(e.target.value || "0", 10) })}
            />
            <button
              type="button"
              className={`px-2 py-1 rounded text-sm font-bold ${settings.topTextBold ? 'bg-[#7C3AED] text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
              onClick={() => onSettingsChange({ topTextBold: !settings.topTextBold })}
            >B</button>
            <button
              type="button"
              className={`px-2 py-1 rounded text-sm italic ${settings.topTextItalic ? 'bg-[#7C3AED] text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
              onClick={() => onSettingsChange({ topTextItalic: !settings.topTextItalic })}
            >I</button>
          </div>
        </div>

        {/* Bottom */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Credits Font Size</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
              value={settings.bottomTextFontSize ?? 50}
              onChange={(e) => onSettingsChange({ bottomTextFontSize: parseInt(e.target.value || "0", 10) })}
            />
            <button
              type="button"
              className={`px-2 py-1 rounded text-sm font-bold ${settings.bottomTextBold ? 'bg-[#7C3AED] text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
              onClick={() => onSettingsChange({ bottomTextBold: !settings.bottomTextBold })}
            >B</button>
            <button
              type="button"
              className={`px-2 py-1 rounded text-sm italic ${settings.bottomTextItalic ? 'bg-[#7C3AED] text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
              onClick={() => onSettingsChange({ bottomTextItalic: !settings.bottomTextItalic })}
            >I</button>
          </div>
        </div>
      </div>
      
      {/* Caption Styling */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Burned-In Caption Styling
          </label>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Caption Color</label>
                  <div className="flex items-center gap-2">
                      <input
                          type="color"
                          className="w-10 h-10 p-0 border-none rounded"
                          value={settings.captionColor ?? "#FFFFFF"}
                          onChange={(e) => onSettingsChange({ captionColor: e.target.value })}
                      />
                      <input
                          type="text"
                          className="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-xs font-mono"
                          value={captionColorHex}
                          onChange={(e) => {
                              const hexValue = e.target.value;
                              setCaptionColorHex(hexValue);
                              // Update settings immediately if valid hex
                              applyHexColor(hexValue, 'captionColor');
                          }}
                          onBlur={() => {
                              // On blur, revert to current setting if invalid
                              if (!applyHexColor(captionColorHex, 'captionColor')) {
                                  setCaptionColorHex(settings.captionColor ?? "#FFFFFF");
                              }
                          }}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  applyHexColor(captionColorHex, 'captionColor');
                              }
                          }}
                          placeholder="#FFFFFF"
                          maxLength={7}
                      />
                  </div>
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Caption Font Size</label>
                  <input
                      type="number"
                      className="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
                      value={settings.captionFontSize ?? 48}
                      onChange={(e) => onSettingsChange({ captionFontSize: parseInt(e.target.value || "0", 10) })}
                  />
              </div>
          </div>

      </div>

      {/* Font Families */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Title Font</label>
          <Select
            value={settings.titleFontFamily ?? "Inter-Medium"}
            onValueChange={(value: string) => onSettingsChange({ titleFontFamily: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter-Medium">Inter</SelectItem>
              <SelectItem value="Roboto-Medium">Roboto</SelectItem>
              <SelectItem value="NotoSans-Regular">Noto Sans</SelectItem>
              <SelectItem value="LibreFranklin-Regular">Libre Franklin</SelectItem>
              <SelectItem value="Manrope-Bold">Manrope Bold</SelectItem>
              <SelectItem value="Manrope-Medium">Manrope Medium</SelectItem>
              <SelectItem value="Poppins-Regular">Poppins</SelectItem>
              <SelectItem value="Spectral-Bold">Spectral Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Caption Font</label>
          <Select
            value={settings.captionFontFamily ?? "Roboto-Medium"}
            onValueChange={(value: string) => onSettingsChange({ captionFontFamily: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Roboto-Medium">Roboto</SelectItem>
              <SelectItem value="Inter-Medium">Inter</SelectItem>
              <SelectItem value="NotoSans-Regular">Noto Sans</SelectItem>
              <SelectItem value="LibreFranklin-Regular">Libre Franklin</SelectItem>
              <SelectItem value="TrebuchetMS-Italic">Trebuchet MS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Credits Font</label>
          <Select
            value={settings.creditsFontFamily ?? "Inter-Medium"}
            onValueChange={(value: string) => onSettingsChange({ creditsFontFamily: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter-Medium">Inter</SelectItem>
              <SelectItem value="LibreFranklin-Regular">Libre Franklin</SelectItem>
              <SelectItem value="NotoSans-Regular">Noto Sans</SelectItem>
              <SelectItem value="Roboto-Medium">Roboto</SelectItem>
              <SelectItem value="Poppins-Regular">Poppins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}