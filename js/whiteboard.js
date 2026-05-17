const svgs = {
    battery: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="0" width="10" height="10" fill="#ddd"/><rect x="70" y="0" width="10" height="10" fill="#ddd"/><circle cx="25" cy="0" r="4" fill="#eee"/><polygon points="70,0 75,-5 80,0" fill="#eee"/><rect x="5" y="10" width="90" height="90" rx="8" fill="#222"/><rect x="5" y="10" width="90" height="25" rx="8" fill="#FF2A3A"/><text x="50" y="70" font-family="sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">9V</text><text x="25" y="30" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="bold">+</text><text x="75" y="30" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle" font-weight="bold">-</text></svg>`,
    led: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="50" width="6" height="25" fill="#ccc"/><rect x="72" y="50" width="6" height="25" fill="#ccc"/><path d="M 15 50 L 85 50 L 85 40 L 15 40 Z" fill="#800000"/><path d="M 15 40 C 15 -10 85 -10 85 40 Z" fill="#b30000" opacity="0.9"/><text x="25" y="90" font-family="sans-serif" font-size="24" fill="#ff4757" font-weight="bold" text-anchor="middle">+</text><text x="75" y="90" font-family="sans-serif" font-size="24" fill="#ccc" font-weight="bold" text-anchor="middle">-</text></svg>`,
    led_active: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="glow" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#ffcccc"/><stop offset="50%" stop-color="#ff0000"/><stop offset="100%" stop-color="#990000"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs><rect x="22" y="50" width="6" height="25" fill="#ccc"/><rect x="72" y="50" width="6" height="25" fill="#ccc"/><path d="M 15 40 C 15 -10 85 -10 85 40 Z" fill="#ff0000" filter="url(#blur)" opacity="0.6"/><path d="M 15 50 L 85 50 L 85 40 L 15 40 Z" fill="#cc0000"/><path d="M 15 40 C 15 -10 85 -10 85 40 Z" fill="url(#glow)"/><path d="M 25 35 C 25 10 40 10 40 35 Z" fill="#ffffff" opacity="0.8"/><text x="25" y="90" font-family="sans-serif" font-size="24" fill="#ff4757" font-weight="bold" text-anchor="middle">+</text><text x="75" y="90" font-family="sans-serif" font-size="24" fill="#ccc" font-weight="bold" text-anchor="middle">-</text></svg>`,
    resistor: `<svg width="100" height="50" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="23" width="100" height="4" fill="#ccc"/><path d="M 20 15 L 80 15 C 85 15 85 35 80 35 L 20 35 C 15 35 15 15 20 15 Z" fill="#d3a77a" stroke="#a67c52" stroke-width="2"/><rect x="30" y="15" width="6" height="20" fill="#cc0000"/><rect x="45" y="15" width="6" height="20" fill="#000000"/><rect x="60" y="15" width="6" height="20" fill="#cc0000"/><rect x="75" y="15" width="4" height="20" fill="#b8860b"/></svg>`,
    motor: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="45" y="0" width="10" height="20" fill="#888"/><circle cx="50" cy="50" r="40" fill="#ddd" stroke="#999" stroke-width="2"/><circle cx="50" cy="50" r="25" fill="#eee" stroke="#aaa" stroke-width="2"/><text x="50" y="58" font-family="sans-serif" font-size="24" font-weight="bold" fill="#666" text-anchor="middle">M</text><rect x="20" y="80" width="10" height="20" fill="#ffd700"/><rect x="70" y="80" width="10" height="20" fill="#ffd700"/></svg>`
};

const componentImages = {};

let wbCanvas = null;
let wbCtx = null;
let wbMode = 'move'; 
let wbCurrentColor = '#F0F2FF';
let wbCurrentComp = '';
let wbElements = [];
let wbCurrentPath = null;
let wbPreviewWire = null;
let wbIsDrawing = false;
let wbDraggingElement = null;
let wbSelectedElement = null; 
let wbLastPos = null;
let wbIsRunning = false;
let wbAnimationFrame = null;

// Undo/Redo tracking system
let wbHistory = [];
let wbHistoryIndex = -1;

window.wbSaveState = () => {
    // Truncate redo history if we performed action after an undo
    wbHistory = wbHistory.slice(0, wbHistoryIndex + 1);
    const snapshot = wbElements.map(el => {
        const copy = { ...el };
        if (el.type === 'freehand') {
            copy.points = el.points.map(pt => ({ ...pt }));
        }
        return copy;
    });
    wbHistory.push(snapshot);
    wbHistoryIndex = wbHistory.length - 1;
};

window.wbUndo = () => {
    if (wbHistoryIndex > 0) {
        wbHistoryIndex--;
        restoreFromHistoryState(wbHistory[wbHistoryIndex]);
        wbSelectedElement = null;
        if (window.wbUpdatePropertiesPanel) window.wbUpdatePropertiesPanel();
        if (!wbIsRunning) wbRedraw();
        else simulateCircuit();
    }
};

window.wbRedo = () => {
    if (wbHistoryIndex < wbHistory.length - 1) {
        wbHistoryIndex++;
        restoreFromHistoryState(wbHistory[wbHistoryIndex]);
        wbSelectedElement = null;
        if (window.wbUpdatePropertiesPanel) window.wbUpdatePropertiesPanel();
        if (!wbIsRunning) wbRedraw();
        else simulateCircuit();
    }
};

function restoreFromHistoryState(state) {
    wbElements = state.map(el => {
        const copy = { ...el };
        if (el.type === 'freehand') {
            copy.points = el.points.map(pt => ({ ...pt }));
        } else if (el.type === 'component' && el.compType === 'resistor') {
            window.wbRegenerateResistorImage(copy);
        }
        return copy;
    });
}

// Rotation tracking calculations
function getRotatedTerminal(el, rx, ry) {
    const rot = el.rotation || 0;
    if (rot === 90) return { x: el.x - ry, y: el.y + rx };
    if (rot === 180) return { x: el.x - rx, y: el.y - ry };
    if (rot === 270) return { x: el.x + ry, y: el.y - rx };
    return { x: el.x + rx, y: el.y + ry };
}

window.wbRotateSelected = () => {
    if (wbSelectedElement && wbSelectedElement.type === 'component') {
        wbSelectedElement.rotation = ((wbSelectedElement.rotation || 0) + 90) % 360;
        wbSaveState();
        if (wbIsRunning) {
            simulateCircuit();
        } else {
            wbRedraw();
        }
    }
};

// Keyboard listener for undo/redo
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        window.wbUndo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        window.wbRedo();
    }
});

window.initWhiteboard = () => {
    wbCanvas = document.getElementById('whiteboardCanvas');
    if (!wbCanvas) return;
    wbCtx = wbCanvas.getContext('2d');
    
    // Preload SVG images
    for (const [key, svgStr] of Object.entries(svgs)) {
        if (!componentImages[key]) {
            const img = new Image();
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
            componentImages[key] = img;
        }
    }
    
    if (wbAnimationFrame) cancelAnimationFrame(wbAnimationFrame);
    wbIsRunning = false;
    
    // Reset state & save initial empty board state
    wbElements = [];
    wbHistory = [];
    wbHistoryIndex = -1;
    wbSaveState();
    
    const resizeCanvas = () => {
        if (!wbCanvas || !wbCanvas.parentElement) return;
        const rect = wbCanvas.parentElement.getBoundingClientRect();
        wbCanvas.width = rect.width;
        wbCanvas.height = rect.height;
        wbRedraw();
    };
    
    if (!window.wbResizeAttached) {
        window.addEventListener('resize', resizeCanvas);
        window.wbResizeAttached = true;
    }
    setTimeout(resizeCanvas, 50);

    const getPos = (e) => {
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        const rect = wbCanvas.getBoundingClientRect();
        let x = clientX - rect.left;
        let y = clientY - rect.top;
        
        if (wbMode === 'component' || wbMode === 'wire' || wbMode === 'move') {
            x = Math.round(x / 25) * 25;
            y = Math.round(y / 25) * 25;
        }
        return { x, y };
    };

    const handleDown = (e) => {
        const pos = getPos(e);
        
        if (wbMode === 'move') {
            const el = getElementAt(pos);
            wbSelectedElement = el; 
            if (window.wbUpdatePropertiesPanel) window.wbUpdatePropertiesPanel();
            
            if (el) {
                wbDraggingElement = el;
                wbDraggingElement._dragStartPos = { x: el.x, y: el.y }; // Store start pos to check for actual movement
                wbLastPos = pos;
                wbIsDrawing = true;
            }
        } else {
            wbSelectedElement = null;
            if (window.wbUpdatePropertiesPanel) window.wbUpdatePropertiesPanel();
            
            wbIsDrawing = true;
            if (wbMode === 'pen') {
                const rawPos = { x: e.clientX - wbCanvas.getBoundingClientRect().left, y: e.clientY - wbCanvas.getBoundingClientRect().top };
                wbCurrentPath = { type: 'freehand', color: wbCurrentColor, points: [rawPos] };
            } else if (wbMode === 'wire') {
                wbPreviewWire = { type: 'wire', color: wbCurrentColor, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, flowing: false, flowDir: 1 };
            } else if (wbMode === 'component') {
                const el = { type: 'component', compType: wbCurrentComp, x: pos.x, y: pos.y, active: false, rotation: 0 };
                if (wbCurrentComp === 'resistor') {
                    el.resistance = 220;
                    if(window.wbRegenerateResistorImage) window.wbRegenerateResistorImage(el);
                }
                wbElements.push(el);
                wbSelectedElement = el; 
                wbSaveState(); // Save component placement
                if (window.wbUpdatePropertiesPanel) window.wbUpdatePropertiesPanel();
                if (!wbIsRunning) wbRedraw();
                wbIsDrawing = false; 
            } else if (wbMode === 'erase') {
                eraseElementAt(pos);
                wbIsDrawing = false;
            }
        }
    };

    const handleMove = (e) => {
        if (!wbIsDrawing) return;
        if (e.cancelable) e.preventDefault();
        const pos = getPos(e);

        if (wbMode === 'move' && wbDraggingElement) {
            const dx = pos.x - wbLastPos.x;
            const dy = pos.y - wbLastPos.y;
            if (dx !== 0 || dy !== 0) {
                offsetElement(wbDraggingElement, dx, dy);
                wbLastPos = pos;
                if (!wbIsRunning) wbRedraw();
            }
        } else if (wbMode === 'pen' && wbCurrentPath) {
            const rawPos = { x: e.clientX - wbCanvas.getBoundingClientRect().left, y: e.clientY - wbCanvas.getBoundingClientRect().top };
            wbCurrentPath.points.push(rawPos);
            if (!wbIsRunning) wbRedraw();
        } else if (wbMode === 'wire' && wbPreviewWire) {
            if (Math.abs(pos.x - wbPreviewWire.x1) > Math.abs(pos.y - wbPreviewWire.y1)) {
                wbPreviewWire.x2 = pos.x;
                wbPreviewWire.y2 = wbPreviewWire.y1;
            } else {
                wbPreviewWire.x2 = wbPreviewWire.x1;
                wbPreviewWire.y2 = pos.y;
            }
            if (!wbIsRunning) wbRedraw();
        }
    };

    const handleUp = (e) => {
        if (!wbIsDrawing) return;
        wbIsDrawing = false;
        
        if (wbMode === 'move' && wbDraggingElement) {
            // Save state if element was actually dragged/moved
            const start = wbDraggingElement._dragStartPos;
            if (start && (wbDraggingElement.x !== start.x || wbDraggingElement.y !== start.y)) {
                wbSaveState();
            }
            delete wbDraggingElement._dragStartPos;
            wbDraggingElement = null;
        } else if (wbMode === 'pen' && wbCurrentPath) {
            wbElements.push(wbCurrentPath);
            wbSaveState();
            wbCurrentPath = null;
        } else if (wbMode === 'wire' && wbPreviewWire) {
            const dist = Math.hypot(wbPreviewWire.x2 - wbPreviewWire.x1, wbPreviewWire.y2 - wbPreviewWire.y1);
            if(dist > 5) {
                wbElements.push(wbPreviewWire);
                wbSaveState();
            }
            wbPreviewWire = null;
        }
        if (!wbIsRunning) wbRedraw();
    };

    wbCanvas.addEventListener('mousedown', handleDown);
    wbCanvas.addEventListener('mousemove', handleMove);
    wbCanvas.addEventListener('mouseup', handleUp);
    wbCanvas.addEventListener('mouseout', handleUp);
    wbCanvas.addEventListener('touchstart', handleDown, {passive: false});
    wbCanvas.addEventListener('touchmove', handleMove, {passive: false});
    wbCanvas.addEventListener('touchend', handleUp);
    wbCanvas.addEventListener('touchcancel', handleUp);
    
    wbRedraw();
};

window.wbSetMode = (mode, val) => {
    wbMode = mode;
    if (mode === 'pen' || mode === 'wire') wbCurrentColor = val;
    if (mode === 'component') wbCurrentComp = val;
    if (mode !== 'move') {
        wbSelectedElement = null;
        if(window.wbUpdatePropertiesPanel) window.wbUpdatePropertiesPanel();
    }
};

window.wbClear = () => {
    wbElements = [];
    wbSelectedElement = null;
    wbSaveState(); // Save cleared board state
    if(window.wbUpdatePropertiesPanel) window.wbUpdatePropertiesPanel();
    if (!wbIsRunning) wbRedraw();
};

// PHYSICS SIMULATION LOGIC
function simulateCircuit() {
    // Reset state
    for (const el of wbElements) {
        if (el.type === 'wire') el.flowing = false;
        if (el.type === 'component') el.active = false;
    }

    const nodes = {}; 
    const edges = [];

    function addEdge(n1, n2, type, ref, directed=false) {
        if (!nodes[n1]) nodes[n1] = [];
        if (!nodes[n2]) nodes[n2] = [];
        const edge = { n1, n2, type, ref, directed };
        edges.push(edge);
        nodes[n1].push(edge);
        if (!directed) {
            nodes[n2].push({ n1: n2, n2: n1, type, ref, directed: false, originalEdge: edge });
        }
    }

    const batteries = [];
    for (const el of wbElements) {
        if (el.type === 'wire') {
            addEdge(`${el.x1},${el.y1}`, `${el.x2},${el.y2}`, 'wire', el, false);
        } else if (el.type === 'component') {
            if (el.compType === 'battery') {
                const posT = getRotatedTerminal(el, -25, -50);
                const negT = getRotatedTerminal(el, 25, -50);
                batteries.push({ pos: `${posT.x},${posT.y}`, neg: `${negT.x},${negT.y}`, ref: el });
            } else if (el.compType === 'led') {
                const posT = getRotatedTerminal(el, -25, 25);
                const negT = getRotatedTerminal(el, 25, 25);
                addEdge(`${posT.x},${posT.y}`, `${negT.x},${negT.y}`, 'led', el, true); // Anode to Cathode ONLY
            } else if (el.compType === 'resistor') {
                const t1 = getRotatedTerminal(el, -50, 0);
                const t2 = getRotatedTerminal(el, 50, 0);
                addEdge(`${t1.x},${t1.y}`, `${t2.x},${t2.y}`, 'resistor', el, false);
            } else if (el.compType === 'motor') {
                const t1 = getRotatedTerminal(el, -25, 50);
                const t2 = getRotatedTerminal(el, 25, 50);
                addEdge(`${t1.x},${t1.y}`, `${t2.x},${t2.y}`, 'motor', el, false);
            }
        }
    }

    // Depth First Search to find closed loops from Positive to Negative of any battery
    for (const bat of batteries) {
        const visited = new Set();
        const path = [];
        
        function dfs(currNode) {
            if (currNode === bat.neg) {
                bat.ref.active = true;
                for (const edge of path) {
                    if (edge.type === 'wire') {
                        const realEdge = edge.originalEdge || edge;
                        realEdge.ref.flowing = true;
                        realEdge.ref.flowDir = (realEdge.n1 === edge.n1) ? 1 : -1;
                    } else if (edge.type === 'led' || edge.type === 'resistor' || edge.type === 'motor') {
                        edge.ref.active = true;
                    }
                }
                return true; 
            }
            
            visited.add(currNode);
            let found = false;
            if (nodes[currNode]) {
                for (const edge of nodes[currNode]) {
                    if (!visited.has(edge.n2)) {
                        path.push(edge);
                        if (dfs(edge.n2)) found = true; 
                        path.pop();
                    }
                }
            }
            visited.delete(currNode);
            return found;
        }
        dfs(bat.pos);
    }
}

window.wbToggleRun = () => {
    wbIsRunning = !wbIsRunning;
    const btn = document.getElementById('wbRunBtn');
    if (wbIsRunning) {
        if (btn) {
            btn.innerHTML = '🛑 Stop Simulation';
            btn.style.background = 'var(--red)';
            btn.style.color = 'white';
            btn.style.boxShadow = '0 0 15px rgba(255,71,87,0.8)';
        }
        simulateCircuit(); 
        wbAnimationLoop();
    } else {
        if (btn) {
            btn.innerHTML = '▶️ Run Circuit';
            btn.style.background = 'var(--green)';
            btn.style.color = 'black';
            btn.style.boxShadow = '0 0 10px rgba(0,255,136,0.5)';
        }
        if (wbAnimationFrame) cancelAnimationFrame(wbAnimationFrame);
        for (const el of wbElements) {
            if (el.type === 'wire') el.flowing = false;
            if (el.type === 'component') el.active = false;
        }
        wbRedraw();
    }
};

function wbAnimationLoop() {
    if (!wbIsRunning) return;
    wbRedraw(); 
    const time = Date.now() / 1000; 
    const speed = 0.8; 
    
    for (const el of wbElements) {
        if (el.type === 'wire' && el.flowing) {
            const length = Math.hypot(el.x2 - el.x1, el.y2 - el.y1);
            if (length === 0) continue;
            const numDots = Math.max(1, Math.floor(length / 30)); 
            for (let i = 0; i < numDots; i++) {
                let t = ((time * speed) + (i / numDots)) % 1.0;
                if (el.flowDir === -1) t = 1 - t; // Reverse flow
                
                const dotX = el.x1 + (el.x2 - el.x1) * t;
                const dotY = el.y1 + (el.y2 - el.y1) * t;
                wbCtx.beginPath();
                wbCtx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                wbCtx.fillStyle = '#00FF88';
                wbCtx.shadowColor = '#00FF88';
                wbCtx.shadowBlur = 10;
                wbCtx.fill();
                wbCtx.shadowBlur = 0; 
            }
        }
    }
    wbAnimationFrame = requestAnimationFrame(wbAnimationLoop);
}

// Draw a realistic golden PCB solder pad grid
function drawPCBGrid() {
    if (!wbCtx || !wbCanvas) return;
    const gridSize = 25;
    wbCtx.fillStyle = 'rgba(212, 175, 55, 0.25)'; // Gold copper solder pad color
    for (let x = gridSize; x < wbCanvas.width; x += gridSize) {
        for (let y = gridSize; y < wbCanvas.height; y += gridSize) {
            wbCtx.beginPath();
            wbCtx.arc(x, y, 2.5, 0, Math.PI * 2);
            wbCtx.fill();
        }
    }
}

function wbRedraw() {
    if (!wbCtx || !wbCanvas) return;
    wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
    
    // Draw the gold copper pads first
    drawPCBGrid();
    
    wbCtx.lineCap = 'round';
    wbCtx.lineJoin = 'round';

    for (const el of wbElements) drawElement(el);
    if (wbCurrentPath) drawElement(wbCurrentPath);
    if (wbPreviewWire) drawElement(wbPreviewWire);
}

function drawElement(el) {
    if (el.type === 'freehand') {
        if (el.points.length < 2) return;
        wbCtx.beginPath();
        wbCtx.lineWidth = 3;
        wbCtx.strokeStyle = el.color;
        wbCtx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
            wbCtx.lineTo(el.points[i].x, el.points[i].y);
        }
        wbCtx.stroke();
    } else if (el.type === 'wire') {
        wbCtx.beginPath();
        wbCtx.lineWidth = 6;
        wbCtx.strokeStyle = el.color;
        wbCtx.moveTo(el.x1, el.y1);
        wbCtx.lineTo(el.x2, el.y2);
        wbCtx.stroke();
        
        wbCtx.fillStyle = el.color;
        wbCtx.beginPath(); wbCtx.arc(el.x1, el.y1, 6, 0, Math.PI*2); wbCtx.fill();
        wbCtx.beginPath(); wbCtx.arc(el.x2, el.y2, 6, 0, Math.PI*2); wbCtx.fill();
    } else if (el.type === 'component') {
        drawComponent(el, el.x, el.y);
    }
}

function drawComponent(el, x, y) {
    wbCtx.save();
    wbCtx.translate(x, y);
    
    // Rotate component relative to its center coordinate
    const rot = el.rotation || 0;
    if (rot !== 0) {
        wbCtx.rotate(rot * Math.PI / 180);
    }
    
    const type = el.compType;
    
    if (type === 'battery' && componentImages.battery?.complete) {
        wbCtx.drawImage(componentImages.battery, -50, -50, 100, 100);
    } else if (type === 'led') {
        if (el.active && wbIsRunning && componentImages.led_active?.complete) {
            wbCtx.drawImage(componentImages.led_active, -50, -50, 100, 100);
        } else if (componentImages.led?.complete) {
            wbCtx.drawImage(componentImages.led, -50, -50, 100, 100);
        }
    } else if (type === 'resistor') {
        const img = el.customImage || componentImages.resistor;
        if (img && img.complete) {
            wbCtx.drawImage(img, -50, -25, 100, 50);
        }
    } else if (type === 'motor' && componentImages.motor?.complete) {
        wbCtx.drawImage(componentImages.motor, -50, -50, 100, 100);
        if (el.active && wbIsRunning) {
            const time = Date.now() / 100;
            wbCtx.save();
            wbCtx.translate(0, -50); 
            wbCtx.rotate(time);
            wbCtx.fillStyle = '#f00';
            wbCtx.beginPath(); wbCtx.arc(0, 8, 4, 0, Math.PI*2); wbCtx.fill();
            wbCtx.restore();
        }
    }
    
    // Draw gold selected border if active component edit panel is open
    if (wbSelectedElement === el && wbMode === 'move') {
        wbCtx.strokeStyle = 'var(--cyan)';
        wbCtx.lineWidth = 2;
        wbCtx.setLineDash([5, 5]);
        wbCtx.strokeRect(-52, -52, 104, 104);
        wbCtx.setLineDash([]);
    }
    
    wbCtx.restore();
}

function getElementAt(pos) {
    const threshold = 20; 
    for (let i = wbElements.length - 1; i >= 0; i--) {
        const el = wbElements[i];
        if (el.type === 'freehand') {
            for (const pt of el.points) {
                if (Math.hypot(pt.x - pos.x, pt.y - pos.y) < threshold) return el;
            }
        } else if (el.type === 'wire') {
            const dist = distToSegment(pos, {x: el.x1, y: el.y1}, {x: el.x2, y: el.y2});
            if (dist < threshold) return el;
        } else if (el.type === 'component') {
            if (Math.hypot(el.x - pos.x, el.y - pos.y) < 40) return el;
        }
    }
    return null;
}

function eraseElementAt(pos) {
    const el = getElementAt(pos);
    if (el) {
        const index = wbElements.indexOf(el);
        if (index > -1) {
            wbElements.splice(index, 1);
            wbSaveState(); // Save deletion state
            if (!wbIsRunning) wbRedraw();
        }
    }
}

function offsetElement(el, dx, dy) {
    if (el.type === 'freehand') {
        for (const pt of el.points) {
            pt.x += dx;
            pt.y += dy;
        }
    } else if (el.type === 'wire') {
        el.x1 += dx;
        el.y1 += dy;
        el.x2 += dx;
        el.y2 += dy;
    } else if (el.type === 'component') {
        el.x += dx;
        el.y += dy;
    }
}

function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
function distToSegmentSquared(p, v, w) {
  let l2 = dist2(v, w);
  if (l2 === 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }

// Properties Panel Logic
window.wbUpdatePropertiesPanel = () => {
    const panel = document.getElementById('wbPropertiesPanel');
    const rDiv = document.getElementById('wbPropResistor');
    const bDiv = document.getElementById('wbPropBattery');
    const title = document.getElementById('wbPropTitle');
    if (!panel) return;

    if (!wbSelectedElement || wbSelectedElement.type !== 'component') {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    rDiv.style.display = 'none';
    bDiv.style.display = 'none';
    title.innerText = wbSelectedElement.compType.toUpperCase();

    if (wbSelectedElement.compType === 'resistor') {
        title.innerText = 'Resistor';
        rDiv.style.display = 'flex';
        document.getElementById('wbResistorValue').value = wbSelectedElement.resistance || 220;
    } else if (wbSelectedElement.compType === 'battery') {
        title.innerText = '9V Battery';
        bDiv.style.display = 'flex';
    }
};

window.wbUpdateComponent = () => {
    if (wbSelectedElement && wbSelectedElement.compType === 'resistor') {
        let val = parseInt(document.getElementById('wbResistorValue').value);
        if (isNaN(val) || val < 1) val = 1;
        wbSelectedElement.resistance = val;
        window.wbRegenerateResistorImage(wbSelectedElement);
        wbSaveState(); // Save property updates
        if (!wbIsRunning) wbRedraw();
    }
};

function getResistorBands(ohms) {
    const colors = ['#000000', '#8B4513', '#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF', '#EE82EE', '#808080', '#FFFFFF'];
    let s = ohms.toString();
    let d1, d2, mult;
    if (ohms < 10) {
        d1 = 0;
        d2 = ohms;
        mult = 0;
    } else {
        d1 = parseInt(s[0]);
        d2 = parseInt(s[1]);
        mult = s.length - 2; 
    }
    if (mult > 9) mult = 9;
    return { c1: colors[d1], c2: colors[d2], c3: colors[mult], c4: '#b8860b' };
}

window.wbRegenerateResistorImage = (el) => {
    const bands = getResistorBands(el.resistance);
    const svgStr = `<svg width="100" height="50" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="23" width="100" height="4" fill="#ccc"/><path d="M 20 15 L 80 15 C 85 15 85 35 80 35 L 20 35 C 15 35 15 15 20 15 Z" fill="#d3a77a" stroke="#a67c52" stroke-width="2"/><rect x="30" y="15" width="6" height="20" fill="${bands.c1}"/><rect x="45" y="15" width="6" height="20" fill="${bands.c2}"/><rect x="60" y="15" width="6" height="20" fill="${bands.c3}"/><rect x="75" y="15" width="4" height="20" fill="${bands.c4}"/></svg>`;
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    img.onload = () => { if (!wbIsRunning) wbRedraw(); };
    el.customImage = img;
};
