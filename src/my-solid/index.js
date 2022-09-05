const jsx = require('@babel/plugin-syntax-jsx').default;
const t = require('@babel/types');
const { addNamed } = require('@babel/helper-module-imports');
const log = require('../log');

const PLUGIN_NAME = 'my-solid-jsx';
const IMPORT_SOURCE = 'my-solid/jsx-runtime';
const IMPORT_NAME = {
  JSX: 'jsx',
  FRAGMENT: 'Fragment',
};

const get = (pass, name) =>
  pass.get(`@babel/${PLUGIN_NAME}/${name}`);
const set = (pass, name, v) =>
  pass.set(`@babel/${PLUGIN_NAME}/${name}`, v);

function hasProto(node) {
  return node.properties.some(
    value =>
      t.isObjectProperty(value, { computed: false, shorthand: false }) &&
      (t.isIdentifier(value.key, { name: "__proto__" }) ||
        t.isStringLiteral(value.key, { value: "__proto__" })),
  );
}

module.exports = function() {
  return {
    name: PLUGIN_NAME,
    inherits: jsx,
    visitor: {
      Program(path, pass) {
        // log(path.node);
        log('input opts: ', pass.opts, '\n');
      },
      JSXElement(path, pass) {
        validateCreateElement(path);

        if (!get(pass, 'useJSX')) {
          set(pass, 'useJSX', true);
        }

        const callExpr = buildCreateElementCall(path, pass);
        path.replaceWith(t.inherits(callExpr, path.node));
      },
      JSXFragment(path, pass) {
        if (!get(pass, 'useJSXFragment')) {
          set(pass, 'useJSXFragment', true);
        }

        const fragmentInnerName = getImportName({
          path,
          pass,
          importName: IMPORT_NAME.FRAGMENT,
        });
        const callExpr = t.callExpression(
          t.identifier(fragmentInnerName),
          t.react.buildChildren(path.node),
        );
        path.replaceWith(t.inherits(callExpr, path.node));
      },
      JSXNamespacedName(path) {
        throw path.buildCodeFrameError('不支持JSXNamespacedName');
      },
    },
  };
}

const objectAssign = t.memberExpression(t.identifier("Object"), t.identifier("assign"));

// 如果不存在，则自动插入导入语句，并返回
function getImportName({ path, pass, importName }) {
  const passKey = `import/${importName}`;
  const maybeTarget = get(pass, passKey);
  if (maybeTarget) {
    return maybeTarget;
  }

  const target = addNamed(path, importName, IMPORT_SOURCE, {
    importedInterop: "uncompiled",
    importPosition: "after",
  }).name;
  set(pass, passKey, target);
  return target;
}

// Builds JSX into:
// Production: XXX.createElement(type, arguments, children)
// Development: XXX.createElement(type, arguments, children)
function buildCreateElementCall(
  jsxElementPath,
  pass,
) {
  const openingPath = jsxElementPath.get('openingElement');
  const callArgs = [getTag(openingPath)];
  const elementAttrs = buildElementAttributes(
    jsxElementPath,
    openingPath.get('attributes'),
  );
  if (elementAttrs) {
    callArgs.push(elementAttrs);
  }

  const jsxInnerName = getImportName({
    path: jsxElementPath,
    pass,
    importName: IMPORT_NAME.JSX,
  });
  return t.callExpression(
    t.identifier(jsxInnerName),
    callArgs,
  );
}

function buildElementAttributes(jsxElementPath, attrs) {
  const children = t.react.buildChildren(jsxElementPath.node);

  const objs = [];
  const props = attrs.reduce(accumulateAttribute, []);
  if (children.length) {
    props.push(
      t.objectProperty(t.identifier('children'), t.arrayExpression(children))
    );
  }

  // Convert syntax to use multiple objects instead of spread
  let start = 0;
  props.forEach((prop, i) => {
    if (t.isSpreadElement(prop)) {
      if (i > start) {
        objs.push(t.objectExpression(props.slice(start, i)));
      }
      objs.push(prop.argument);
      start = i + 1;
    }
  });
  if (props.length > start) {
    objs.push(t.objectExpression(props.slice(start)));
  }

  if (!objs.length) return;

  if (objs.length === 1) {
    if (
      !(
        t.isSpreadElement(props[0]) &&
        // If an object expression is spread element's argument
        // it is very likely to contain __proto__ and we should stop
        // optimizing spread element
        t.isObjectExpression(props[0].argument)
      )
    ) {
      return objs[0];
    }
  }

  // looks like we have multiple objects
  if (!t.isObjectExpression(objs[0])) {
    objs.unshift(t.objectExpression([]));
  }

  return t.callExpression(objectAssign, objs);
}

function accumulateAttribute(
  array,
  attribute,
) {
  const convertAttributeValue = node =>
    t.isJSXExpressionContainer(node) ? node.expression : node;

  if (t.isJSXSpreadAttribute(attribute.node)) {
    const arg = attribute.node.argument;
    // Collect properties into props array if spreading object expression
    if (t.isObjectExpression(arg) && !hasProto(arg)) {
      array.push(...arg.properties);
    } else {
      array.push(t.spreadElement(arg));
    }
    return array;
  }

  const value = convertAttributeValue(
    attribute.node.name.name !== "key"
      ? attribute.node.value || t.booleanLiteral(true)
      : attribute.node.value,
  );

  if (t.isValidIdentifier(attribute.node.name.name, false)) {
    attribute.node.name.type = "Identifier";
  } else {
    attribute.node.name = t.stringLiteral(attribute.node.name.name);
  }

  array.push(
    t.inherits(
      t.objectProperty(
        attribute.node.name,
        value,
      ),
      attribute.node,
    ),
  );
  return array;
}

// pass: <div key={key} {...props} />
// fail: <div {...props} key={key} />
function validateCreateElement(jsxElementPath) {
  const openingPath = jsxElementPath.get('openingElement');
  const attributes = openingPath.node.attributes;

  let seenPropsSpread = false;
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    if (
      seenPropsSpread &&
      t.isJSXAttribute(attr) &&
      attr.name.name === 'key'
    ) {
      throw jsxElementPath.buildCodeFrameError(
        `JSXElement解析失, key应该在spread运算符之前`,
      );
    } else if (t.isJSXSpreadAttribute(attr)) {
      seenPropsSpread = true;
    }
  }
}

// 1. div isIdentifier react.isCompatTag
// 2. Comp isIdentifier
// 3. obj.prop isMemberExpression
function getTag(openingPath) {
  const tagExpr = convertJSXIdentifier(
    openingPath.node.name,
    openingPath.node,
  );

  if (t.isIdentifier(tagExpr) && t.react.isCompatTag(tagExpr.name)) {
    return t.stringLiteral(tagExpr.name);
  }

  return tagExpr;
}

function convertJSXIdentifier(
  node, // t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
  parent, // t.JSXOpeningElement | t.JSXMemberExpression
) { // return t.ThisExpression | t.MemberExpression | t.Identifier
  if (t.isJSXIdentifier(node)) {
    if (node.name === "this" && t.isReferenced(node, parent)) {
      return t.thisExpression();
    } else if (t.isValidIdentifier(node.name, false)) {
      node.type = "Identifier";
    } else {
      return t.stringLiteral(node.name);
    }
  } else if (t.isJSXMemberExpression(node)) {
    return t.memberExpression(
      convertJSXIdentifier(node.object, node),
      convertJSXIdentifier(node.property, node),
    );
  }
  return node;
}
