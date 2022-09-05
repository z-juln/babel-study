const t = require('@babel/types');
const { addDefault } = require('@babel/helper-module-imports');
const log = require('../log');

const PLUGIN_NAME = '<%= name %>';

const get = (pass, name) =>
  pass.get(`@babel/${PLUGIN_NAME}/${name}`);
const set = (pass, name, v) =>
  pass.set(`@babel/${PLUGIN_NAME}/${name}`, v);

module.exports = function({ template }) {
  return {
    name: PLUGIN_NAME,
    visitor: {
      Program(path, pass) {
        // log(path.node);
        log('input opts: ', pass.opts, '\n');

        pass.opts = Object.assign({
          
        }, pass.opts);

      },
    },
  };
}
