'use strict';

const introEl = document.getElementById('intro');
const controlsEl = document.getElementById('controls');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let names, levels, numTicks;

/* BIN_PLACEHOLDER */

let rangeMin = 0;
let rangeMax = 1;
let topLevel = 0;
let graphWidth, numTicksLeft, numTicksRight, pxPerTick;

const padding = 20;
const pxPerLevel = 18;
const collapseThreshold = 5;
const hideThreshold = 1;
const labelThreshold = 20;

if (levels) {
    init();
}

function init() {
    document.body.classList.add('loaded');
    controlsEl.style.display = 'block';

    // delta-decode bar positions
    for (const level of levels) {
        let prev = 0;
        for (let i = 0; i < level.length; i += 3) {
            level[i] += prev;
            prev = level[i] + level[i + 1];
        }
    }

    updateFromHash();
    render();
}

window.onhashchange = () => {
    updateFromHash();
    render();
};
canvas.onclick = (e) => {
    const {i, j} = xyToBar(e.offsetX, e.offsetY);
    if (i === undefined) return;
    window.location.hash = [i, j].join(',');
    removeHighlight();
};
document.getElementById('reset').onclick = () => {
    window.location.hash = '';
};
window.onresize = render;

function updateFromHash() {
    const [i, j] = window.location.hash.substr(1).split(',').map(Number);

    if (!isNaN(i) && !isNaN(j)) {
        topLevel = i;
        rangeMin = levels[i][j] / numTicks;
        rangeMax = (levels[i][j] + levels[i][j + 1]) / numTicks;
    } else {
        topLevel = 0;
        rangeMin = 0;
        rangeMax = 1;
    }
}

function tickToX(i) {
    return (i - numTicks * rangeMin) * pxPerTick + padding;
}

function render() {
    if (!levels) return;

    graphWidth = canvas.width = canvas.clientWidth;
    canvas.height = pxPerLevel * (levels.length - topLevel);
    canvas.style.height = canvas.height + 'px';

    if (devicePixelRatio > 1) {
        canvas.width *= 2;
        canvas.height *= 2;
        ctx.scale(2, 2);
    }

    pxPerTick = (graphWidth - 2 * padding) / numTicks / (rangeMax - rangeMin);

    ctx.textBaseline = 'middle';
    ctx.font = '10px Tahoma, sans-serif';
    ctx.strokeStyle = 'white';

    for (let i = 0; i < levels.length - topLevel; i++) {
        const level = levels[topLevel + i];

        for (let j = 0; j < level.length; j += 3) {
            const barIndex = level[j];
            const x = tickToX(barIndex);
            const y = i * pxPerLevel;
            let numBarTicks = level[j + 1];

            // merge very small blocks into big "collapsed" ones for performance
            let collapsed = numBarTicks * pxPerTick <= collapseThreshold;
            if (collapsed) {
                while (
                    j < level.length - 3 &&
                    barIndex + numBarTicks === level[j + 3] &&
                    level[j + 4] * pxPerTick <= collapseThreshold
                ) {
                    j += 3;
                    numBarTicks += level[j + 1];
                }
            }

            const sw = numBarTicks * pxPerTick - 0.5;
            const sh = pxPerLevel - 0.5;

            if (x < padding || x + sw + padding > graphWidth || sw < hideThreshold) continue;

            ctx.beginPath();
            ctx.rect(x, y, sw, sh);

            const ratio = numBarTicks / numTicks;

            if (!collapsed) {
                ctx.stroke();
                const intensity = Math.min(1, ratio * Math.pow(1.16, i) / (rangeMax - rangeMin));
                const h = 50 - 50 * intensity;
                const l = 65 + 7 * intensity;
                ctx.fillStyle = `hsl(${h}, 100%, ${l}%)`;
            } else {
                ctx.fillStyle = '#eee';
            }
            ctx.fill();

            if (!collapsed && sw >= labelThreshold) {
                const percent = Math.round(10000 * ratio) / 100;
                const name = `${names[level[j + 2]]} (${percent}%, ${numBarTicks} of ${numTicks} samples)`;
                ctx.save();
                ctx.clip();
                ctx.fillStyle = 'black';
                ctx.fillText(name, Math.max(x, padding) + 1, y + sh / 2);
                ctx.restore();
            }
        }
    }
}

function xyToBar(x, y) {
    const i = Math.floor(y / pxPerLevel) + topLevel;
    const level = levels[i];

    for (let j = 0; j < level.length; j += 3) {
        const x0 = tickToX(level[j]);
        const x1 = tickToX(level[j] + level[j + 1]);
        if (x1 - x0 > collapseThreshold && x >= x0 && x <= x1) return {i, j};
    }

    return {};
}

let highlightEl = document.getElementById('highlight');
highlightEl.style.height = pxPerLevel + 'px';

canvas.onmousemove = highlightCurrent;
canvas.onmouseout = window.onscroll = removeHighlight;

function removeHighlight() {
    canvas.style.cursor = '';
    highlightEl.style.display = 'none';
}

function highlightCurrent(e) {
    const {i, j} = xyToBar(e.offsetX, e.offsetY);

    if (i === undefined || e.offsetX < padding || e.offsetX > graphWidth - padding) {
        removeHighlight();
        return;
    }

    canvas.style.cursor = 'pointer';

    const level = levels[i];
    const x = tickToX(level[j]);
    const y = (i - topLevel) * pxPerLevel;
    const sw = tickToX(level[j] + level[j + 1]) - x;

    const canvasPos = canvas.getBoundingClientRect();
    highlightEl.style.display = 'block';
    highlightEl.style.left = (canvasPos.left + x) + 'px';
    highlightEl.style.top = (canvasPos.top + y) + 'px';
    highlightEl.style.width = sw + 'px';
}

// (function frame() { if (levels) render(); requestAnimationFrame(frame); })();

/* BIN_SPLIT */
/* global mergeStacks, v8logToStacks */
const body = document.body;

body.ondragover = () => {
    body.classList.add('hover');
    return false;
};
body.ondragleave = () => {
    body.classList.remove('hover');
};
body.ondrop = (e) => {
    body.classList.remove('hover');

    canvas.height = 0;

    introEl.innerHTML = 'Loading...';

    console.time('Loading');

    var reader = new FileReader();
    reader.onload = function (event) {
        console.timeEnd('Loading');

        console.time('Parsing JSON');
        var json = JSON.parse(event.target.result);
        console.timeEnd('Parsing JSON');

        console.time('Processing stacks');
        let stacks;
        ({names, stacks} = v8logToStacks(json));
        numTicks = stacks.length;
        levels = mergeStacks(stacks);
        console.timeEnd('Processing stacks');

        init();
    };
    reader.readAsText(e.dataTransfer.files[0]);

    e.preventDefault();
    return false;
};
/* BIN_SPLIT */
