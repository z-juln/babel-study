const path = require('path');

const resolve = p => path.resolve(__dirname, p);

const args = process.argv;
path.resolve(__dirname, )
if (args[2] === 'react') {
  console.log(`正在执行test-react.js (${resolve('test-react.js')})\n`);
  require('./test-react');
} else {
  console.log(`正在执行test-index.js (${resolve('test-index.js')})\n`);
  console.log('可使用 `yarn test:my-solid -- react` 命令执行test-react.js\n');
  require('./test-index');
}
