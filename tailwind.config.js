/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    /*
     * UI 規範（全站統一，不用 extend 以免混入 Tailwind 預設值）：
     * - 字級只有 3 層：display（大）、title（中）、body（小）
     * - 顏色只有 3 種：黑、白、南瓜橘
     * - 透明度只有 3 級：100%、60%（次要文字、邊框、半透明黑底）、20%（裝飾網點、霧、光暈）
     * 插圖（像素南瓜、角色、蠟燭、遊戲 3D 畫面）不受此限，顏色寫在各自元件內。
     */
    fontSize: {
      display: ['4.5rem', { lineHeight: '1' }],
      title: ['1.5rem', { lineHeight: '1.3' }],
      body: ['0.875rem', { lineHeight: '1.5' }],
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#ffffff',
      pumpkin: '#ff7b1c',
    },
    opacity: {
      0: '0',
      20: '0.2',
      60: '0.6',
      100: '1',
    },
  },
  plugins: [],
};
