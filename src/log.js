const tryRequire = (path) => {
  try {
    return require(path);
  } catch {
    return null;
  }
}
const maybeOlolog = tryRequire('ololog');
const log = maybeOlolog
  ? maybeOlolog.unlimited.configure({ stringify: { fancy: false, indentation: '  ' } })
  : console.log;

module.exports = log;
