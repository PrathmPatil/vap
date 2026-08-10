/**
 * Client-side expression validator (mirrors backend expressionEngine rules).
 */

export const FORMULA_ALLOWED_VARS = [
  "open",
  "high",
  "low",
  "close",
  "volume",
  "prev_close",
  "change_percent",
  "rsi14",
  "sma20",
  "sma50",
  "sma100",
  "sma200",
  "bb_upper",
  "bb_middle",
  "bb_lower",
  "obv",
  "hi_52_wk",
  "lo_52_wk",
] as const;

export const FORMULA_OPERATORS = [
  { label: "+", value: " + " },
  { label: "-", value: " - " },
  { label: "*", value: " * " },
  { label: "/", value: " / " },
  { label: ">", value: " > " },
  { label: "<", value: " < " },
  { label: ">=", value: " >= " },
  { label: "<=", value: " <= " },
  { label: "==", value: " == " },
  { label: "!=", value: " != " },
  { label: "and", value: " and " },
  { label: "or", value: " or " },
  { label: "not", value: " not " },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
] as const;

const ALLOWED_VARS = new Set<string>(FORMULA_ALLOWED_VARS);
const FUNCTIONS = new Set(["abs", "min", "max", "round", "sqrt"]);

type Token =
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: string };

function tokenize(input: string): Token[] {
  const src = String(input || "").trim();
  if (!src) throw new Error("Expression is empty");
  const tokens: Token[] = [];
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
      const raw = src.slice(i, j);
      if ((raw.match(/\./g) || []).length > 1) {
        throw new Error(`Invalid number '${raw}'`);
      }
      tokens.push({ type: "number", value: Number(raw) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j += 1;
      const word = src.slice(i, j).toLowerCase();
      if (word === "and") tokens.push({ type: "op", value: "&&" });
      else if (word === "or") tokens.push({ type: "op", value: "||" });
      else if (word === "not") tokens.push({ type: "op", value: "!" });
      else if (word === "true") tokens.push({ type: "number", value: 1 });
      else if (word === "false") tokens.push({ type: "number", value: 0 });
      else tokens.push({ type: "ident", value: word });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if ([">=", "<=", "==", "!=", "&&", "||"].includes(two)) {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }
    if ("+-*/%^()<>,!".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    throw new Error(
      `Invalid character '${ch}'. Use operators: + - * / % ^ ( ) > < >= <= == != and or not`
    );
  }
  return tokens;
}

function validateAst(tokens: Token[]) {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseOr = (): void => {
    parseAnd();
    while (peek()?.type === "op" && peek().value === "||") {
      consume();
      parseAnd();
    }
  };
  const parseAnd = (): void => {
    parseEquality();
    while (peek()?.type === "op" && peek().value === "&&") {
      consume();
      parseEquality();
    }
  };
  const parseEquality = (): void => {
    parseCompare();
    while (peek()?.type === "op" && ["==", "!="].includes(peek().value)) {
      consume();
      parseCompare();
    }
  };
  const parseCompare = (): void => {
    parseAdd();
    while (
      peek()?.type === "op" &&
      [">", "<", ">=", "<="].includes(peek().value)
    ) {
      consume();
      parseAdd();
    }
  };
  const parseAdd = (): void => {
    parseMul();
    while (peek()?.type === "op" && ["+", "-"].includes(peek().value)) {
      consume();
      parseMul();
    }
  };
  const parseMul = (): void => {
    parsePow();
    while (peek()?.type === "op" && ["*", "/", "%"].includes(peek().value)) {
      consume();
      parsePow();
    }
  };
  const parsePow = (): void => {
    parseUnary();
    while (peek()?.type === "op" && peek().value === "^") {
      consume();
      parseUnary();
    }
  };
  const parseUnary = (): void => {
    if (peek()?.type === "op" && (peek().value === "-" || peek().value === "!")) {
      consume();
      parseUnary();
      return;
    }
    parsePrimary();
  };
  const parsePrimary = (): void => {
    const tok = peek();
    if (!tok) throw new Error("Unexpected end of expression — check operators and parentheses");
    if (tok.type === "number") {
      consume();
      return;
    }
    if (tok.type === "ident") {
      consume();
      if (peek()?.type === "op" && peek().value === "(") {
        if (!FUNCTIONS.has(tok.value)) {
          throw new Error(
            `Unknown function '${tok.value}'. Allowed: abs, min, max, round, sqrt`
          );
        }
        consume();
        if (!(peek()?.type === "op" && peek().value === ")")) {
          parseOr();
          while (peek()?.type === "op" && peek().value === ",") {
            consume();
            parseOr();
          }
        }
        if (!(peek()?.type === "op" && peek().value === ")")) {
          throw new Error(`Missing ')' after function ${tok.value}`);
        }
        consume();
        return;
      }
      if (!ALLOWED_VARS.has(tok.value)) {
        throw new Error(
          `Unknown field '${tok.value}'. Click a field chip below or use: ${FORMULA_ALLOWED_VARS.join(", ")}`
        );
      }
      return;
    }
    if (tok.type === "op" && tok.value === "(") {
      consume();
      parseOr();
      if (!(peek()?.type === "op" && peek().value === ")")) {
        throw new Error("Missing closing parenthesis ')'");
      }
      consume();
      return;
    }
    throw new Error(`Unexpected token '${tok.value}' — check operator placement`);
  };

  parseOr();
  if (pos < tokens.length) {
    throw new Error(`Unexpected token near '${tokens[pos].value}'`);
  }
}

export type ExpressionCheck = {
  valid: boolean;
  message: string;
};

export function checkExpression(expression: string): ExpressionCheck {
  try {
    const tokens = tokenize(expression);
    validateAst(tokens);
    return { valid: true, message: "Expression looks valid" };
  } catch (err: any) {
    return {
      valid: false,
      message: err?.message || "Invalid expression",
    };
  }
}

const CACHE_PREFIX = "vap.customFormulas.v1.";

export function loadCachedFormulas(userId: string | number | undefined | null) {
  if (typeof window === "undefined" || userId == null || userId === "") {
    return null;
  }
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedFormulas(
  userId: string | number | undefined | null,
  formulas: unknown[]
) {
  if (typeof window === "undefined" || userId == null || userId === "") return;
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${userId}`,
      JSON.stringify(formulas || [])
    );
  } catch {
    // ignore quota errors
  }
}
