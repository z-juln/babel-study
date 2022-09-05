const babel = require('@babel/core');
const log = require('../log');

const code = `
  import {
    jsxs as _jsxs,
    jsx as _jsx,
    Fragment as _Fragment,
  } from 'other-pack';

  const comp = (
    <>
      <div
        key='this-is-key'
        class={{aaa: false}}
        style={{ display: show ? 'initial' : 'none' }}
        data-show={show}
        arr={[]}
        {...restProps}
        {...{p1: ''}}
      >
        0{n + 1}
      </div>
      <myComp.Title title={<div/>} />
    </>
  );
`;

const { code: newCode } = babel.transform(code, {
  plugins: [
    require('./react.js')({
      forcedOptions: {
        runtime: 'automatic',
      },
    }),
  ],
});
log(newCode);
