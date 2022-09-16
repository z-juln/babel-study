const babel = require('@babel/core');
const path = require('path');
const log = require('../log');

const code1 = `
  const mode = '中文';
  const name = 'babel';
  const str = \`你好 "你好" $\{name\}\`;

  // const comp = <p content='content'></p>;
  const content = /* i18n-ignore */'content';
`;

const code2 = `
  import i18n from 'my-i18n';
  ${code1}
`;

[code1, code2].forEach((code, index) => {
  const { code: newCode } = babel.transform(code, {
    plugins: [
      [require('./index.js'), {
        sourcePath: 'my-i18n',
        nameHint: 'myI18n',
        outputDir: path.resolve(__dirname, 'i18nMap', `test${index}`),
        initialInfo: {
          language: 'en',
          output: 'en.json',
        },
        translateMap: {
          zh: 'zh.json',
        },
      }],
    ],
    parserOpts: {
      tokens: true,
    },
  });
  log(`\n===== code${index + 1}:\n\n`, newCode);
});
