
const fs = require('fs');

console.time('load');
const log = JSON.parse(fs.readFileSync('gljs.json'));
console.timeEnd('load');

const cppNameRe = /[tT] ([^(<]*)/;

function codeToName(code) {
    if (!code || !code.type) return '(unknown)';

    let name = code.name;

    if (code.type === 'CPP') {
        const matches = name.match(cppNameRe);
        if (matches) name = matches[1];
        return '(C++) ' + name;
    }
    if (code.type === 'SHARED_LIB') return '(lib) ' + name;
    if (code.type === 'CODE') {
        if (
            code.kind === 'LoadIC' ||
            code.kind === 'StoreIC' ||
            code.kind === 'KeyedStoreIC' ||
            code.kind === 'KeyedLoadIC' ||
            code.kind === 'LoadGlobalIC' ||
            code.kind === 'Handler'
        ) return '(IC) ' + name;

        if (code.kind === 'BytecodeHandler') return '(bytecode) ' + name;
        if (code.kind === 'Stub') return '(stub) ' + name;
        if (code.kind === 'Builtin') return '(builtin) ' + name;
        if (code.kind === 'RegExp') return '(regexp) ' + name;
    }

    if (code.type === 'JS') {
        if (name[0] === ' ') name = '(anonymous)' + name;
        if (code.kind === 'Builtin' || code.kind === 'Unopt') return '~' + name;
        if (code.kind === 'Opt') return '*' + name;
    }

    return '(unknown)';
}

console.time('process');
const ticks = [];
const nameIds = {};
const names = [];

for (const tick of log.ticks) {
    const stack = [];
    for (let i = tick.s.length; i >= 0; i -= 2) {
        const code = log.code[tick.s[i]];
        const name = codeToName(code);
        let nameId = nameIds[name];
        if (!nameId) {
            nameId = nameIds[name] = names.length;
            names.push(name);
        }
        stack.push(nameId);
    }
    ticks.push(stack);
}
console.timeEnd('process');

console.time('sort');
ticks.sort((a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const d = a[i] - b[i];
        if (d) return d;
    }
    const dlen = a.length - b.length;
    if (dlen) return dlen;

    return 0;
});
console.timeEnd('sort');

console.time('merge');
const boxes = [];
merge(boxes, ticks);
console.timeEnd('merge');

// console.log(JSON.stringify(boxes.map(b => b.length)));
// console.log('boxes ' + boxes.reduce((memo, b) => memo + b.length / 3, 0));

// console.log(JSON.stringify({names, boxes}));

// for (const box of boxes) {
//     console.log(JSON.stringify(box));
// }

function merge(boxes, ticks) {
    const queue = [0, 0, ticks.length - 1];

    while (queue.length) {
        const right = queue.pop();
        const left = queue.pop();
        const level = queue.pop();

        let i = left;

        while (i <= right) {
            const id = ticks[i][level];

            const start = i;
            let hasChildren = false;
            for (; i <= right && ticks[i][level] === id; i++) {
                if (ticks[i].length > level + 1) hasChildren = true;
            }
            const end = i;

            if (hasChildren) {
                queue.unshift(level + 1, start, end - 1);
            }

            boxes[level] = boxes[level] || [];
            boxes[level].push(start, end, id);
        }
    }
}
