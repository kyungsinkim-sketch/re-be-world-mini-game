// Re-Be World Collision Map Editor
// Optimized for Large Background Image

class MapEditor {
    constructor() {
        // Canvas and context
        this.canvas = document.getElementById('mapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;

        // Settings
        this.tileSize = 32;
        this.selectedTile = 1; // 1 = Collision, 0 = Empty

        // Map data (Game defaults)
        this.mapWidth = 120;
        this.mapHeight = 168;
        this.map = [];

        // UI state
        this.currentMapType = 'world'; // 'world' or 'tavern'
        this.currentTool = 'pencil';
        this.zoom = 0.4;
        this.isPainting = false;
        this.isPanning = false;

        // Undo/Redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 50;

        // Load Background Image
        this.bgImage = new Image();
        this.bgImage.src = 'Re-Be_World.jpeg';

        // Load Tileset (for symbols if needed)
        this.tilesetImage = new Image();
        this.tilesetImage.src = 'New_Tileset.png';

        Promise.all([
            new Promise(res => this.bgImage.onload = res),
            new Promise(res => this.tilesetImage.onload = res)
        ]).then(() => {
            this.init();
        });

        this.bgImage.onerror = () => this.showStatus('Background image load failed', 'error');
    }

    init() {
        console.log('MapEditor initializing...');
        this.initializeMap();
        // this.loadDefaultMap(); // Replaced by initial switchMap call or manual load
        this.loadMapData('default_map.json');
        this.setupEventListeners();
        this.render();
        this.updateUI();
        this.canvas.style.transform = `scale(${this.zoom})`;
        this.showStatus('Ready to map collisions!');
    }

    initializeMap() {
        this.map = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.map[y] = Array(this.mapWidth).fill(0);
        }
    }

    async loadMapData(filename) {
        try {
            // Try to load map from game assets if possible, or local
            const response = await fetch(filename);
            if (response.ok) {
                const data = await response.json();
                this.mapWidth = data.width || (this.currentMapType === 'tavern' ? 40 : 120);
                this.mapHeight = data.height || (this.currentMapType === 'tavern' ? 30 : 168);
                this.map = data.mapData;
                this.showStatus(`Loaded ${filename}`);
            } else {
                throw new Error('File not found');
            }
        } catch (e) {
            console.log('Map file not found, creating new one');
            this.initializeMap();
        }
        this.resizeCanvas();
    }

    switchMap(type) {
        this.currentMapType = type;
        this.undoStack = [];
        this.redoStack = [];

        if (type === 'tavern') {
            this.bgImage.src = 'tavern_frame1.jpg';
        } else {
            this.bgImage.src = 'Re-Be_World.jpeg';
        }

        this.bgImage.onload = () => {
            // Auto-calculate map dimensions from image
            const imgW = Math.ceil(this.bgImage.width / this.tileSize);
            const imgH = Math.ceil(this.bgImage.height / this.tileSize);

            this.mapWidth = imgW;
            this.mapHeight = imgH;

            const filename = type === 'tavern' ? 'tavern_map.json' : 'default_map.json';
            this.loadMapData(filename);
        };
    }

    resizeCanvas() {
        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;
        this.render();
    }

    setupEventListeners() {
        this.wrapper = document.getElementById('canvasWrapper');

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));

        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setTool(e.target.dataset.tool));
        });

        // Zoom controls
        document.getElementById('zoomIn').onclick = () => this.changeZoom(0.1);
        document.getElementById('zoomOut').onclick = () => this.changeZoom(-0.1);
        document.getElementById('zoomReset').onclick = () => this.resetZoom();

        // Undo/Redo Buttons
        document.getElementById('undo').onclick = () => this.undo();
        document.getElementById('redo').onclick = () => this.redo();

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) this.redo(); else this.undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });

        // 마우스 휠 줌 (Ctrl/Meta 키 조합)
        this.wrapper.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.changeZoom(e.deltaY > 0 ? -0.1 : 0.1);
            }
        }, { passive: false });

        document.getElementById('saveMap').onclick = () => this.saveMap();
        document.getElementById('exportJSON').onclick = () => this.exportForGame();
        document.getElementById('showGrid').onchange = () => this.render();
        document.getElementById('mapSelector').onchange = (e) => this.switchMap(e.target.value);

        // Reset Map
        const resetBtn = document.getElementById('resetMap');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm('현재 맵을 초기화하시겠습니까? (되돌릴 수 없습니다)')) {
                    if (this.bgImage.src && this.bgImage.complete) {
                        this.mapWidth = Math.ceil(this.bgImage.width / this.tileSize);
                        this.mapHeight = Math.ceil(this.bgImage.height / this.tileSize);
                    }
                    this.initializeMap();
                    this.resizeCanvas();
                    this.showStatus('Map reset to blank.');
                }
            };
        }

        // Load Map Handler
        const fileInput = document.getElementById('fileInput');
        if (document.getElementById('loadMap')) {
            document.getElementById('loadMap').onclick = () => fileInput.click();
        }

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.mapData) {
                        this.map = data.mapData;
                        this.mapWidth = data.width || this.map[0].length;
                        this.mapHeight = data.height || this.map.length;
                        // Update UI inputs
                        document.getElementById('mapWidth').value = this.mapWidth;
                        document.getElementById('mapHeight').value = this.mapHeight;
                        this.resizeCanvas();
                        this.showStatus('Map loaded successfully!');
                    } else {
                        this.showStatus('Invalid map file format', 'error');
                    }
                } catch (err) {
                    this.showStatus('Error parsing map file', 'error');
                    console.error(err);
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        };
    }

    saveState() {
        const state = this.map.map(row => [...row]);
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxStackSize) this.undoStack.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const currentState = this.map.map(row => [...row]);
        this.redoStack.push(currentState);
        this.map = this.undoStack.pop();
        this.render();
        this.showStatus('Undo 실행됨');
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const currentState = this.map.map(row => [...row]);
        this.undoStack.push(currentState);
        this.map = this.redoStack.pop();
        this.render();
        this.showStatus('Redo 실행됨');
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const border = 50 * this.zoom; // CSS border size scaled

        const x = (e.clientX - rect.left - border) / this.zoom;
        const y = (e.clientY - rect.top - border) / this.zoom;

        return {
            x: Math.floor(x / this.tileSize),
            y: Math.floor(y / this.tileSize)
        };
    }

    onMouseDown(e) {
        if (this.currentTool === 'hand' || e.button === 1) {
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        const pos = this.getCanvasCoordinates(e);
        if (this.currentTool === 'inspect') {
            this.applyTool(pos.x, pos.y);
            return;
        }

        this.saveState();
        this.isPainting = true;
        this.applyTool(pos.x, pos.y);
    }

    onMouseMove(e) {
        const pos = this.getCanvasCoordinates(e);
        document.getElementById('cursorPos').textContent = `Grid: ${pos.x}, ${pos.y}`;

        if (this.isPanning) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.wrapper.scrollLeft -= dx;
            this.wrapper.scrollTop -= dy;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            return;
        }

        if (!this.isPainting) return;
        this.applyTool(pos.x, pos.y);
    }

    onMouseUp() {
        this.isPainting = false;
        this.isPanning = false;
        this.updateCursor();
    }

    applyTool(x, y) {
        if (this.currentTool === 'hand') return;
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;

        if (this.currentTool === 'inspect') {
            const val = this.map[y][x];
            this.showStatus(`TileInfo: [Grid ${x}, ${y}] Value: ${val} (${val === 1 ? 'Collision' : 'Empty'})`);
            return;
        }

        if (this.currentTool === 'pencil') {
            if (this.map[y][x] === 1) return;
            this.map[y][x] = 1;
        } else if (this.currentTool === 'eraser') {
            if (this.map[y][x] === 0) return;
            this.map[y][x] = 0;
        } else if (this.currentTool === 'fill') {
            this.floodFill(x, y, this.map[y][x], 1);
        }
        this.render();
    }

    floodFill(x, y, target, replacement) {
        if (target === replacement) return;
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
        if (this.map[y][x] !== target) return;
        this.map[y][x] = replacement;
        this.floodFill(x + 1, y, target, replacement);
        this.floodFill(x - 1, y, target, replacement);
        this.floodFill(x, y + 1, target, replacement);
        this.floodFill(x, y - 1, target, replacement);
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('[data-tool]').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
        this.updateCursor();
    }

    updateCursor() {
        switch (this.currentTool) {
            case 'hand': this.canvas.style.cursor = 'grab'; break;
            case 'pencil': this.canvas.style.cursor = 'crosshair'; break;
            case 'eraser': this.canvas.style.cursor = 'cell'; break;
            case 'inspect': this.canvas.style.cursor = 'help'; break;
            default: this.canvas.style.cursor = 'default';
        }
    }

    changeZoom(delta) {
        this.zoom = Math.max(0.1, Math.min(2.0, this.zoom + delta));
        this.canvas.style.transform = `scale(${this.zoom})`;
        document.getElementById('zoomReset').textContent = Math.round(this.zoom * 100) + '%';
    }

    resetZoom() {
        this.zoom = 0.4;
        this.canvas.style.transform = `scale(${this.zoom})`;
        document.getElementById('zoomReset').textContent = '40%';
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Background Image
        if (this.bgImage.complete) {
            this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
        }

        // 2. Draw Collisions (Red Overlay)
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.map[y][x] === 1) {
                    this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }

        // 3. Draw Grid
        if (document.getElementById('showGrid')?.checked) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let x = 0; x <= this.mapWidth; x++) {
                this.ctx.moveTo(x * this.tileSize, 0);
                this.ctx.lineTo(x * this.tileSize, this.canvas.height);
            }
            for (let y = 0; y <= this.mapHeight; y++) {
                this.ctx.moveTo(0, y * this.tileSize);
                this.ctx.lineTo(this.canvas.width, y * this.tileSize);
            }
            this.ctx.stroke();
        }
    }

    updateUI() {
        document.getElementById('mapSize').textContent = `Map: ${this.mapWidth}x${this.mapHeight}`;
        document.getElementById('mapWidth').value = this.mapWidth;
        document.getElementById('mapHeight').value = this.mapHeight;
    }

    showStatus(msg, type = 'info') {
        const el = document.getElementById('statusText');
        if (el) {
            el.textContent = msg;
            el.style.color = type === 'error' ? '#ff4444' : '#ffffff';
        }
    }

    exportForGame() {
        const output = {
            width: this.mapWidth,
            height: this.mapHeight,
            tileSize: this.tileSize,
            mapData: this.map,
            collisionTiles: [1] // 1 is collision
        };
        const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = this.currentMapType === 'tavern' ? 'tavern_map.json' : 'default_map.json';
        a.download = filename;
        a.click();
        this.showStatus(`Exported ${filename} for game!`);
    }

    saveMap() {
        this.exportForGame();
    }
}

window.addEventListener('load', () => {
    window.editor = new MapEditor();
});
