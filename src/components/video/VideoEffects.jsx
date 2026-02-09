


export const VIDEO_EFFECTS = [

  { 

    name: 'Normal', 

    filter: 'none',

    css: {}

  },

  // Filtres existants

  { 

    name: 'Noir & Blanc', 

    filter: 'grayscale',

    css: { filter: 'grayscale(100%)' }

  },

  { 

    name: 'Sépia', 

    filter: 'sepia',

    css: { filter: 'sepia(100%)' }

  },

  { 

    name: 'Vibrant', 

    filter: 'saturate',

    css: { filter: 'saturate(200%)' }

  },

  { 

    name: 'Foncé', 

    filter: 'brightness',

    css: { filter: 'brightness(0.75)' }

  },

  { 

    name: 'Lumineux', 

    filter: 'brightness',

    css: { filter: 'brightness(1.25)' }

  },

  // Effets spéciaux

  { 

    name: 'Glitch', 

    filter: 'glitch',

    css: { 

      filter: 'brightness(1.1) contrast(1.2)',

      animation: 'glitch 0.3s infinite'

    }

  },

  { 

    name: 'Vintage', 

    filter: 'vintage',

    css: { 

      filter: 'sepia(40%) saturate(1.2) hue-rotate(-20deg) brightness(1.1)',

      mixBlendMode: 'screen'

    }

  },

  { 

    name: 'Dessin Animé', 

    filter: 'cartoon',

    css: { 

      filter: 'contrast(1.5) brightness(1.1) saturate(1.8)',

      mixBlendMode: 'overlay'

    }

  },

  { 

    name: 'Cinéma', 

    filter: 'cinema',

    css: { 

      filter: 'saturate(0.8) brightness(0.95) contrast(1.3)',

    }

  },

  { 

    name: 'Rétro', 

    filter: 'retro',

    css: { 

      filter: 'hue-rotate(20deg) saturate(0.7) brightness(1.2)',

    }

  },

  { 

    name: 'Chromatic', 

    filter: 'chromatic',

    css: { 

      filter: 'hue-rotate(-10deg) contrast(1.2)',

      backdropFilter: 'blur(0.5px)'

    }

  },

];



export const TRANSITIONS = [

  { name: 'Aucun', value: 'none', duration: 0 },

  { name: 'Fondu', value: 'fade', duration: 0.5 },

  { name: 'Glissade', value: 'slide', duration: 0.5 },

  { name: 'Zoom', value: 'zoom', duration: 0.5 },

  { name: 'Spin', value: 'spin', duration: 0.5 },

];



export const TEXT_FONTS = [

  { name: 'Inter', value: 'font-sans' },

  { name: 'Mono', value: 'font-mono' },

  { name: 'Bold', value: 'font-black' },

  { name: 'Light', value: 'font-light' },

];



export const getFilterStyle = (effectName) => {

  const effect = VIDEO_EFFECTS.find(e => e.name === effectName);

  return effect?.css || {};

};



export const getTransitionClass = (transitionName, duration) => {

  switch(transitionName) {

    case 'fade':

      return `transition-opacity duration-${Math.round(duration * 1000)}`;

    case 'slide':

      return `transition-transform duration-${Math.round(duration * 1000)}`;

    case 'zoom':

      return `transition-transform duration-${Math.round(duration * 1000)} scale-95`;

    default:

      return '';

  }

};
