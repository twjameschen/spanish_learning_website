import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Camino a Quito 色票
 * primary #FF8A5B papaya 橘 / secondary #4ECDC4 加勒比綠松石 / accent #FFD166 太陽黃
 * ink #2D3047 深藍灰 / bg #FFF8F0 暖米白 / success #7BC96F / error #F26D6D
 *
 * 語意色（surface / line / body …）走 CSS 變數，在 .dark 下整組翻面，
 * 色票本身則保留字面 hex，讓 bg-primary-600 這類 hover 階調可直接使用。
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF3ED', 100: '#FFE4D6', 200: '#FFC9AD', 300: '#FFAD84',
          400: '#FF9B6E', 500: '#FF8A5B', 600: '#F26B36', 700: '#CC5223',
          800: '#A3411C', 900: '#7A3115', DEFAULT: '#FF8A5B',
        },
        secondary: {
          50: '#EDFAF9', 100: '#D6F5F2', 200: '#ADEBE5', 300: '#84E1D8',
          400: '#66D7CC', 500: '#4ECDC4', 600: '#2FADA4', 700: '#248A83',
          800: '#1D6E68', 900: '#15524E', DEFAULT: '#4ECDC4',
        },
        accent: {
          50: '#FFFAED', 100: '#FFF4D6', 200: '#FFE9AD', 300: '#FFDD85',
          400: '#FFD673', 500: '#FFD166', 600: '#F0B92E', 700: '#C7961F',
          800: '#9E7719', 900: '#755912', DEFAULT: '#FFD166',
        },
        ink: {
          50: '#F2F3F6', 100: '#E3E4EA', 200: '#C6C8D4', 300: '#A0A3B6',
          400: '#6E7391', 500: '#4A4F6E', 600: '#3A3E5A', 700: '#2D3047',
          800: '#232536', 900: '#191B27', 950: '#12131C', DEFAULT: '#2D3047',
        },
        bg: {
          DEFAULT: '#FFF8F0', soft: '#FFFDF9', deep: '#F7ECE0',
        },
        success: {
          50: '#F3FAF1', 100: '#E8F6E5', 200: '#CDEBC7', 300: '#A8DC9E',
          500: '#7BC96F', 600: '#5FAE53', 700: '#4A8A41', DEFAULT: '#7BC96F',
        },
        error: {
          50: '#FEF1F1', 100: '#FCDDDD', 200: '#F9BDBD', 300: '#F59595',
          500: '#F26D6D', 600: '#DC4646', 700: '#B53636', DEFAULT: '#F26D6D',
        },
        // 語意色：隨深色模式翻面
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        body: 'rgb(var(--body) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
      },
      fontFamily: {
        // 拉丁字母走 Nunito，中文交給系統字（Noto Sans TC 全字集太大，不 bundle）
        sans: [
          'Nunito',
          '"PingFang TC"', '"Microsoft JhengHei"', '"Microsoft YaHei"',
          '"Hiragino Sans TC"', '"Noto Sans TC"', '"Source Han Sans TC"',
          'system-ui', '-apple-system', 'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        // 柔和多層陰影，絕不用銳利單層
        soft: '0 1px 2px rgb(45 48 71 / 0.04), 0 4px 12px rgb(45 48 71 / 0.06)',
        card: '0 2px 4px rgb(45 48 71 / 0.04), 0 8px 24px rgb(45 48 71 / 0.08)',
        lift: '0 4px 8px rgb(45 48 71 / 0.06), 0 16px 40px rgb(45 48 71 / 0.12)',
        glow: '0 0 0 4px rgb(255 138 91 / 0.18)',
        'glow-teal': '0 0 0 4px rgb(78 205 196 / 0.20)',
        'inner-soft': 'inset 0 2px 4px rgb(45 48 71 / 0.06)',
      },
      backgroundImage: {
        'sun-rays':
          'repeating-conic-gradient(from 0deg, rgb(255 209 102 / .16) 0deg 8deg, transparent 8deg 16deg)',
        'flow-primary':
          'linear-gradient(90deg, #FF8A5B 0%, #FFD166 45%, #4ECDC4 100%)',
      },
      keyframes: {
        'flow-x': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        'shake-x': {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'flow-x': 'flow-x 2.4s linear infinite',
        pop: 'pop .34s ease-out',
        'shake-x': 'shake-x .4s ease-in-out',
        float: 'float 4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.34,1.56,.64,1)',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
