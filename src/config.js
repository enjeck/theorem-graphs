export const CONFIG = {
  WIKI_API_BASE: 'https://en.wikipedia.org/w/api.php',
  WIKI_API_PARAMS: 'format=json&origin=*&action=parse&prop=links&redirects',

  FUSE_OPTIONS: {
    shouldSort: true,
    matchAllTokens: true,
    findAllMatches: true,
    threshold: 0.4,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
  },

  GRAPH_SPRING_LENGTH: {
    DEFAULT: 600,
    EXTENDED: 900,
    THRESHOLD: 4,
  },

  GRAPH_LAYOUT: {
    springCoeff: 0.0008,
    dragCoeff: 0.02,
    gravity: -10.2,
  },

  NODE_STYLES: {
    PRIMARY: {
      color: 'red',
      strokeClass: 'red-stroke',
    },
    SECONDARY: {
      color: 'gray',
      strokeClass: 'gray-stroke',
    },
  },

  TEXT_SIZE: 20,
  NODE_WIDTH_MULTIPLIER: 2.2,
  NODE_HEIGHT: 40,

  REGEX: {
    // Match theorem-related terms
    THEOREM_MATCH: /([\w\s]+(theorem|lemma|correspondence))/gi,
    EXTENDED_MATCH: /([\w\s]+(theorem|algorithm|lemma|inequality|conjecture|axiom|corollary|correspondence))/gi,

    // Exclude unwanted terms
    EXCLUDE_COMMON: /(proof|fiction|disambiguation|introduction|book|theorems|prove|proving|metatheorem|math|template|talk|theory\))/gi,
    EXCLUDE_EXTENDED: /(proof|fiction|disambiguation|list|analysis of|method of|introduction|book|metatheorem|theorems|template|prove|proving|math|talk|theory\))/gi,
  },

  MESSAGES: {
    LOADING: 'Fetching data...',
    EMPTY_SEARCH: 'Visualizations of theorem relationships using graphs.',
    NO_RESULTS: 'No relationships found',
    ERROR_FETCH: 'Error fetching data. Please try again.',
  },
};