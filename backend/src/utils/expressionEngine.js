/**
 * Safe expression evaluator for custom formulas.
 * Supports: numbers, variables, + - * / % ^, comparisons, and/or/not, parentheses,
 * functions: abs, min, max, round, sqrt.
 */

const ALLOWED_VARS = new Set([
  'open',
  'high',
  'low',
  'close',
  'volume',
  'prev_close',
  'change_percent',
  'rsi14',
  'sma20',
  'sma50',
  'sma100',
  'sma200',
  'bb_upper',
  'bb_middle',
  'bb_lower',
  'obv',
  'hi_52_wk',
  'lo_52_wk',
]);

const FUNCTIONS = {
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  round: Math.round,
  sqrt: Math.sqrt,
};

function tokenize(input) {
  const src = String(input || '').trim();
  if (!src) throw new Error('Expression is empty');
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      tokens.push({ type: 'number', value: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j += 1;
      const word = src.slice(i, j).toLowerCase();
      if (word === 'and') tokens.push({ type: 'op', value: '&&' });
      else if (word === 'or') tokens.push({ type: 'op', value: '||' });
      else if (word === 'not') tokens.push({ type: 'op', value: '!' });
      else if (word === 'true') tokens.push({ type: 'number', value: 1 });
      else if (word === 'false') tokens.push({ type: 'number', value: 0 });
      else tokens.push({ type: 'ident', value: word });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/%^()<>,!'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected character '${ch}' in expression`);
  }
  return tokens;
}

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseOr() {
    let node = parseAnd();
    while (peek()?.type === 'op' && peek().value === '||') {
      consume();
      node = { type: 'binary', op: '||', left: node, right: parseAnd() };
    }
    return node;
  }

  function parseAnd() {
    let node = parseEquality();
    while (peek()?.type === 'op' && peek().value === '&&') {
      consume();
      node = { type: 'binary', op: '&&', left: node, right: parseEquality() };
    }
    return node;
  }

  function parseEquality() {
    let node = parseCompare();
    while (
      peek()?.type === 'op' &&
      ['==', '!='].includes(peek().value)
    ) {
      const op = consume().value;
      node = { type: 'binary', op, left: node, right: parseCompare() };
    }
    return node;
  }

  function parseCompare() {
    let node = parseAdd();
    while (
      peek()?.type === 'op' &&
      ['>', '<', '>=', '<='].includes(peek().value)
    ) {
      const op = consume().value;
      node = { type: 'binary', op, left: node, right: parseAdd() };
    }
    return node;
  }

  function parseAdd() {
    let node = parseMul();
    while (peek()?.type === 'op' && ['+', '-'].includes(peek().value)) {
      const op = consume().value;
      node = { type: 'binary', op, left: node, right: parseMul() };
    }
    return node;
  }

  function parseMul() {
    let node = parsePow();
    while (peek()?.type === 'op' && ['*', '/', '%'].includes(peek().value)) {
      const op = consume().value;
      node = { type: 'binary', op, left: node, right: parsePow() };
    }
    return node;
  }

  function parsePow() {
    let node = parseUnary();
    while (peek()?.type === 'op' && peek().value === '^') {
      consume();
      node = { type: 'binary', op: '^', left: node, right: parseUnary() };
    }
    return node;
  }

  function parseUnary() {
    if (peek()?.type === 'op' && (peek().value === '-' || peek().value === '!')) {
      const op = consume().value;
      return { type: 'unary', op, arg: parseUnary() };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of expression');
    if (tok.type === 'number') {
      consume();
      return { type: 'number', value: tok.value };
    }
    if (tok.type === 'ident') {
      consume();
      if (peek()?.type === 'op' && peek().value === '(') {
        consume();
        const args = [];
        if (!(peek()?.type === 'op' && peek().value === ')')) {
          args.push(parseOr());
          while (peek()?.type === 'op' && peek().value === ',') {
            consume();
            args.push(parseOr());
          }
        }
        if (!(peek()?.type === 'op' && peek().value === ')')) {
          throw new Error(`Missing ) after function ${tok.value}`);
        }
        consume();
        if (!FUNCTIONS[tok.value]) {
          throw new Error(`Unknown function '${tok.value}'`);
        }
        return { type: 'call', name: tok.value, args };
      }
      if (!ALLOWED_VARS.has(tok.value)) {
        throw new Error(
          `Unknown variable '${tok.value}'. Allowed: ${[...ALLOWED_VARS].join(', ')}`
        );
      }
      return { type: 'var', name: tok.value };
    }
    if (tok.type === 'op' && tok.value === '(') {
      consume();
      const node = parseOr();
      if (!(peek()?.type === 'op' && peek().value === ')')) {
        throw new Error('Missing closing parenthesis');
      }
      consume();
      return node;
    }
    throw new Error(`Unexpected token '${tok.value}'`);
  }

  const ast = parseOr();
  if (pos < tokens.length) {
    throw new Error(`Unexpected token near '${tokens[pos].value}'`);
  }
  return ast;
}

function evalAst(node, vars) {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'var': {
      const v = vars[node.name];
      return v == null || Number.isNaN(Number(v)) ? NaN : Number(v);
    }
    case 'unary': {
      const a = evalAst(node.arg, vars);
      if (node.op === '-') return -a;
      if (node.op === '!') return a ? 0 : 1;
      return NaN;
    }
    case 'call': {
      const args = node.args.map((a) => evalAst(a, vars));
      return FUNCTIONS[node.name](...args);
    }
    case 'binary': {
      const l = evalAst(node.left, vars);
      const r = evalAst(node.right, vars);
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return r === 0 ? NaN : l / r;
        case '%':
          return r === 0 ? NaN : l % r;
        case '^':
          return l ** r;
        case '>':
          return l > r ? 1 : 0;
        case '<':
          return l < r ? 1 : 0;
        case '>=':
          return l >= r ? 1 : 0;
        case '<=':
          return l <= r ? 1 : 0;
        case '==':
          return l === r ? 1 : 0;
        case '!=':
          return l !== r ? 1 : 0;
        case '&&':
          return l && r ? 1 : 0;
        case '||':
          return l || r ? 1 : 0;
        default:
          return NaN;
      }
    }
    default:
      return NaN;
  }
}

export function validateExpression(expression) {
  const tokens = tokenize(expression);
  parse(tokens);
  return true;
}

export function evaluateExpression(expression, vars = {}) {
  const tokens = tokenize(expression);
  const ast = parse(tokens);
  const result = evalAst(ast, vars);
  return result;
}

export function expressionPasses(expression, vars = {}) {
  const result = evaluateExpression(expression, vars);
  if (Number.isNaN(result)) return false;
  return Boolean(result);
}

export const CUSTOM_FORMULA_ALLOWED_VARS = [...ALLOWED_VARS];
