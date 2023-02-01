module.exports = {
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {tsconfig: '../../tsconfig.json'},
    ],
    "^.+\\.hbs$": "jest-text-transformer"
  },  verbose: true,
};

