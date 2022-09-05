const babel = require('@babel/core');
const log = require('../log');

const code1 = `
  import aa from 'aa';
  import * as bb from 'bb';
  import {cc} from 'cc';
  import 'dd';

  function a () {
    console.log('aaa');
  }

  class B {
    bb() {
      return 'bbb';
    }
  }

  const c = () => 'ccc';

  const d = function () {
    console.log('ddd');
  }
`;

const code2 = `
  import track from 'my-track';
  ${code1}
`;

[code1, code2].forEach((code, index) => {
  const { code: newCode } = babel.transform(code, {
    plugins: [
      [require('./index.js'), { sourcePath: 'my-track' }],
    ],
    parserOpts: {
      tokens: true,
    },
  });
  log(`\n===== code${index + 1}:\n\n`, newCode);
});
