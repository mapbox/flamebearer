'use strict';

const introEl = document.getElementById('intro');
const controlsEl = document.getElementById('controls');
const backEl = document.getElementById('back');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let names, levels, numTicks;

/* BIN_PLACEHOLDER */

let rangeMin = 0;
let rangeMax = 1;
let numSkippedLevels = 0;
let graphWidth, numTicksLeft, numTicksRight, pxPerTick;
let zoomPath = [];

const padding = 20;
const pxPerLevel = 18;
const collapseThreshold = 5;
const hideThreshold = 1;
const labelThreshold = 20;

if (levels) {
    init();
}

function init() {
    introEl.innerHTML = '';
    controlsEl.style.display = 'block';

    // delta-decode bar positions
    for (const level of levels) {
        let prev = 0;
        for (let i = 0; i < level.length; i += 3) {
            level[i] += prev;
            prev = level[i] + level[i + 1];
        }
    }
    render();
}

function render() {
    backEl.disabled = numSkippedLevels === 0 && rangeMin === 0 && rangeMax === 1;

    graphWidth = canvas.width = canvas.clientWidth;
    canvas.height = pxPerLevel * (levels.length - numSkippedLevels);
    canvas.style.height = canvas.height + 'px';

    if (devicePixelRatio > 1) {
        canvas.width *= 2;
        canvas.height *= 2;
        ctx.scale(2, 2);
    }

    numTicksLeft = numTicks * rangeMin;
    numTicksRight = numTicks * rangeMax;
    pxPerTick = (graphWidth - 2 * padding) / (numTicksRight - numTicksLeft);

    ctx.textBaseline = 'middle';
    ctx.font = '10px Tahoma, sans-serif';
    ctx.strokeStyle = 'white';

    for (let i = 0; i < levels.length - numSkippedLevels; i++) {
        const level = levels[numSkippedLevels + i];

        for (let j = 0; j < level.length; j += 3) {
            const barIndex = level[j];
            const x = (barIndex - numTicksLeft) * pxPerTick + padding;
            const y = i * pxPerLevel;
            let numBarTicks = level[j + 1];

            let collapsed = false;

            if (numBarTicks * pxPerTick <= collapseThreshold) {
                collapsed = true;

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

            if (x < padding) continue;
            if (x + sw + padding > graphWidth) continue;
            if (sw < hideThreshold) continue;

            const sh = pxPerLevel - 0.5;
            const ratio = numBarTicks / numTicks;
            const localRatio = numBarTicks / (numTicksRight - numTicksLeft);

            ctx.beginPath();
            ctx.rect(x, y, sw, sh);

            if (!collapsed) {
                ctx.stroke();
                const intensity = Math.min(1, localRatio * Math.pow(1.16, i));
                const h = 50 - 50 * intensity;
                const l = 65 + 7 * intensity;
                ctx.fillStyle = `hsl(${h}, 100%, ${l}%)`;
            } else {
                ctx.fillStyle = '#eee';
            }
            ctx.fill();

            if (!collapsed && sw >= labelThreshold) {
                ctx.save();
                ctx.clip();
                const name = `${names[level[j + 2]]} (${Math.round(10000 * ratio) / 100}%)`;
                ctx.fillStyle = 'black';
                ctx.fillText(name, Math.max(x, padding) + 1, y + sh / 2);
                ctx.restore();
            }
        }
    }
}

function xyToBar(x, y) {
    const i = Math.floor(y / pxPerLevel) + numSkippedLevels;
    const level = levels[i];

    // TODO binary search
    for (let j = 0; j < level.length; j += 3) {
        const x0 = (level[j] - numTicksLeft) * pxPerTick + padding;
        const x1 = (level[j] + level[j + 1] - numTicksLeft) * pxPerTick + padding;
        if (x1 - x0 > collapseThreshold && x >= x0 && x <= x1) {
            return {i, j};
        }
    }

    return {};
}

canvas.onclick = (e) => {
    const {i, j} = xyToBar(e.offsetX, e.offsetY);
    if (i === undefined || levels[i][j + 1] * pxPerTick <= collapseThreshold) return;
    zoomPath.push({numSkippedLevels, rangeMin, rangeMax});
    numSkippedLevels = i;
    rangeMin = levels[i][j] / numTicks;
    rangeMax = (levels[i][j] + levels[i][j + 1]) / numTicks;
    window.scrollTo(0, 0);
    render();
    highlightCurrent(e);
};

let highlightEl = document.getElementById('highlight');

canvas.onmousemove = highlightCurrent;
canvas.onmouseout = window.onscroll = () => {
    canvas.style.cursor = '';
    highlightEl.style.display = 'none';
};

function highlightCurrent(e) {
    const {i, j} = xyToBar(e.offsetX, e.offsetY);

    if (i === undefined || e.offsetX < padding || e.offsetX > graphWidth - padding) {
        canvas.style.cursor = '';
        highlightEl.style.display = 'none';
        return;
    }

    canvas.style.cursor = 'pointer';

    const level = levels[i];
    const x = (level[j] - numTicksLeft) * pxPerTick + padding;
    const y = (i - numSkippedLevels) * pxPerLevel;
    const sw = level[j + 1] * pxPerTick - 0.5;
    const sh = pxPerLevel - 0.5;

    const canvasPos = canvas.getBoundingClientRect();
    highlightEl.style.display = 'block';
    highlightEl.style.left = (canvasPos.left + x) + 'px';
    highlightEl.style.top = (canvasPos.top + y) + 'px';
    highlightEl.style.width = sw + 'px';
    highlightEl.style.height = sh + 'px';
}

backEl.onclick = () => {
    ({numSkippedLevels, rangeMin, rangeMax} = zoomPath.pop());
    render();
};
document.getElementById('reset').onclick = () => {
    numSkippedLevels = 0;
    rangeMin = 0;
    rangeMax = 1;
    zoomPath = [];
    render();
};

// (function frame() { if (levels) render(); requestAnimationFrame(frame); })();

window.onresize = () => {
    if (levels) render();
};

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
    body.classList.add('loaded');

    canvas.height = 0;

    introEl.innerHTML = 'Loading...';

    console.time('Loading');

    var reader = new FileReader();
    reader.onload = function (event) {
        console.timeEnd('Loading');
        console.log(`Loaded ${humanFileSize(event.target.result.length)}.`);

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

function humanFileSize(size) {
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return Math.round(100 * (size / Math.pow(1024, i))) / 100 + ' ' + ['B', 'kB', 'MB', 'GB'][i];
}
/* BIN_SPLIT */
