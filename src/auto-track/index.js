const t = require('@babel/types');
const { addDefault } = require('@babel/helper-module-imports');
const log = require('../log');

const PLUGIN_NAME = 'auto-track';

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
          sourcePath: 'track',
          nameHint: 'track',
        }, pass.opts);

        const { sourcePath, nameHint } = pass.opts;

        path.traverse({
          ImportDefaultSpecifier(path) {

            const thisSourcePath = path.parent.source.value;
            if (thisSourcePath !== sourcePath) {
              path.skip();
              return;
            };
            const { identifierName: thisIdentifierName } = path.node.local.loc;
            pass.identifierName = thisIdentifierName;
            path.stop();
          },
        });

        if (!pass.identifierName) {
          const identifierName = addDefault(path, sourcePath, {
            nameHint: path.scope.generateUid(nameHint),
          });
          pass.identifierName = identifierName.name;
        }
      },
      Function(path, pass) {
        const body = path.get('body');
        if (body.isBlockStatement()) {
          const callExp = template(`${pass.identifierName}()`)();
          body.node.body.unshift(callExp);
        } else {
          body.replaceWith(
            template.statement(`{${pass.identifierName}();return PREV_BODY;}`)({PREV_BODY: path.node.body})
          );
        }
      },
    },
  };
}
