const display = document.getElementById("display");
const scientificKeys = document.getElementById("scientific-keys");
const modeHint = document.getElementById("mode-hint");
const btnDeg = document.getElementById("btn-deg");

/** When true, sin/cos/tan take degrees; inverse trig results shown in degrees. */
let degreeMode = false;

const KEY_MAP = {
  Enter: "=",
  "=": "=",
  Escape: "clear",
  Backspace: "backspace",
  "(": "(",
  ")": ")",
  "%": "%",
  "/": "/",
  "*": "*",
  "+": "+",
  "-": "-",
  ".": ".",
};

for (let d = 0; d <= 9; d++) {
  KEY_MAP[String(d)] = String(d);
}

function toggleDegLabel() {
  btnDeg.textContent = degreeMode ? "Deg" : "Rad";
  modeHint.textContent = degreeMode
    ? "Trig: degrees · Inv trig: result in degrees"
    : "Trig & inv trig: radians";
}

function addToDisplay(input) {
  display.value += input;
}

function clearDisplay() {
  display.value = "";
}

function backspace() {
  display.value = display.value.slice(0, -1);
}

function tokenize(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/\d/.test(c) || (c === "." && i + 1 < str.length && /\d/.test(str[i + 1]))) {
      let num = "";
      while (i < str.length && (/\d/.test(str[i]) || str[i] === ".")) {
        num += str[i++];
      }
      const value = parseFloat(num);
      if (Number.isNaN(value)) throw new Error("Invalid number");
      tokens.push({ type: "number", value });
      continue;
    }
    if ("+-*/^%()".includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let id = "";
      while (i < str.length && /[a-zA-Z]/.test(str[i])) {
        id += str[i++];
      }
      tokens.push({ type: "ident", value: id.toLowerCase() });
      continue;
    }
    throw new Error("Invalid character");
  }
  tokens.push({ type: "eof" });
  return tokens;
}

function trigArg(arg) {
  return degreeMode ? (arg * Math.PI) / 180 : arg;
}

function applyFunc(name, arg) {
  switch (name) {
    case "sin":
      return Math.sin(trigArg(arg));
    case "cos":
      return Math.cos(trigArg(arg));
    case "tan":
      return Math.tan(trigArg(arg));
    case "asin": {
      const r = Math.asin(arg);
      return degreeMode ? (r * 180) / Math.PI : r;
    }
    case "acos": {
      const r = Math.acos(arg);
      return degreeMode ? (r * 180) / Math.PI : r;
    }
    case "atan": {
      const r = Math.atan(arg);
      return degreeMode ? (r * 180) / Math.PI : r;
    }
    case "sqrt":
      return Math.sqrt(arg);
    case "log":
      return Math.log10(arg);
    case "ln":
      return Math.log(arg);
    default:
      throw new Error("Unknown function");
  }
}

function evaluateTokens(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume() {
    return tokens[pos++];
  }

  function parseExpr() {
    let left = parseTerm();
    while (peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = consume().value;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    while (
      peek().type === "op" &&
      (peek().value === "*" || peek().value === "/" || peek().value === "%")
    ) {
      const op = consume().value;
      const right = parsePower();
      if (op === "*") left = left * right;
      else if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        left = left / right;
      } else {
        left = left % right;
      }
    }
    return left;
  }

  function parsePower() {
    let left = parseUnary();
    if (peek().type === "op" && peek().value === "^") {
      consume();
      const right = parsePower();
      return Math.pow(left, right);
    }
    return left;
  }

  function parseUnary() {
    if (peek().type === "op" && peek().value === "-") {
      consume();
      return -parseUnary();
    }
    if (peek().type === "op" && peek().value === "+") {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (t.type === "number") {
      consume();
      return t.value;
    }
    if (t.type === "ident") {
      const name = consume().value;
      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;
      if (peek().type === "op" && peek().value === "(") {
        consume();
        const inner = parseExpr();
        if (peek().type !== "op" || peek().value !== ")") throw new Error("Expected )");
        consume();
        return applyFunc(name, inner);
      }
      throw new Error("Unknown symbol");
    }
    if (t.type === "op" && t.value === "(") {
      consume();
      const inner = parseExpr();
      if (peek().type !== "op" || peek().value !== ")") throw new Error("Expected )");
      consume();
      return inner;
    }
    throw new Error("Invalid expression");
  }

  const result = parseExpr();
  if (peek().type !== "eof") throw new Error("Invalid expression");
  return result;
}

function evaluateExpression(str) {
  if (!str.trim()) throw new Error("Empty");
  return evaluateTokens(tokenize(str));
}

function formatResult(n) {
  if (!Number.isFinite(n)) throw new Error("Not a number");
  const s = String(n);
  if (s.length > 16) return n.toExponential(8);
  return s;
}

function calculate() {
  const raw = display.value.trim();
  if (!raw) return;
  try {
    const n = evaluateExpression(raw);
    display.value = formatResult(n);
  } catch {
    display.value = "Error";
  }
}

function handleKeydown(e) {
  const k = e.key;
  if (k === "Enter" || k === "=") {
    e.preventDefault();
    calculate();
    return;
  }
  if (k === "Escape") {
    e.preventDefault();
    clearDisplay();
    return;
  }
  if (k === "Backspace") {
    e.preventDefault();
    backspace();
    return;
  }
  const mapped = KEY_MAP[k];
  if (mapped === "clear") {
    clearDisplay();
    return;
  }
  if (mapped === "backspace") {
    backspace();
    return;
  }
  if (mapped === "=") {
    calculate();
    return;
  }
  if (mapped) {
    e.preventDefault();
    addToDisplay(mapped);
  }
}

document.getElementById("calc").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.append !== undefined) {
    addToDisplay(btn.dataset.append);
    return;
  }
  const action = btn.dataset.action;
  if (action === "clear") clearDisplay();
  else if (action === "backspace") backspace();
  else if (action === "calculate") calculate();
  else if (action === "toggleDeg") {
    degreeMode = !degreeMode;
    toggleDegLabel();
  }
});

document.addEventListener("keydown", handleKeydown);

// Always show all buttons; only toggle angle units.
toggleDegLabel();
