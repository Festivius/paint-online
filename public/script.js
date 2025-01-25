const socket = io({
    auth: {
        serverOffset: 0
    },
    ackTimeout: 10000,
    retries: 3
});

const offlineCanvas = document.getElementById('canvas');
const onlineCanvas = document.getElementById('server-canvas');
const offlineCTX = offlineCanvas.getContext('2d');
const onlineCTX = onlineCanvas.getContext('2d');

const brush = document.getElementById('brush');
const bucket = document.getElementById('fill');
const eraser = document.getElementById('eraser');
const eyedrop = document.getElementById('eyedropper');
const trash = document.getElementById('clear');
const saveButton = document.getElementById('export');
const color = document.getElementById('color');
const size = document.getElementById('size');

const switchBtn = document.getElementById('switch-server');


let mode = 'brush';
let prevX = 0, prevY = 0;

let brushSize = 2;

let isOnline = false;

let prevWidth = offlineCanvas.width;
let prevHeight = offlineCanvas.height;

var canvas = offlineCanvas;
var ctx = offlineCTX;


offlineCanvas.addEventListener('mousedown', (e) => startBrush(e));
offlineCanvas.addEventListener('mousemove', (e) => moveBrush(e));
offlineCanvas.addEventListener('mouseup', () => endBrush());
offlineCanvas.addEventListener('mouseout', () => endBrush());
onlineCanvas.addEventListener('mousedown', (e) => startBrush(e));
onlineCanvas.addEventListener('mousemove', (e) => moveBrush(e));
onlineCanvas.addEventListener('mouseup', () => endBrush());
onlineCanvas.addEventListener('mouseout', () => endBrush());

brush.addEventListener('click', () => setColor());
eraser.addEventListener('click', () => erase());
trash.addEventListener('click', () => resetBtn());
saveButton.addEventListener('click', () => saveFile());
size.addEventListener('input', () => setFont());
color.addEventListener('input', () => setColor());

switchBtn.addEventListener('click', () => switchServer());

window.addEventListener('resize', () => rescale());


start();


function draw(type, x1, y1, x2, y2, c, f) {
    console.log(type, x1, y1, x2, y2, c, f);
    if (type === 'brush') {
        const dpr = (window.devicePixelRatio || 1) / 2;
        const coords = [x1 * dpr, y1 * dpr, x2 * dpr, y2 * dpr];
        
        ctx.beginPath();
        ctx.moveTo(coords[0], coords[1]);
        ctx.lineTo(coords[2]+1, coords[3]+1);
        ctx.strokeStyle = c;
        ctx.lineWidth = f;
        ctx.stroke();

        console.log('drown');
    }
}

function startBrush(e) {
    if (mode === 'fill') {
        fill(e);
    } else if (mode === 'brush' || mode === 'eraser') {
        const dpr = (window.devicePixelRatio || 1) / 2;

        ctx.beginPath();
        ctx.arc(e.offsetX * dpr, e.offsetY * dpr, size.value/10000000000, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        mode = 'brushing';
        [prevX, prevY] = [e.offsetX * dpr, e.offsetY * dpr];
    } else if (mode === 'eyedropper') {
        dropEye(e);
    }
}

function moveBrush(e) {
    if (!(mode === 'brushing')) return;

    const dpr = (window.devicePixelRatio || 1) / 2;
    x = e.offsetX * dpr;
    y = e.offsetY * dpr;

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (isOnline) {
        console.log('boo');
        socket.emit('draw', { type: 'brush', x1: prevX, y1: prevY, x2: x, y2: y, color: ctx.strokeStyle, size: brushSize });
    }

    [prevX, prevY] = [x, y];
}

function endBrush() {
    if (mode === 'brushing') {
        mode = 'brush';
    }
}

function fill(e) {
    setColor();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const dpr = window.devicePixelRatio || 1;
    const scaledX = Math.floor(e.offsetX * dpr);
    const scaledY = Math.floor(e.offsetY * dpr);

    const pixel = ctx.getImageData(scaledX, scaledY, 1, 1);
    const [tr, tg, tb] = pixel.data;
    const [fr, fg, fb] = ctx.strokeStyle.replace('#', '').match(/.{2}/g).map(val => parseInt(val, 16));

    if (tr === fr && tg === fg && tb === fb) return;

    const queue = [[scaledX, scaledY]];
    const visited = new Uint8Array(canvas.width * canvas.height);
    const data = imageData.data;

    function matchColor(x, y) {
        const index = (y * canvas.width + x) * 4;
        const dr = Math.abs(data[index] - tr);
        const dg = Math.abs(data[index + 1] - tg);
        const db = Math.abs(data[index + 2] - tb);
        const tolerance = 12;

        return dr <= tolerance && dg <= tolerance && db <= tolerance;
    }

    while (queue.length) {
        const [currentX, currentY] = queue.pop();
        const index = currentY * canvas.width + currentX;

        if (currentX < 0 || currentX >= canvas.width || currentY < 0 || currentY >= canvas.height || visited[index]) continue;
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

function dropEye(e) {
    const dpr = window.devicePixelRatio || 1;
    const scaledX = Math.floor(e.offsetX * dpr);
    const scaledY = Math.floor(e.offsetY * dpr);

    const pixel = ctx.getImageData(scaledX, scaledY, 1, 1);
    const [r,g,b] = pixel.data;

    setColor(c='#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase());
}

function selectTool(tool) {
    mode = tool;

    const buttons = document.querySelectorAll('.icon');
    buttons.forEach(button => button.classList.remove('active'));

    const selectedButton = document.getElementById(tool);
    selectedButton.classList.add('active');
}

function erase() {
    ctx.strokeStyle = 'white';
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
    color.value = c;
    ctx.strokeStyle = c;
    document.getElementById('color-label').style.backgroundColor = c;
}

function rescaleCanvas(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth;
    const cssHeight = canvas.offsetHeight;

    if (cssWidth !== canvas.width / dpr || cssHeight !== canvas.height / dpr) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;

        ctx.putImageData(imageData, 0, 0);
        ctx.scale(dpr, dpr);
    }
}

function rescale() {
    rescaleCanvas(offlineCanvas, offlineCTX);
    rescaleCanvas(onlineCanvas, onlineCTX);

    setColor();
    setFont();
    ctx.lineCap = 'round';
}

function reset() {
    rescale();
    setFont();
    setColor();
    clearCanvas();
    ctx.strokeStyle = "black";
}

function switchServer() {
    isOnline = !isOnline;
    if (isOnline) {
        canvas = onlineCanvas;
        ctx = onlineCTX;
        onlineCanvas.style.visibility = 'visible';
        offlineCanvas.style.visibility = 'hidden';
        switchBtn.textContent = 'Go to Local Canvas';
    } else {
        canvas = offlineCanvas;
        ctx = offlineCTX;
        offlineCanvas.style.visibility = 'visible';
        onlineCanvas.style.visibility = 'hidden';
        switchBtn.textContent = 'Go to Online Canvas';
    }
    console.log(isOnline);
}

function clearCanvas() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function start() {
    reset();
    switchServer();
    clearCanvas();
    ctx.lineCap = 'round';
}


socket.on('draw', (data) => {
    draw(data.type, data.x1, data.y1, data.x2, data.y2, data.color, data.size)
});
