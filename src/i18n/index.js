const jsx = require('@babel/plugin-syntax-jsx').default;
const fs = require('fs-extra');
const translate = require('translate');
const path = require('path');
const t = require('@babel/types');
const { addDefault } = require('@babel/helper-module-imports');
const log = require('../log');

const PLUGIN_NAME = 'i18n';

const get = (pass, name) =>
  pass.get(`@babel/${PLUGIN_NAME}/${name}`);
const set = (pass, name, v) =>
  pass.set(`@babel/${PLUGIN_NAME}/${name}`, v);

module.exports = function({ template }) {
  return {
    name: PLUGIN_NAME,
    inherits: jsx,
    visitor: {
      Program: {
        enter(path, pass) {
          // log(path.node);
  
          pass.opts = Object.assign({
            sourcePath: 'i18n',
            nameHint: 'i18n',
            translateMap: {},
          }, pass.opts);
  
          log('\ninput opts: ', pass.opts);
  
          if (!pass.opts.outputDir) {
            throw path.buildCodeFrameError('参数outputDir丢失');
          } else if (!pass.opts.initialInfo) {
            throw path.buildCodeFrameError('参数initialInfo丢失');
          }
  
          const { sourcePath, nameHint } = pass.opts;
  
          pass.i18nList = [];
  
          path.traverse({
            ImportDefaultSpecifier(path) {
  
              const thisSourcePath = path.parent.source.value;
              if (thisSourcePath !== sourcePath) {
                path.skip();
                return;
              }
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
  
          pass.nextI18nIndex = 0;
          pass.i18nMap = {};
          pass.getNextI18nKey = (value) => {
            const key = `i18n-${pass.nextI18nIndex}`;
            pass.i18nMap[key] = value;
            pass.nextI18nIndex ++;
            return key;
          };
  
          // i18n-ignore
          path.traverse({
            'StringLiteral|TemplateLiteral'(path) {
              const { leadingComments = [] } = path.node;
              if(path.findParent(p => p.isImportDeclaration())) {
                path.node.i18nIgnore = true;
                path.skip();
                return;
              }
              leadingComments.forEach((comment, index) => {
                if (comment.value.includes('i18n-ignore')) {
                  path.node.i18nIgnore = true;
                  path.skip();
                  leadingComments[index] = null;
                }
              });
              path.node.leadingComments = leadingComments.filter(Boolean);
            },
          });
        },
        exit(_, pass) {
          const { i18nMap } = pass;
          const { outputDir, initialInfo, translateMap } = pass.opts;
          fs.ensureDirSync(outputDir);
          fs.emptyDirSync(outputDir);

          const fromLang = initialInfo.language;
          fs.writeJSONSync(path.resolve(outputDir, initialInfo.output), i18nMap, { spaces: 2 });

          Object.entries(translateMap).forEach(([lang, filepath]) => {
            filepath = path.resolve(outputDir, filepath);

            const thisI18nMap = {};
            const promiseList = [];
            for (const i18Key in i18nMap) {
              const source = i18nMap[i18Key];
              promiseList.push(
                translate(source, { to: lang, from: fromLang }).then(value => [i18Key, value])
              );
            }
            Promise.all(promiseList).then(entries => {
              entries.forEach(([key, value]) => {
                thisI18nMap[key] = value;
              });
              console.log({filepath, thisI18nMap})
              fs.writeJSONSync(filepath, thisI18nMap, { spaces: 2 });
            });
          });
        },
      },
      StringLiteral(path, pass) {
        if (path.node.i18nIgnore) {
          path.skip();
          return;
        }

        const value = path.node.value;
        const key = pass.getNextI18nKey(value);

        path.replaceWithSourceString(
          `${pass.identifierName}.t("${key}", ${value})`
        );
        path.skip();
      },
      TemplateLiteral(path, pass) {
        if (path.node.i18nIgnore) {
          path.skip();
          return;
        }
        if (path.node.quasis) {
          const value = path.node.quasis.map(q => q.value.raw).join('{placeholder}')
            .replace(/"/gm, '\\\"');
          const key = pass.getNextI18nKey(value);
          path.replaceWithSourceString(
            `${pass.identifierName}.t("${key}", "${value}")`
          );
          path.skip();
        }
      },
    },
  };
}
