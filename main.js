import Phaser from 'phaser';
import { io } from 'socket.io-client';

const socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
    withCredentials: true
});

const CHARACTERS = [
    { key: 'char01', file: '/assets/Character01.png', name: 'Character 01' },
    { key: 'char02', file: '/assets/Character02.png', name: 'Character 02' },
    { key: 'char03', file: '/assets/Character03.png', name: 'Character 03' },
    { key: 'char04', file: '/assets/Character04.png', name: 'Character 04' },
    { key: 'char05', file: '/assets/Character05.png', name: 'Character 05' },
    { key: 'char06', file: '/assets/Character06.png', name: 'Character 06' },
    { key: 'char07', file: '/assets/Character07.png', name: 'Character 07' },
    { key: 'char08', file: '/assets/Character08.png', name: 'Character 08' }
];

class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
        this.selectedCharacterIndex = 0;
        this.playerNickname = '';
    }

    preload() {
        // 배경 이미지 로드
        this.load.image('introBg', '/assets/Background_intro.jpeg');

        // 캐릭터 미리보기용 로드
        CHARACTERS.forEach(char => this.load.spritesheet(char.key, char.file, { frameWidth: 256, frameHeight: 256 }));
        CHARACTERS.forEach(char => {
            this.load.on(`filecomplete-spritesheet-${char.key}`, () => {
                const texture = this.textures.get(char.key);
                console.log(`[TEXTURE] ${char.key} loaded: ${texture.source[0].width}x${texture.source[0].height}`);
            });
        });

        // 배경 음악 로드
        this.load.audio('lobbyMusic', '/assets/audio/lobby.mp3');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const centerX = width / 2;
        const centerY = height / 2;

        // 배경 음악
        if (!this.sound.get('lobbyMusic')) {
            this.lobbyMusic = this.sound.add('lobbyMusic', { loop: true, volume: 0.4 });
            if (!this.sound.locked) {
                this.lobbyMusic.play();
            } else {
                this.sound.once('unlocked', () => {
                    this.lobbyMusic.play();
                });
            }
        }

        // 배경 이미지 설정
        this.bg = this.add.image(centerX, centerY, 'introBg');

        // 화면에 꽉 차도록 스케일 조절 (Cover 방식)
        const updateBgScale = () => {
            const w = this.scale.width;
            const h = this.scale.height;
            const sX = w / this.bg.width;
            const sY = h / this.bg.height;
            const s = Math.max(sX, sY);
            this.bg.setPosition(w / 2, h / 2);
            this.bg.setScale(s).setAlpha(0.8); // 배경 밝기 상향 (0.6 -> 0.8)
        };
        updateBgScale();

        this.cameras.main.setBackgroundColor('#000');

        this.title = this.add.text(centerX, 80, 'RE-BE WORLD Mini Game', { fontSize: '72px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        // 연결 상태
        this.statusText = this.add.text(centerX, 160, '서버 연결 중...', { fontSize: '14px', fill: '#ffff00' }).setOrigin(0.5);
        this.subtitle = this.add.text(centerX, 195, 'MULTIPLAYER', { fontSize: '24px', fill: '#00ff00' }).setOrigin(0.5);

        socket.on('connect', () => this.statusText.setText('✅ 서버 연결됨!').setColor('#00ff00'));
        socket.on('disconnect', () => this.statusText.setText('❌ 서버 연결 끊김').setColor('#ff0000'));

        // 캐릭터 선택 안내 (더 위로 이동)
        this.charLabel = this.add.text(centerX, height - 480, '캐릭터를 선택하세요', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        // 캐릭터 선택 UI (4x2 그리드) - 약간 위로 이동
        const startX = centerX - 180;
        const gridStartY = height - 400;
        const spacing = 120;
        this.characterSprites = [];

        CHARACTERS.forEach((char, index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const x = startX + col * spacing;
            const y = gridStartY + row * spacing;

            const sprite = this.add.sprite(x, y, char.key, 0).setScale(0.3).setInteractive();
            const bg = this.add.circle(x, y, 45, 0x333333, 0.5);
            const highlight = this.add.circle(x, y, 50, 0xffff00, 0).setStrokeStyle(3, 0xffff00);
            const numText = this.add.text(x, y + 60, `${index + 1}`, { fontSize: '14px', fill: '#fff' }).setOrigin(0.5);

            sprite.charIndex = index;
            sprite.highlight = highlight;

            sprite.on('pointerover', () => { sprite.setScale(0.35); bg.setAlpha(0.8); });
            sprite.on('pointerout', () => { sprite.setScale(0.3); bg.setAlpha(0.5); });
            sprite.on('pointerdown', () => { this.selectCharacter(index); });

            this.characterSprites.push({ sprite, highlight, bg, numText, col, row });
        });

        // 닉네임 입력 안내 (그리드와 겹치지 않게 하단 조정)
        this.nicknameLabel = this.add.text(centerX, height - 165, '닉네임을 입력하세요', { fontSize: '14px', fill: '#fff' }).setOrigin(0.5);

        const nicknameInput = document.createElement('input');
        nicknameInput.type = 'text';
        nicknameInput.maxLength = 10;
        nicknameInput.placeholder = '닉네임 (최대 10자)';
        nicknameInput.style.position = 'absolute';
        nicknameInput.style.width = '240px';
        nicknameInput.style.height = '30px';
        nicknameInput.style.fontSize = '14px';
        nicknameInput.style.padding = '5px';
        nicknameInput.style.border = '2px solid #0ff';
        nicknameInput.style.borderRadius = '5px';
        nicknameInput.style.backgroundColor = '#222';
        nicknameInput.style.color = '#fff';
        nicknameInput.style.textAlign = 'center';
        nicknameInput.style.zIndex = '1000';
        document.body.appendChild(nicknameInput);
        nicknameInput.addEventListener('input', (e) => { this.playerNickname = e.target.value.trim(); });
        this.nicknameInput = nicknameInput;

        const updateInputPosition = () => {
            const gameCanvas = document.querySelector('canvas');
            if (gameCanvas) {
                const rect = gameCanvas.getBoundingClientRect();
                const curWidth = this.scale.width;
                const curHeight = this.scale.height;
                const scaleX = rect.width / curWidth;
                const scaleY = rect.height / curHeight;

                // 닉네임 입력창 위치를 캔버스 비율에 맞게 조정
                nicknameInput.style.left = `${rect.left + (curWidth / 2 - 125) * scaleX}px`;
                nicknameInput.style.top = `${rect.top + (curHeight - 145) * scaleY}px`;
                nicknameInput.style.width = `${240 * scaleX}px`;
                nicknameInput.style.height = `${30 * scaleY}px`;
                nicknameInput.style.fontSize = `${14 * scaleY}px`;
            }
        };
        this.updateInputPosition = updateInputPosition;
        updateInputPosition();

        // 초기 선택 표시
        this.selectCharacter(0);

        // 시작 버튼
        this.startButton = this.add.text(centerX, height - 60, '🎮 게임 시작', {
            fontSize: '24px', fill: '#ffff00', backgroundColor: '#00000088', padding: { x: 20, y: 15 }
        }).setOrigin(0.5).setInteractive();

        this.startButton.on('pointerover', () => this.startButton.setStyle({ fill: '#00ff00' }));
        this.startButton.on('pointerout', () => this.startButton.setStyle({ fill: '#ffff00' }));
        this.startButton.on('pointerdown', () => {
            const nickname = this.playerNickname || '익명';
            if (this.lobbyMusic) this.lobbyMusic.stop();
            if (this.cache.audio.exists('bgm')) {
                this.sound.add('bgm', { loop: true, volume: 0.3 }).play();
            }
            document.body.removeChild(this.nicknameInput);
            window.playerNickname = nickname;
            this.scene.start('GameScene', { characterIndex: this.selectedCharacterIndex, nickname });
        });

        // 리사이즈 이벤트 처리
        this.scale.on('resize', () => {
            const w = this.scale.width;
            const h = this.scale.height;
            const cX = w / 2;

            updateBgScale();
            this.title.setPosition(cX, 80);
            this.statusText.setPosition(cX, 160);
            this.subtitle.setPosition(cX, 195);

            this.charLabel.setPosition(cX, h - 480);
            const gridX = cX - 180;
            const gridY = h - 400;
            this.characterSprites.forEach((item) => {
                const x = gridX + item.col * spacing;
                const y = gridY + item.row * spacing;
                item.sprite.setPosition(x, y);
                item.highlight.setPosition(x, y);
                item.bg.setPosition(x, y);
                item.numText.setPosition(x, y + 60);
            });

            this.nicknameLabel.setPosition(cX, h - 165);
            updateInputPosition();
            this.startButton.setPosition(cX, h - 60);
        });
    }

    selectCharacter(index) {
        // 이전 선택 해제
        this.characterSprites.forEach(({ highlight }) => highlight.setAlpha(0));

        // 새로운 선택
        this.selectedCharacterIndex = index;
        this.characterSprites[index].highlight.setAlpha(1);
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.otherPlayers = new Map();
        this.lastSentX = 0;
        this.lastSentY = 0;
        this.lastUpdateTime = 0;
        this.teleportCooldown = 0;
    }

    init(data) {
        // StartScene에서 전달받은 캐릭터 인덱스
        this.currentCharacterIndex = data.characterIndex || 0;
    }

    preload() {
        CHARACTERS.forEach(char => this.load.spritesheet(char.key, char.file, { frameWidth: 256, frameHeight: 256 }));
        CHARACTERS.forEach(char => {
            this.load.on(`filecomplete-spritesheet-${char.key}`, () => {
                const texture = this.textures.get(char.key);
                console.log(`[TEXTURE] ${char.key} loaded: ${texture.source[0].width}x${texture.source[0].height}`);
            });
        });
        this.load.image('terrain', '/assets/New_Tileset.png');
        this.load.image('mapBackground', '/assets/Re-Be_World.jpeg');
        this.load.spritesheet('portal', '/assets/new_portal_spritesheet.png', { frameWidth: 988, frameHeight: 986 });
    }

    async create() {
        // 맵 데이터 로드
        let mapData, tileSize, collisionTiles;

        try {
            // public/default_map.json을 먼저 시도
            const response = await fetch('./default_map.json');
            if (!response.ok) throw new Error('파일 없음');

            const mapJson = await response.json();
            mapData = mapJson.mapData;
            tileSize = mapJson.tileSize || 32;
            collisionTiles = mapJson.collisionTiles || [1];

            console.log(`[MAP] 로드 완료: ${mapJson.width}x${mapJson.height}, 타일크기: ${tileSize}px`);
            console.log(`[MAP] 충돌 타일 번호: ${collisionTiles.join(', ')}`);
        } catch (error) {
            console.warn('[MAP] default_map.json 로드 실패, 기본 맵 생성');
            tileSize = 32;
            const mapWidth = 120, mapHeight = 168;
            mapData = Array(mapHeight).fill().map(() => Array(mapWidth).fill(0));
            collisionTiles = [1];
        }

        const mapWidth = mapData[0].length;
        const mapHeight = mapData.length;

        // 배경 이미지 표시 (실제 맵 그래픽)
        const bg = this.add.image(0, 0, 'mapBackground').setOrigin(0, 0);

        // 텍스처 필터링을 NEAREST로 설정 (픽셀 아트용, 선명하게)
        bg.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

        // 스케일 계산 (setDisplaySize 대신 setScale 사용)
        const scaleX = (mapWidth * tileSize) / bg.width;
        const scaleY = (mapHeight * tileSize) / bg.height;
        bg.setScale(scaleX, scaleY);

        // 타일맵 (충돌 감지용, 투명하게)
        const map = this.make.tilemap({ data: mapData, tileWidth: tileSize, tileHeight: tileSize });
        const tileset = map.addTilesetImage('terrain', 'terrain', tileSize, tileSize);
        this.groundLayer = map.createLayer(0, tileset, 0, 0);
        this.groundLayer.setAlpha(0); // 타일맵을 투명하게 (충돌 감지만)

        // 충돌 설정: 물과 산만 충돌
        this.groundLayer.setCollision(collisionTiles);

        this.createPlayer();
        this.physics.world.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.groundLayer);

        // 테스트용 오브젝트 제거됨

        // UI 전용 카메라 생성 (줌 영향을 받지 않음)
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.setScroll(0, 0);

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);
        this.cameras.main.setZoom(0.45);

        // 메인 카메라는 UI 요소를 무시하고, UI 카메라는 게임 월드를 무시하도록 설정
        // (객체 생성 후 아래에서 설정)

        this.cursors = this.input.keyboard.createCursorKeys();
        for (let i = 0; i < 8; i++) {
            const keyName = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'][i];
            this.input.keyboard.on(`keydown-${keyName}`, () => this.changeCharacter(i));
        }

        // 포탈 설정
        this.setupPortals();

        this.infoText = this.add.text(20, 20, '', {
            fontSize: '14px',
            fill: '#fff',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 6 }
        }).setScrollFactor(0).setDepth(2000);

        this.updateInfoText();

        this.playerCountText = this.add.text(20, 65, '', {
            fontSize: '12px',
            fill: '#0ff',
            backgroundColor: '#00000088',
            padding: { x: 8, y: 6 }
        }).setScrollFactor(0).setDepth(2000);

        // 멀티플레이어 데이터 수신 로그용
        this.debugText = this.add.text(this.scale.width / 2, 20, '', {
            fontSize: '12px',
            fill: '#f0f'
        }).setScrollFactor(0).setOrigin(0.5, 0).setDepth(2000);

        // 카메라 설정 적용
        const uiElements = [this.infoText, this.playerCountText, this.debugText];
        this.uiCamera.ignore([bg, this.groundLayer, this.player, this.portals]);
        this.cameras.main.ignore(uiElements);

        // 채팅 시스템 초기화
        this.setupChat();

        // 모바일 가상 조이스틱 초기화
        this.setupVirtualJoystick();

        this.setupMultiplayer();
        socket.emit('join', { nickname: window.playerNickname || '익명' });
    }

    setupVirtualJoystick() {
        // 모바일 감지
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!this.isMobile) return; // PC면 조이스틱 안 만듦

        // 가상 방향키 상태
        this.virtualDirection = { left: false, right: false, up: false, down: false };

        // 조이스틱 베이스 (왼쪽 하단)
        this.joystickBase = this.add.circle(100, 500, 50, 0x333333, 0.5).setScrollFactor(0).setDepth(1000);

        // 조이스틱 스틱
        this.joystickStick = this.add.circle(100, 500, 25, 0x00ffff, 0.8).setScrollFactor(0).setDepth(1001);

        // 터치 활성화
        this.joystickBase.setInteractive();

        let touchPointer = null;

        // 터치 시작
        this.input.on('pointerdown', (pointer) => {
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joystickBase.x, this.joystickBase.y);
            if (dist < 80) {
                touchPointer = pointer;
            }
        });

        // 터치 이동
        this.input.on('pointermove', (pointer) => {
            if (touchPointer === pointer) {
                const angle = Phaser.Math.Angle.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y);
                const distance = Math.min(Phaser.Math.Distance.Between(this.joystickBase.x, this.joystickBase.y, pointer.x, pointer.y), 40);

                this.joystickStick.x = this.joystickBase.x + Math.cos(angle) * distance;
                this.joystickStick.y = this.joystickBase.y + Math.sin(angle) * distance;

                // 방향 계산
                this.virtualDirection.left = pointer.x < this.joystickBase.x - 15;
                this.virtualDirection.right = pointer.x > this.joystickBase.x + 15;
                this.virtualDirection.up = pointer.y < this.joystickBase.y - 15;
                this.virtualDirection.down = pointer.y > this.joystickBase.y + 15;
            }
        });

        // 터치 종료
        this.input.on('pointerup', (pointer) => {
            if (touchPointer === pointer) {
                touchPointer = null;
                this.joystickStick.x = this.joystickBase.x;
                this.joystickStick.y = this.joystickBase.y;
                this.virtualDirection = { left: false, right: false, up: false, down: false };
            }
        });

    }

    setupChat() {
        // 채팅 메시지 배열 초기화 (상시 표시를 위해 초기값 설정)
        this.chatMessages = [
            { playerName: '공지', message: '반가워요! Re-Be World에 오신걸 환영합니다.', color: '#ffff00' }
        ];
        this.chatOpen = false;

        const width = this.scale.width;
        const height = this.scale.height;

        // 채팅창 크기 (UI 카메라 1:1 기준)
        const chatWidth = 350;
        const chatHeight = 150;
        const margin = 20;

        // 채팅 박스 배경
        this.chatBox = this.add.rectangle(
            margin,
            height - margin - chatHeight - 40,
            chatWidth,
            chatHeight,
            0x000000, 0.6
        ).setOrigin(0, 0).setScrollFactor(0).setVisible(true).setDepth(2000);

        // 메시지 표시 영역
        this.chatText = this.add.text(
            margin + 10,
            height - margin - chatHeight - 35,
            '',
            {
                fontSize: '12px',
                fill: '#fff',
                wordWrap: { width: chatWidth - 20 },
                lineSpacing: 4
            }
        ).setScrollFactor(0).setVisible(true).setDepth(2001);

        // 초기 메시지 표시
        this.updateChatDisplay();

        // 입력창 배경
        this.chatInputBg = this.add.rectangle(
            margin,
            height - margin - 35,
            chatWidth,
            30,
            0x222222, 0.9
        ).setOrigin(0, 0).setScrollFactor(0).setVisible(false).setDepth(2000);

        // 입력 프롬프트
        this.chatInputText = this.add.text(
            margin + 10,
            height - margin - 28,
            'Enter: 메시지 입력...',
            {
                fontSize: '12px',
                fill: '#aaa'
            }
        ).setScrollFactor(0).setVisible(true).setDepth(2001);

        // UI 카메라 설정
        const chatElements = [this.chatBox, this.chatText, this.chatInputBg, this.chatInputText];
        this.uiCamera.ignore([]); // UI 카메라는 UI 요소들을 보여줌
        this.cameras.main.ignore(chatElements); // 메인 카메라는 UI 요소들을 무시함

        // HTML 입력창 정밀 조정
        this.chatInputElement = document.createElement('input');
        this.chatInputElement.type = 'text';
        this.chatInputElement.maxLength = 100;
        this.chatInputElement.style.position = 'absolute';

        const updateInputPosition = () => {
            const gameCanvas = document.querySelector('canvas');
            if (gameCanvas) {
                const rect = gameCanvas.getBoundingClientRect();
                const displayScaleX = rect.width / width;
                const displayScaleY = rect.height / height;

                this.chatInputElement.style.left = `${rect.left + (margin + 10) * displayScaleX}px`;
                this.chatInputElement.style.top = `${rect.top + (height - margin - 32) * displayScaleY}px`;
                this.chatInputElement.style.width = `${(chatWidth - 20) * displayScaleX}px`;
                this.chatInputElement.style.fontSize = `${14 * displayScaleY}px`;
                this.chatInputElement.style.height = `${22 * displayScaleY}px`;
            }
        };

        this.chatInputElement.style.backgroundColor = 'transparent';
        this.chatInputElement.style.color = '#fff';
        this.chatInputElement.style.border = 'none';
        this.chatInputElement.style.outline = 'none';
        this.chatInputElement.style.display = 'none';
        this.chatInputElement.style.zIndex = '3000';
        document.body.appendChild(this.chatInputElement);

        // 윈도우 리사이즈 시 위치 업데이트
        window.addEventListener('resize', updateInputPosition);
        this.updateInputPosition = updateInputPosition;

        // 모바일용 채팅 버튼 추가
        if (this.isMobile) {
            const chatBtn = this.add.text(this.scale.width - 100, 500, '💬', {
                fontSize: '40px',
                backgroundColor: '#00000088',
                padding: { x: 10, y: 5 }
            }).setScrollFactor(0).setDepth(1000).setInteractive();

            chatBtn.on('pointerdown', () => {
                if (!this.chatOpen) {
                    this.openChat();
                }
            });
        }

        // Enter 키로 채팅창 열기/전송
        this.input.keyboard.on('keydown-ENTER', () => {
            if (!this.chatOpen) {
                this.openChat();
            } else {
                this.sendMessage();
            }
        });

        // ESC 키로 채팅창 닫기
        // ESC 키로 채팅창 닫기
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.chatOpen) {
                this.closeChat();
            }
        });
    }

    openChat() {
        this.chatOpen = true;
        this.chatBox.setVisible(true);
        this.chatText.setVisible(true);
        this.chatInputBg.setVisible(true);
        this.chatInputText.setVisible(false);
        this.chatInputElement.style.display = 'block';

        // 캔버스 크기 변화에 대응하기 위해 오픈 시점에 좌표 재계산
        if (this.updateInputPosition) this.updateInputPosition();

        setTimeout(() => this.chatInputElement.focus(), 10);

        this.cursors.left.enabled = false;
        this.cursors.right.enabled = false;
        this.cursors.up.enabled = false;
        this.cursors.down.enabled = false;
    }

    closeChat() {
        this.chatOpen = false;
        this.chatInputElement.value = '';
        this.chatInputElement.style.display = 'none';
        this.chatInputText.setVisible(true);
        this.cursors.left.enabled = true;
        this.cursors.right.enabled = true;
        this.cursors.up.enabled = true;
        this.cursors.down.enabled = true;
    }

    sendMessage() {
        const msg = this.chatInputElement.value.trim();
        if (msg.length > 0) {
            socket.emit('chatMessage', msg);
            this.chatInputElement.value = '';
        }
        this.closeChat();
    }

    addChatMessage(id, message, nickname) {
        const isMe = id === socket.id;
        const playerName = isMe ? (window.playerNickname || '나') : (nickname || `P:${id.substring(0, 4)}`);
        const color = isMe ? '#0ff' : '#fff';

        this.chatMessages.push({ playerName, message, color });

        // 최근 10개만 유지
        if (this.chatMessages.length > 10) {
            this.chatMessages.shift();
        }

        // 화면 업데이트
        this.updateChatDisplay();

        // 캐릭터 머리 위에 말풍선 표시
        this.showSpeechBubble(id, message, isMe);
    }

    updateChatDisplay() {
        const lines = this.chatMessages.map(m => `${m.playerName}: ${m.message}`);
        this.chatText.setText(lines.join('\n'));

        // 메시지가 오면 채팅창을 확실히 보여줌
        this.chatBox.setVisible(true);
        this.chatText.setVisible(true);
    }

    showSpeechBubble(playerId, message, isMe) {
        // 플레이어 객체 찾기
        const player = isMe ? this.player : this.otherPlayers.get(playerId);
        if (!player) return;

        // 기존 말풍선 제거
        if (player.speechBubble) {
            player.speechBubble.destroy();
        }
        if (player.speechText) {
            player.speechText.destroy();
        }

        // 말풍선 배경 (둥근 사각형)
        const bubbleWidth = Math.min(message.length * 36 + 60, 750);
        const bubbleHeight = 120;
        const bubbleX = player.x;
        const bubbleY = player.y - 200; // 캐릭터 머리 위

        const bubble = this.add.graphics();
        bubble.fillStyle(0x000000, 0.75);
        bubble.lineStyle(6, 0xffffff, 1);
        bubble.fillRoundedRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 30);
        bubble.strokeRoundedRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 30);
        bubble.setDepth(100);

        // 말풍선 텍스트
        const text = this.add.text(bubbleX, bubbleY, message, {
            fontSize: '42px',
            fill: '#ffffff',
            wordWrap: { width: bubbleWidth - 60 },
            align: 'center'
        }).setOrigin(0.5).setDepth(101);

        player.speechBubble = bubble;
        player.speechText = text;

        // 3초 후 자동으로 사라짐
        this.time.delayedCall(3000, () => {
            if (bubble) bubble.destroy();
            if (text) text.destroy();
            player.speechBubble = null;
            player.speechText = null;
        });
    }

    updateSpeechBubblePosition(player) {
        if (!player || !player.speechBubble || !player.speechText) return;

        const bubbleY = player.y - 200;
        const bubbleX = player.x;

        // Graphics 객체는 위치를 직접 업데이트할 수 없으므로 재생성
        const message = player.speechText.text;
        const bubbleWidth = Math.min(message.length * 36 + 60, 750);
        const bubbleHeight = 120;

        player.speechBubble.clear();
        player.speechBubble.fillStyle(0x000000, 0.75);
        player.speechBubble.lineStyle(6, 0xffffff, 1);
        player.speechBubble.fillRoundedRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 30);
        player.speechBubble.strokeRoundedRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 30);

        player.speechText.setPosition(bubbleX, bubbleY);
    }

    setupMultiplayer() {
        socket.off('currentPlayers');
        socket.off('newPlayer');
        socket.off('playerMoved');
        socket.off('playerCharacterChanged');
        socket.off('playerDisconnected');
        socket.off('chatMessage'); // 중복 등록 방지

        socket.on('chatMessage', (data) => {
            this.addChatMessage(data.id, data.message, data.nickname);
        });

        socket.on('currentPlayers', (players) => {
            players.forEach(p => { if (p.id !== socket.id) this.addOtherPlayer(p); });
            this.updatePlayerCount();

            // 다른 플레이어들도 메인 카메라만 찍고 UI 카메라는 무시하도록 설정
            this.otherPlayers.forEach(op => {
                this.uiCamera.ignore(op);
                if (op.nameText) this.uiCamera.ignore(op.nameText);
            });
        });

        socket.on('newPlayer', (p) => {
            const op = this.addOtherPlayer(p);
            if (op) {
                this.uiCamera.ignore(op);
                if (op.nameText) this.uiCamera.ignore(op.nameText);
            }
            this.updatePlayerCount();
        });

        socket.on('playerMoved', (data) => {
            // 다른 씬에 있는 플레이어 숨기기
            if (data.scene && data.scene !== 'GameScene') {
                const op = this.otherPlayers.get(data.id);
                if (op) {
                    op.setVisible(false);
                    if (op.nameText) op.nameText.setVisible(false);
                    if (op.speechBubble) op.speechBubble.setVisible(false);
                    if (op.speechText) op.speechText.setVisible(false);
                }
                return;
            }

            const op = this.otherPlayers.get(data.id);
            if (op) {
                op.setVisible(true); // 다시 보이기
                if (op.nameText) op.nameText.setVisible(true);
                if (op.speechBubble) op.speechBubble.setVisible(true);
                if (op.speechText) op.speechText.setVisible(true);

                op.x = data.x;
                op.y = data.y;
                if (op.nameText) op.nameText.setPosition(data.x, data.y - 120);

                // 말풍선 위치 업데이트
                if (op.speechBubble && op.speechText) {
                    this.updateSpeechBubblePosition(op);
                }

                if (data.animation && data.animation !== 'idle') {
                    op.play(data.animation, true);
                } else {
                    op.stop();
                }

                this.debugText.setText(`신호 수신 중: ${data.id.substring(0, 4)}...`).setVisible(true);
                this.time.delayedCall(500, () => this.debugText.setVisible(false));
            }
        });

        socket.on('playerCharacterChanged', (data) => {
            const op = this.otherPlayers.get(data.id);
            if (op) {
                const { x, y, nameText } = op;
                op.destroy();

                // physics sprite로 다시 생성
                console.log(`[CHAR CHANGE] Player ${data.id.substring(0, 4)} changing to character ${data.characterIndex}`);
                const newSprite = this.physics.add.sprite(x, y, CHARACTERS[data.characterIndex].key, 0);
                newSprite.setScale(1.2);
                console.log(`[CHAR CHANGE] New scale: ${newSprite.scaleX}, ${newSprite.scaleY}`);
                newSprite.body.setImmovable(true);
                // 발 부분만 충돌하도록 설정 (1타일 영역)
                newSprite.body.setSize(26, 26);
                newSprite.body.setOffset(115, 220);
                newSprite.nameText = nameText;

                // 모든 설정 후 스케일 재확인 (거인 버그 방지)
                newSprite.setScale(1.2, 1.2);
                newSprite.displayWidth = 256 * 1.2;
                newSprite.displayHeight = 256 * 1.2;
                newSprite.setDepth(10);

                // 충돌 다시 추가
                this.physics.add.collider(this.player, newSprite);

                this.otherPlayers.set(data.id, newSprite);
            }
        });

        socket.on('playerDisconnected', (id) => {
            const op = this.otherPlayers.get(id);
            if (op) { if (op.nameText) op.nameText.destroy(); op.destroy(); this.otherPlayers.delete(id); this.updatePlayerCount(); }
        });

        // 채팅 메시지 수신 로직 통합됨 (메서드 상단으로 이동)
    }

    addOtherPlayer(p) {
        if (this.otherPlayers.has(p.id)) return;

        // physics sprite로 생성 (충돌 처리를 위해)
        console.log(`[OTHER PLAYER] Creating player ${p.id.substring(0, 4)} at (${p.x}, ${p.y}), character: ${p.characterIndex || 0}`);
        const op = this.physics.add.sprite(p.x, p.y, CHARACTERS[p.characterIndex || 0].key, 0);
        op.setScale(1.2);
        console.log(`[OTHER PLAYER] Scale set to: ${op.scaleX}, ${op.scaleY}`);
        op.body.setImmovable(true); // 다른 플레이어는 밀리지 않음

        // 발 부분만 충돌하도록 설정 (1타일 영역)
        op.body.setSize(26, 26);
        op.body.setOffset(115, 220);

        op.setDepth(10); // 포탈보다 위에 표시되도록 설정
        op.nameText = this.add.text(p.x, p.y - 120, `P:${p.id.substring(0, 4)}`, { fontSize: '18px', fill: '#fff', backgroundColor: '#000000aa' }).setOrigin(0.5).setDepth(11);

        // 모든 설정 후 스케일 재확인 (거인 버그 방지)
        op.setScale(1.2, 1.2);
        op.displayWidth = 256 * 1.2;
        op.displayHeight = 256 * 1.2;

        // 플레이어와 충돌 추가
        this.physics.add.collider(this.player, op);

        this.otherPlayers.set(p.id, op);
    }

    updatePlayerCount() { this.playerCountText.setText(`👥 ${this.otherPlayers.size + 1}`); }



    createPlayer() {
        const char = CHARACTERS[this.currentCharacterIndex];
        // 시작 포인트: [Grid 8, 58] => x: 8*32=256, y: 58*32=1856 (중앙 보정 +16)
        const startX = 8 * 32 + 16;
        const startY = 58 * 32 + 16;
        const x = this.player ? this.player.x : startX;
        const y = this.player ? this.player.y : startY;
        if (this.player) this.player.destroy();

        this.player = this.physics.add.sprite(x, y, char.key, 0);
        this.player.setScale(1.2);

        // 발 부분만 충돌하도록 설정 (1타일 32x32 영역, 스케일 1.2 고려)
        // 32 / 1.2 = 26.6 -> 26으로 설정하여 1칸 공백 통과 가능하게 함
        this.player.body.setSize(26, 26);
        this.player.body.setOffset(115, 220); // 캐릭터 발 위치에 맞게 하단 중앙 조정
        this.player.setDepth(10); // 포탈보다 위에 표시되도록 설정

        // 모든 설정 후 스케일 재확인 (거인 버그 방지)
        this.player.setScale(1.2, 1.2);
        this.player.displayWidth = 256 * 1.2;
        this.player.displayHeight = 256 * 1.2;

        // 카메라가 플레이어를 다시 따라가도록 설정 (중요!)
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        const k = char.key;
        ['down', 'left', 'right', 'up'].forEach((d, i) => {
            this.anims.create({ key: `${k}-w-${d}`, frames: this.anims.generateFrameNumbers(k, { start: i * 4, end: i * 4 + 3 }), frameRate: 8, repeat: -1 });
        });
    }

    changeCharacter(i) {
        this.currentCharacterIndex = i;
        this.createPlayer();
        this.physics.add.collider(this.player, this.groundLayer);
        this.physics.add.collider(this.player, this.objects);
        this.updateInfoText();
        socket.emit('characterChange', i);
    }

    updateInfoText() { this.infoText.setText(`Re-Be World 🌐\n${CHARACTERS[this.currentCharacterIndex].name}\nEnter: 채팅 | 1-8: 변경`); }

    update(time) {
        if (!this.player) return;
        const speed = 450;
        const k = CHARACTERS[this.currentCharacterIndex].key;
        let anim = 'idle';
        this.player.setVelocity(0);

        // 키보드 또는 가상 조이스틱으로 이동
        const moveLeft = this.cursors.left.isDown || (this.virtualDirection && this.virtualDirection.left);
        const moveRight = this.cursors.right.isDown || (this.virtualDirection && this.virtualDirection.right);
        const moveUp = this.cursors.up.isDown || (this.virtualDirection && this.virtualDirection.up);
        const moveDown = this.cursors.down.isDown || (this.virtualDirection && this.virtualDirection.down);

        if (moveLeft) { this.player.setVelocityX(-speed); anim = `${k}-w-left`; }
        else if (moveRight) { this.player.setVelocityX(speed); anim = `${k}-w-right`; }
        else if (moveUp) { this.player.setVelocityY(-speed); anim = `${k}-w-up`; }
        else if (moveDown) { this.player.setVelocityY(speed); anim = `${k}-w-down`; }

        if (anim !== 'idle') this.player.play(anim, true); else this.player.stop();

        // 50ms마다 한 번씩만 위치 전송 (Throttling)
        if (time > this.lastUpdateTime + 50) {
            const curX = Math.floor(this.player.x);
            const curY = Math.floor(this.player.y);

            if (curX !== this.lastSentX || curY !== this.lastSentY) {
                socket.emit('playerMovement', { x: curX, y: curY, animation: anim, scene: 'GameScene' });
                this.lastSentX = curX;
                this.lastSentY = curY;
            }
            this.lastUpdateTime = time;
        }

        // 텔레포트 쿨다운 감소
        if (this.teleportCooldown > 0) {
            this.teleportCooldown -= 16; // 대략적인 프레임 시간
        }


        // 스케일 검증 (거인 버그 방지)
        if (this.player.scaleX !== 1.2 || this.player.scaleY !== 1.2) {
            console.warn(`[SCALE FIX] Player scale was ${this.player.scaleX}, ${this.player.scaleY}, fixing to 1.2`);
            this.player.setScale(1.2);
        }

        // 다른 플레이어들 스케일 검증
        this.otherPlayers.forEach(op => {
            if (op.scaleX !== 1.2 || op.scaleY !== 1.2) {
                console.warn(`[SCALE FIX] Other player scale was ${op.scaleX}, ${op.scaleY}, fixing to 1.2`);
                op.setScale(1.2);
                console.log(`[OTHER PLAYER] Scale set to: ${op.scaleX}, ${op.scaleY}`);
            }
        });
        // 자신의 말풍선 위치 업데이트
        if (this.player.speechBubble && this.player.speechText) {
            this.updateSpeechBubblePosition(this.player);
        }
    }

    setupPortals() {
        this.portals = this.physics.add.group();

        // 포탈 애니메이션 생성
        if (!this.anims.exists('portal_spin')) {
            this.anims.create({
                key: 'portal_spin',
                frames: this.anims.generateFrameNumbers('portal', { start: 0, end: 4 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // Portal A: [91, 21] (광장 쪽)
        const portalA = this.portals.create(91 * 32 + 16, 21 * 32 + 16, 'portal').setScale(0.13).setDepth(2);
        portalA.play('portal_spin');
        portalA.locationName = "광장 포탈";
        portalA.targetPos = { x: 99 * 32 + 16, y: 119 * 32 + 70 };

        // Portal B: [99, 119] (마을 변두리 쪽)
        const portalB = this.portals.create(99 * 32 + 16, 119 * 32 + 16, 'portal').setScale(0.13).setDepth(2);
        portalB.play('portal_spin');
        portalB.locationName = "마을 변두리 포탈";
        portalB.targetPos = { x: 91 * 32 + 16, y: 21 * 32 + 70 };

        // 신규 추가: 그래픽 없는 시크릿 텔레포트 (양방향)
        const secretPortals = [
            { a: [8, 49], b: [18, 112], name: "시크릿 통로 2" },
            { a: [104, 11], b: [37, 96], name: "시크릿 통로 3" },
            { a: [8, 44], b: [106, 160], name: "시크릿 통로 4" }
        ];

        secretPortals.forEach(pair => {
            // A -> B
            const pA = this.portals.create(pair.a[0] * 32 + 16, pair.a[1] * 32 + 16, 'portal');
            pA.setVisible(false).setAlpha(0);
            pA.targetPos = { x: pair.b[0] * 32 + 16, y: pair.b[1] * 32 + 64 };
            pA.locationName = pair.name;
            pA.body.setCircle(160); // 보이지 않는 통로 히트박스 확보
            pA.body.setOffset(334, 333);

            // B -> A
            const pB = this.portals.create(pair.b[0] * 32 + 16, pair.b[1] * 32 + 16, 'portal');
            pB.setVisible(false).setAlpha(0);
            pB.targetPos = { x: pair.a[0] * 32 + 16, y: pair.a[1] * 32 + 64 };
            pB.locationName = pair.name;
            pB.body.setCircle(160);
            pB.body.setOffset(334, 333);
        });

        this.portals.children.iterate((portal) => {
            // 보이지 않는 포탈(시크릿)은 애니메이션/트윈 루프 건너뜀
            if (!portal.visible) return;

            // 히트박스 조정 (포탈 중심부 988x986 기준)
            portal.body.setCircle(150);
            portal.body.setOffset(344, 343);

            // 공중에 떠있는 효과 (상하 이동)
            this.tweens.add({
                targets: portal,
                y: portal.y - 10,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });


        // 방주 입구 포탈 (특별한 처리) - 위치 변경 [79, 116]
        // 방주 입구 포탈 (특별한 처리) - 그래픽 없음
        const tavernPortal = this.portals.create(79 * 32 + 16, 116 * 32 + 16, 'portal');
        tavernPortal.setVisible(false);
        tavernPortal.locationName = "🍺 방주 입구";
        tavernPortal.isTavernPortal = true;
        tavernPortal.body.setCircle(150);
        tavernPortal.body.setOffset(344, 343);

        // Zero duration tween or none
        // remove tween

        this.physics.add.overlap(this.player, this.portals, (player, portal) => {
            if (this.teleportCooldown <= 0) {
                // 방주 포탈인 경우 TavernScene으로 전환
                if (portal.isTavernPortal) {
                    this.enterTavern();
                } else if (portal.targetPos) {
                    // 일반 포탈인 경우 텔레포트
                    this.teleportPlayer(portal.targetPos.x, portal.targetPos.y, portal.locationName);
                }
            }
        });

    }

    teleportPlayer(x, y, name) {
        this.teleportCooldown = 2000; // 2초 쿨다운
        this.player.setPosition(x, y);

        // 카메라 즉시 이동 보정
        this.cameras.main.scrollX = x - this.cameras.main.width / 2;
        this.cameras.main.scrollY = y - this.cameras.main.height / 2;

        // 효과음 대신 텍스트 효과 (나중에 작업 가능)
        const text = this.add.text(this.player.x, this.player.y - 150, "Teleport!", {
            fontSize: '32px',
            fill: '#0ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });

        console.log(`[PORTAL] Teleported to ${name}`);
    }

    enterTavern() {
        this.teleportCooldown = 2000; // 2초 쿨다운

        // 현재 위치 저장
        const returnPosition = { x: this.player.x, y: this.player.y };

        // GameScene 정지 (렌더링도 멈춤)
        this.scene.sleep();

        // TavernScene 시작
        this.scene.launch('TavernScene', {
            returnPosition,
            characterIndex: this.currentCharacterIndex,
            socket: this.socket
        });

        console.log('[TAVERN] Entered tavern from position:', returnPosition);
    }
}

class TavernScene extends Phaser.Scene {
    constructor() {
        super('TavernScene');
        this.currentFrame = 0;
        this.socket = null;
        this.speechBubbles = [];
        this.otherPlayers = null;
        this.otherPlayerTexts = new Map();
        this.chatOpen = false;
    }

    init(data) {
        this.returnPosition = data.returnPosition || { x: 256, y: 1856 };
        this.characterIndex = data.characterIndex !== undefined ? data.characterIndex : 0;
        this.socket = data.socket;
        this.nickname = window.playerNickname || '익명';
    }

    preload() {
        this.load.image('tavern1', '/assets/tavern_frame1.jpg');
        this.load.image('tavern2', '/assets/tavern_frame2.jpg');
        this.load.image('tavern3', '/assets/tavern_frame3.jpg');
        this.load.audio('pubMusic', '/assets/audio/pub.mp3');
        this.load.json('tavernMap', '/tavern_map.json');
    }

    create() {
        this.cameras.main.setBackgroundColor('#000');
        this.cameras.main.fadeIn(500, 0, 0, 0);

        const mainBgm = this.sound.get('bgm');
        if (mainBgm && mainBgm.isPlaying) {
            this.tweens.add({ targets: mainBgm, volume: 0, duration: 1000, onComplete: () => mainBgm.pause() });
        }

        this.tavernImage = this.add.image(0, 0, 'tavern1').setOrigin(0.5, 0.5);
        const imgW = this.tavernImage.width;
        const imgH = this.tavernImage.height;
        this.tavernImage.setPosition(imgW / 2, imgH / 2);
        this.physics.world.setBounds(0, 0, imgW, imgH);

        if (this.cache.json.exists('tavernMap')) {
            const mapData = this.cache.json.get('tavernMap');
            const tileSize = mapData.tileSize || 32;
            this.walls = this.physics.add.staticGroup();
            if (mapData.mapData) {
                mapData.mapData.forEach((row, y) => {
                    row.forEach((tile, x) => {
                        if (tile === 1) {
                            const wall = this.walls.create(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, null);
                            wall.setVisible(false);
                            wall.body.setSize(tileSize, tileSize);
                        }
                    });
                });
            }
        }

        const charKey = CHARACTERS[this.characterIndex] ? CHARACTERS[this.characterIndex].key : CHARACTERS[0].key;
        this.player = this.physics.add.sprite(imgW / 2, imgH - 100, charKey, 12);
        this.player.setScale(0.4);
        this.player.body.setSize(40, 40);
        const pW = this.player.width;
        const pH = this.player.height;
        this.player.body.setOffset((pW - 40) / 2, pH - 40);

        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);
        if (this.walls) this.physics.add.collider(this.player, this.walls);

        ['down', 'left', 'right', 'up'].forEach((d, i) => {
            const animKey = `${charKey}-tavern-${d}`;
            if (!this.anims.exists(animKey)) {
                this.anims.create({
                    key: animKey,
                    frames: this.anims.generateFrameNumbers(charKey, { start: i * 4, end: i * 4 + 3 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
        });

        this.exitZone = this.add.zone(imgW / 2, imgH - 20, 200, 50).setOrigin(0.5);
        this.physics.add.existing(this.exitZone);
        this.physics.add.overlap(this.player, this.exitZone, () => this.exitTavern());

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
        this.input.keyboard.on('keydown-ESC', () => this.exitTavern());

        if (!this.sound.get('pubMusic')) {
            this.pubMusic = this.sound.add('pubMusic', { loop: true, volume: 0 });
            this.pubMusic.play();
            try { this.pubMusic.seek = 12; } catch (e) { }
            this.tweens.add({ targets: this.pubMusic, volume: 0.5, duration: 2000 });
        } else {
            if (!this.pubMusic) this.pubMusic = this.sound.get('pubMusic');
            if (!this.pubMusic.isPlaying) this.pubMusic.play();
            try { this.pubMusic.seek = 12; } catch (e) { }
            this.pubMusic.setVolume(0);
            this.tweens.add({ targets: this.pubMusic, volume: 0.5, duration: 2000 });
        }

        this.infoText = this.add.text(imgW / 2, 30, '🍺 방주 공간 🍺\n아래쪽 입구로 나가기 | Enter: 채팅', {
            fontSize: '24px', fill: '#fff', backgroundColor: '#00000088', padding: { x: 15, y: 10 }, align: 'center'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

        this.time.addEvent({ delay: 1000, callback: this.switchFrame, callbackScope: this, loop: true });
        this.scale.on('resize', this.resize, this);
        this.updateLayout();
        this.setupMultiplayer();
        this.setupChat();
    }

    setupMultiplayer() {
        this.otherPlayers = this.physics.add.group();

        if (this.socket) {
            console.log('[TavernScene] Setting up multiplayer, socket ID:', this.socket.id);

            // Join again with Tavern scene context
            this.socket.emit('join', { nickname: this.nickname });
            console.log('[TavernScene] Emitted join event');

            this.socket.on('currentPlayers', (players) => {
                console.log('[TavernScene] Received currentPlayers:', players.length);
                players.forEach((playerInfo) => {
                    if (playerInfo.id !== this.socket.id) this.addOtherPlayer(playerInfo);
                });
            });

            this.socket.on('newPlayer', (playerInfo) => {
                console.log('[TavernScene] New player joined:', playerInfo);
                this.addOtherPlayer(playerInfo);
            });

            this.socket.on('playerMoved', (data) => {
                if (data.scene !== 'TavernScene') {
                    this.removeOtherPlayer(data.id);
                    return;
                }

                let otherPlayer = null;
                this.otherPlayers.getChildren().forEach(op => {
                    if (op.playerId === data.id) otherPlayer = op;
                });

                if (otherPlayer) {
                    otherPlayer.setPosition(data.x, data.y);
                    if (data.animation) {
                        const key = otherPlayer.charKey;
                        if (data.animation === 'turn') otherPlayer.anims.stop();
                        else otherPlayer.play(`${key}-tavern-${data.animation}`, true);
                    }
                    if (this.otherPlayerTexts.has(data.id)) {
                        this.otherPlayerTexts.get(data.id).setPosition(data.x, data.y - 40);
                    }
                }
            });

            this.socket.on('playerDisconnected', (id) => this.removeOtherPlayer(id));

            this.socket.on('chatMessage', (data) => {
                console.log('[TavernScene] Received chatMessage:', data);
                if (data.scene === 'TavernScene') {
                    console.log('[TavernScene] Message is for Tavern');
                    let target = null;
                    if (data.id === this.socket.id) {
                        target = this.player;
                        console.log('[TavernScene] Message from me');
                    } else {
                        this.otherPlayers.getChildren().forEach(p => {
                            if (p.playerId === data.id) target = p;
                        });
                        console.log('[TavernScene] Message from other player, found:', !!target);
                    }
                    if (target) {
                        console.log('[TavernScene] Showing bubble');
                        this.showSpeechBubble(target, data.message);
                    }
                } else {
                    console.log('[TavernScene] Message for other scene:', data.scene);
                }
            });
        }
    }

    setupChat() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.chatInputElement = document.createElement('input');
        this.chatInputElement.type = 'text';
        this.chatInputElement.maxLength = 100;
        this.chatInputElement.style.position = 'absolute';
        this.chatInputElement.style.backgroundColor = '#000000dd';
        this.chatInputElement.style.color = '#fff';
        this.chatInputElement.style.border = '2px solid #666';
        this.chatInputElement.style.outline = 'none';
        this.chatInputElement.style.display = 'none';
        this.chatInputElement.style.zIndex = '9999';
        this.chatInputElement.style.padding = '10px';
        this.chatInputElement.style.fontSize = '16px';
        this.chatInputElement.style.borderRadius = '5px';

        const updateInputPosition = () => {
            const gameCanvas = document.querySelector('canvas');
            if (gameCanvas) {
                const rect = gameCanvas.getBoundingClientRect();
                const inputWidth = 300;
                this.chatInputElement.style.left = `${rect.left + (rect.width - inputWidth) / 2}px`;
                this.chatInputElement.style.top = `${rect.top + rect.height - 80}px`;
                this.chatInputElement.style.width = `${inputWidth}px`;
            }
        };

        document.body.appendChild(this.chatInputElement);

        window.addEventListener('resize', updateInputPosition);
        this.updateInputPosition = updateInputPosition;
        updateInputPosition();

        this.input.keyboard.on('keydown-ENTER', () => {
            if (!this.chatOpen) {
                this.openChat();
            } else {
                this.sendMessage();
            }
        });
    }

    openChat() {
        this.chatOpen = true;
        this.chatInputElement.style.display = 'block';
        if (this.updateInputPosition) this.updateInputPosition();
        setTimeout(() => this.chatInputElement.focus(), 10);
        this.cursors.left.enabled = false;
        this.cursors.right.enabled = false;
        this.cursors.up.enabled = false;
        this.cursors.down.enabled = false;
        if (this.wasd) {
            this.wasd.left.enabled = false;
            this.wasd.right.enabled = false;
            this.wasd.up.enabled = false;
            this.wasd.down.enabled = false;
        }
    }

    closeChat() {
        this.chatOpen = false;
        this.chatInputElement.value = '';
        this.chatInputElement.style.display = 'none';
        this.cursors.left.enabled = true;
        this.cursors.right.enabled = true;
        this.cursors.up.enabled = true;
        this.cursors.down.enabled = true;
        if (this.wasd) {
            this.wasd.left.enabled = true;
            this.wasd.right.enabled = true;
            this.wasd.up.enabled = true;
            this.wasd.down.enabled = true;
        }
    }

    sendMessage() {
        const msg = this.chatInputElement.value.trim();
        console.log('[TavernScene] Sending message:', msg);
        if (msg.length > 0 && this.socket) {
            this.socket.emit('chatMessage', { message: msg, scene: 'TavernScene' });
            console.log('[TavernScene] Message sent with scene context');
        }
        this.closeChat();
    }

    addOtherPlayer(playerInfo) {
        if (playerInfo.scene !== 'TavernScene') return;

        let exists = false;
        this.otherPlayers.getChildren().forEach(p => { if (p.playerId === playerInfo.id) exists = true; });
        if (exists) return;

        const charKey = CHARACTERS[playerInfo.characterIndex] ? CHARACTERS[playerInfo.characterIndex].key : CHARACTERS[0].key;
        const otherPlayer = this.physics.add.sprite(playerInfo.x, playerInfo.y, charKey, 12);
        otherPlayer.playerId = playerInfo.id;
        otherPlayer.charKey = charKey;
        otherPlayer.setScale(0.4);
        otherPlayer.setDepth(10);
        this.otherPlayers.add(otherPlayer);

        const text = this.add.text(playerInfo.x, playerInfo.y - 40, playerInfo.nickname, {
            fontSize: '14px', fill: '#ffffff', stroke: '#000000', strokeThickness: 3, align: 'center'
        }).setOrigin(0.5);
        this.otherPlayerTexts.set(playerInfo.id, text);

        ['down', 'left', 'right', 'up'].forEach((d, i) => {
            const animKey = `${charKey}-tavern-${d}`;
            if (!this.anims.exists(animKey)) {
                this.anims.create({
                    key: animKey,
                    frames: this.anims.generateFrameNumbers(charKey, { start: i * 4, end: i * 4 + 3 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
        });
    }

    removeOtherPlayer(id) {
        this.otherPlayers.getChildren().forEach((otherPlayer) => {
            if (otherPlayer.playerId === id) otherPlayer.destroy();
        });
        if (this.otherPlayerTexts.has(id)) {
            this.otherPlayerTexts.get(id).destroy();
            this.otherPlayerTexts.delete(id);
        }
    }

    showSpeechBubble(player, text) {
        const bubbleParams = { width: 280, height: 100, color: 0xffffff, alpha: 0.8 };
        const bubble = this.add.graphics();
        bubble.fillStyle(bubbleParams.color, bubbleParams.alpha);
        bubble.lineStyle(3, 0x000000, 1);
        bubble.fillRoundedRect(-bubbleParams.width / 2, -bubbleParams.height, bubbleParams.width, bubbleParams.height, 16);
        bubble.strokeRoundedRect(-bubbleParams.width / 2, -bubbleParams.height, bubbleParams.width, bubbleParams.height, 16);

        const content = this.add.text(0, -bubbleParams.height / 2, text, {
            fontFamily: 'Arial', fontSize: '20px', color: '#000000', align: 'center',
            wordWrap: { width: bubbleParams.width - 20 }
        }).setOrigin(0.5);

        const container = this.add.container(player.x, player.y - 80, [bubble, content]);
        container.setDepth(1000);
        this.speechBubbles.push({ container, player });

        this.tweens.add({
            targets: container, alpha: 0, delay: 3000, duration: 500,
            onComplete: () => {
                container.destroy();
                this.speechBubbles = this.speechBubbles.filter(b => b.container !== container);
            }
        });
    }

    update() {
        if (!this.player) return;

        const speed = 200;
        const body = this.player.body;
        body.setVelocity(0);
        let anim = '';

        if (this.cursors.left.enabled) {
            if (this.cursors.left.isDown || (this.wasd && this.wasd.left.isDown)) { body.setVelocityX(-speed); anim = 'left'; }
            else if (this.cursors.right.isDown || (this.wasd && this.wasd.right.isDown)) { body.setVelocityX(speed); anim = 'right'; }
            if (this.cursors.up.isDown || (this.wasd && this.wasd.up.isDown)) { body.setVelocityY(-speed); if (!anim) anim = 'up'; }
            else if (this.cursors.down.isDown || (this.wasd && this.wasd.down.isDown)) { body.setVelocityY(speed); if (!anim) anim = 'down'; }
        }

        if (body.velocity.x !== 0 && body.velocity.y !== 0) body.velocity.normalize().scale(speed);

        const charKey = CHARACTERS[this.characterIndex].key;
        if (anim) this.player.play(`${charKey}-tavern-${anim}`, true);
        else this.player.stop();
        this.player.setDepth(this.player.y);

        if (this.socket && (body.velocity.x !== 0 || body.velocity.y !== 0 || anim === '')) {
            this.socket.emit('playerMovement', {
                x: Math.floor(this.player.x),
                y: Math.floor(this.player.y),
                animation: anim || 'turn',
                scene: 'TavernScene'
            });
        }

        this.speechBubbles.forEach(b => {
            if (b.container && b.player) b.container.setPosition(b.player.x, b.player.y - 80);
        });
    }

    switchFrame() {
        this.currentFrame = (this.currentFrame + 1) % 3;
        this.tavernImage.setTexture(['tavern1', 'tavern2', 'tavern3'][this.currentFrame]);
    }

    resize(gameSize) { this.updateLayout(); }

    updateLayout() {
        if (!this.tavernImage) return;
        const width = this.scale.width;
        const height = this.scale.height;
        const imgW = this.tavernImage.width;
        const imgH = this.tavernImage.height;
        const zoom = Math.min(width / imgW, height / imgH);
        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(imgW / 2, imgH / 2);
        if (this.infoText) this.infoText.setPosition(imgW / 2, 50);
        if (this.updateInputPosition) this.updateInputPosition();
    }

    exitTavern() {
        if (this.isExiting) return;
        this.isExiting = true;
        this.cameras.main.fadeOut(500, 0, 0, 0);

        if (this.chatInputElement && this.chatInputElement.parentNode) {
            this.chatInputElement.parentNode.removeChild(this.chatInputElement);
        }
        if (this.updateInputPosition) {
            window.removeEventListener('resize', this.updateInputPosition);
        }

        const finishExit = () => {
            if (this.pubMusic) {
                this.pubMusic.stop();
            }
            if (this.socket) {
                this.socket.off('newPlayer');
                this.socket.off('playerMoved');
                this.socket.off('chatMessage');
                this.socket.off('currentPlayers');
                this.socket.off('playerDisconnected');
            }
            this.scene.stop('TavernScene');
            this.scene.wake('GameScene');
        };

        if (this.pubMusic) {
            this.tweens.add({
                targets: this.pubMusic, volume: 0, duration: 500,
                onComplete: finishExit
            });
        } else {
            // If no music, exit immediately after fade
            this.time.delayedCall(500, finishExit);
        }
    }
}

class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // 필요한 기본 에셋 로드 (현재는 없음)
    }

    create() {
        this.scene.start('StartScene');
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, StartScene, GameScene, TavernScene],
    dom: {
        createContainer: true
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

new Phaser.Game(config);
