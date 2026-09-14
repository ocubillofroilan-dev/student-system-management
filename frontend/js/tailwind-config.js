tailwind.config = {
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A52',   // matches the crest's deep navy blue
          dark: '#111B38',
          soft: '#2C3E6B',
        },
        gold: {
          DEFAULT: '#C6A15B',   // matches the crest's gold linework
          light: '#E3CE9C',
        },
        ink: '#242220',
        muted: '#6B6558',
        border: '#E6DFC9',      // soft cream-toned border
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