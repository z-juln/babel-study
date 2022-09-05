const path = require('path');
const fs = require('fs-extra');
const superEjs = require('super-ejs');
const changeCase = require('@juln/change-case');

const projectName = process.argv[2];

if (!projectName) {
  throw new Error('请输入新babel名 (yarn new demo)');
}

const templatePath = path.resolve(__dirname, './template');
const outputPath = path.resolve(__dirname, '../../src', projectName);

console.log(`正在生成 ${projectName} (${outputPath})`);

generateInPkgJSON(projectName);
generateInReadme(projectName);

superEjs.gerenateDir(
  outputPath,
  templatePath,
  { name: projectName, changeCase }, // ejs的data参数
  {}, // ejs的options参数
  { parseFilename: (original) => original.replace('__name__', projectName) },
)
  .then(() => console.log('ok'));

function generateInPkgJSON(projectName) {
  const pkgJSON = require('../../package.json');
  pkgJSON.scripts[`test:${projectName}`] = `node ./src/${projectName}/test.js`;
  fs.writeJSONSync(
    path.resolve(__dirname, '../../package.json'),
    pkgJSON,
    { spaces: 2 },
  );
}

function generateInReadme(projectName) {
  const readmePath = path.resolve(__dirname, '../../README.md');
  const oldReadme = fs.readFileSync(readmePath).toString();
  const blockStr = '<!-- new project -->';

  const newReadme = oldReadme.replace(blockStr, `- ${projectName}\n${blockStr}`);
  fs.writeFileSync(readmePath, newReadme);
}
