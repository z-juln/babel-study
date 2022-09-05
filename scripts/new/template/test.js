const babel = require('@babel/core');
const log = require('../log');

const code1 = `
`;

const code2 = `
`;

[code1, code2].forEach((code, index) => {
  const { code: newCode } = babel.transform(code, {
    plugins: [
      [require('./index.js'), {  }],
    ],
    parserOpts: {
      tokens: true,
    },
  });
  log(`\n===== code${index + 1}:\n\n`, newCode);
});
