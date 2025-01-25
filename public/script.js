const socket = io();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const brush = document.getElementById('brush');
const bucket = document.getElementById('fill');
const eraser = document.getElementById('eraser');
const eyedrop = document.getElementById('eyedropper');
const trash = document.getElementById('clear');
const saveButton = document.getElementById('export');
const color = document.getElementById('color');
const size = document.getElementById('size');

let mode = 'brush';
let prevX = 0, prevY = 0;
let brushSize = size.value;

let prevWidth = canvas.width;
let prevHeight = canvas.height;

color.value = 'black';


canvas.addEventListener('mousedown', (e) => startBrush(e));
canvas.addEventListener('mousemove', (e) => moveBrush(e));
canvas.addEventListener('mouseup', () => endBrush());
canvas.addEventListener('mouseout', () => endBrush());

brush.addEventListener('click', () => setColor());
eraser.addEventListener('click', () => erase());
//trash.addEventListener('click', () => resetBtn());
saveButton.addEventListener('click', () => saveFile());
size.addEventListener('input', () => setFont());
color.addEventListener('input', () => setColor());

window.addEventListener('resize', () => rescale());


reset();


function draw(type, x1, y1, x2, y2, c, s) {
    const scale = canvas.width / canvas.offsetWidth;
    const coords = [Math.floor(x1 * scale), Math.floor(y1 * scale), Math.floor(x2 * scale), Math.floor(y2 * scale)];

    let prevC = ctx.strokeStyle;
    let prevF = ctx.lineWidth;
    ctx.strokeStyle = c;
    ctx.lineWidth = s;
    
    ctx.beginPath();

    if (type === 'brush') {
        ctx.moveTo(coords[0], coords[1]);
        ctx.lineTo(coords[2], coords[3]);
    } else if (type === 'dot') {
        ctx.arc(coords[0], coords[1], s/10000000000, 0, 2 * Math.PI);
        ctx.fill();
    } else if (type === 'fill') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const pixel = ctx.getImageData(coords[0], coords[1], 1, 1);
        const [tr, tg, tb] = pixel.data;
        const [fr, fg, fb] = ctx.strokeStyle.replace('#', '').match(/.{2}/g).map(val => parseInt(val, 16));

        if (tr === fr && tg === fg && tb === fb) return;

        const queue = [[coords[0], coords[1]]];
        const visited = new Uint8Array(canvas.width * canvas.height);
        const data = imageData.data;

        function matchColor(x, y) {
            const index = (y * canvas.width + x) * 4;
            const dr = Math.abs(data[index] - tr);
            const dg = Math.abs(data[index + 1] - tg);
            const db = Math.abs(data[index + 2] - tb);
            const tolerance = 12;

            /*console.log(index, data.length);
            console.log('checking', x, y, data[index], data[index + 1], data[index + 2], dr, dg, db);*/

            return dr <= tolerance && dg <= tolerance && db <= tolerance;
        }

        while (queue.length) {
            const [currentX, currentY] = queue.pop();
            const index = currentY * canvas.width + currentX;

            /*console.log('filling', currentX, currentY);
            console.log(matchColor(currentX, currentY));
            console.log(tr, tg, tb, fr, fg, fb);*/

            visited[index] = 1;

            if (matchColor(currentX, currentY)) {
                queue.push([currentX + 1, currentY], [currentX - 1, currentY], [currentX, currentY + 1], [currentX, currentY - 1]);
            }

            const dataIndex = index * 4;
            data[dataIndex] = fr;
            data[dataIndex + 1] = fg;
            data[dataIndex + 2] = fb;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    ctx.stroke();

    ctx.strokeStyle = prevC;
    ctx.lineWidth = prevF;

    console.log('drown');
}

function startBrush(e) {
    if (mode === 'fill') {
        fill(e);
    } else if (mode === 'brush' || mode === 'eraser') {
        draw('dot', e.offsetX, e.offsetY, null, null, ctx.strokeStyle, brushSize);

        socket.emit('draw', { type: 'dot', x1: e.offsetX, y1: e.offsetY, x2: null, y2: null, color: ctx.strokeStyle, size: size.value });

        mode = 'brushing';

        [prevX, prevY] = [e.offsetX, e.offsetY];
    } else if (mode === 'eyedropper') {
        dropEye(e);
    }
}

function moveBrush(e) {
    if (!(mode === 'brushing')) return;

    draw('brush', prevX, prevY, e.offsetX, e.offsetY, ctx.strokeStyle, brushSize);

    socket.emit('draw', { type: 'brush', x1: prevX, y1: prevY, x2: e.offsetX, y2: e.offsetY, color: ctx.strokeStyle, size: size.value});

    [prevX, prevY] = [e.offsetX, e.offsetY];
}

function endBrush() {
    if (mode === 'brushing') {
        mode = 'brush';
    }
}

function fill(e) {
    draw('fill', e.offsetX, e.offsetY, null, null, ctx.strokeStyle, brushSize);

    socket.emit('draw', { type: 'fill', x1: e.offsetX, y1: e.offsetY, x2: null, y2: null, color: ctx.strokeStyle, size: size.value });
}

function dropEye(e) {
    const scale = canvas.width / canvas.offsetWidth;

    const pixel = ctx.getImageData(e.offsetX * scale, e.offsetY * scale, 1, 1);
    const [r,g,b] = pixel.data;

    setColor(c='#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase());
}

function erase() {
    ctx.strokeStyle = 'white';
}

function selectTool(tool) {
    mode = tool;

    const buttons = document.querySelectorAll('.icon');
    buttons.forEach(button => button.classList.remove('active'));

    const selectedButton = document.getElementById(tool);
    selectedButton.classList.add('active');
}

function resetBtn() {
    setFont();
    setColor();

    ctx.lineCap = 'round';
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function saveFile() {
    const imageURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');

    link.href = imageURL;
    link.download = 'drawing.png';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function setFont() {
    brushSize = size.value;
    ctx.lineWidth = brushSize;
}

function setColor(c=color.value) {
    console.log('set color', c);
    color.value = c;
    ctx.strokeStyle = c;
    document.getElementById('color-label').style.backgroundColor = c;
}

function rescale() {
    const cssWidth = canvas.width;
    const cssHeight = canvas.height;

    ctx.scale(cssWidth / prevWidth, cssHeight / prevHeight);

    prevWidth = canvas.width;
    prevHeight = canvas.height;
}

function reset() {
    rescale();
    setFont();
    setColor();

    ctx.lineCap = 'round';
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setColor('green');
    setColor('black');
}

socket.on('connect', () => {
    console.log('connecteddd to server');
    socket.emit('requestCanvasState');
});

socket.on('sendCanvasState', (rows) => {
    console.log('requested done');
    rows.forEach(action => {
        draw(action.type, action.x1, action.y1, action.x2, action.y2, action.color, action.size);
    });
});

socket.on('draw', (data) => {
    draw(data.type, data.x1, data.y1, data.x2, data.y2, data.color, data.size);
});
