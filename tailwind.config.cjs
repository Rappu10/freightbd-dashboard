module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#211D18',
          soft: '#38322A',
          muted: '#6B6255'
        },
        paper: {
          DEFAULT: '#F3EDE0',
          card: '#FBF8F1'
        },
        line: '#D8CBB0',
        amber: {
          DEFAULT: '#E8A33D',
          dark: '#C6821F',
          light: '#FBEBD2'
        },
        rust: {
          DEFAULT: '#B54A34',
          dark: '#963B29',
          light: '#F3DED6'
        },
        pine: {
          DEFAULT: '#3F6B4F',
          light: '#DCE8DF'
        }
      },
      fontFamily: {
        display: ['Oswald', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        ticket: '0 1px 2px rgba(33, 29, 24, 0.06), 0 4px 14px rgba(33, 29, 24, 0.06)'
      }
    }
  },
  plugins: []
}
