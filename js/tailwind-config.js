tailwind.config = {
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A4A',
          dark: '#121D33',
          soft: '#2A3D63',
        },
        gold: {
          DEFAULT: '#C9A227',
          light: '#E7CE7E',
        },
        ink: '#1F2430',
        muted: '#5B6472',
        border: '#E2E5EA',
        success: '#2F8F5B',
        danger: '#C4453A',
        late: '#B8791A',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
};