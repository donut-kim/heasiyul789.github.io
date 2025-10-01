class ShootingGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();

        this.gameState = 'start'; // 'start', 'playing', 'gameover'
        this.score = 0;
        this.lives = 3;
        this.wave = 1;

        // Game objects
        this.donut = null;
        this.sprinkles = [];
        this.monsters = [];
        this.particles = [];

        // Game settings
        this.baseSprinkleSpeed = 1.5; // 기본 속도를 절반으로
        this.baseSprinkleInterval = 2000; // 2초에 하나씩 (절반 속도)
        this.baseMonsterSpeed = 0.15; // 매우 느리게 설정 (절반)
        this.baseMonsterSpawnRate = 6000; // 6초마다 몬스터 생성 (절반 속도)

        // 배속 설정
        this.gameSpeed = 1; // 기본 배속
        this.gameSpeedOptions = [1, 2, 4, 8]; // 가능한 배속들
        this.gameSpeedIndex = 0; // 현재 배속 인덱스

        // 실제 게임 속도 (기본값)
        this.sprinkleSpeed = this.baseSprinkleSpeed;
        this.sprinkleInterval = this.baseSprinkleInterval;
        this.monsterSpeed = this.baseMonsterSpeed;
        this.monsterSpawnRate = this.baseMonsterSpawnRate;

        this.lastSprinkleTime = 0;
        this.lastMonsterSpawn = 0;

        // Game progression
        this.stage = 1;
        this.maxStage = 20;
        this.level = 1;
        this.maxLevel = 20;
        this.experience = 0;
        this.experienceToNext = 100;
        this.playerHp = 3000;
        this.maxPlayerHp = 3000;

        // Boss system
        this.boss = null;
        this.isBossStage = false;

        // Weather system
        this.rainDrops = [];
        this.lightningTime = 0;
        this.lightningFlash = false;
        this.lightningDuration = 0;

        // Game mode system
        this.gameMode = 'normal'; // 'normal' or 'timeattack'
        this.playerNickname = '';
        this.timeAttackDuration = 15 * 60; // 15분 (초 단위)
        this.timeAttackTimer = 0;

        // Input handling
        this.keys = {};
        this.setupInput();

        // UI elements
        this.scoreEl = document.getElementById('score');
        this.stageEl = document.getElementById('stage');
        this.levelEl = document.getElementById('level');
        this.timerEl = document.getElementById('timer');
        this.timerDisplayEl = document.getElementById('timer-display');
        this.startOverlay = document.getElementById('start-overlay');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.finalScoreEl = document.getElementById('final-score');

        this.setupEventListeners();
        this.createSpeedControlUI();
        this.gameLoop();
    }

    setupCanvas() {
        this.canvas.width = 400;
        this.canvas.height = 700;
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupEventListeners() {
        // 게임 시작 버튼
        document.getElementById('start-button').addEventListener('click', () => {
            const nicknameInput = document.getElementById('nickname-input');
            this.playerNickname = nicknameInput.value.trim() || '익명';
            this.startGame();
        });

        // 모드 선택 버튼들
        document.querySelectorAll('.mode-button').forEach(button => {
            button.addEventListener('click', () => {
                // 모든 버튼에서 active 클래스 제거
                document.querySelectorAll('.mode-button').forEach(btn => btn.classList.remove('active'));
                // 클릭된 버튼에 active 클래스 추가
                button.classList.add('active');
                // 게임 모드 설정
                this.gameMode = button.dataset.mode;
            });
        });
    }

    createSpeedControlUI() {
        // 배속 조절 버튼 생성
        const speedControl = document.createElement('div');
        speedControl.id = 'speed-control';
        speedControl.style.position = 'absolute';
        speedControl.style.bottom = '20px';
        speedControl.style.left = '20px';
        speedControl.style.zIndex = '15';
        speedControl.style.background = 'rgba(18, 26, 36, 0.8)';
        speedControl.style.border = '1px solid rgba(110, 214, 255, 0.4)';
        speedControl.style.borderRadius = '8px';
        speedControl.style.padding = '8px 12px';
        speedControl.style.color = '#eef5ff';
        speedControl.style.fontSize = '14px';
        speedControl.style.fontWeight = '600';
        speedControl.style.cursor = 'pointer';
        speedControl.style.userSelect = 'none';
        speedControl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';

        this.updateSpeedControlText(speedControl);

        speedControl.addEventListener('click', () => {
            this.cycleGameSpeed();
            this.updateSpeedControlText(speedControl);
        });

        document.getElementById('game-wrapper').appendChild(speedControl);
        this.speedControlEl = speedControl;
    }

    updateSpeedControlText(element) {
        const speed = this.gameSpeedOptions[this.gameSpeedIndex];
        element.textContent = speed === 1 ? '기본' : `x${speed}`;
    }

    cycleGameSpeed() {
        this.gameSpeedIndex = (this.gameSpeedIndex + 1) % this.gameSpeedOptions.length;
        this.gameSpeed = this.gameSpeedOptions[this.gameSpeedIndex];

        // 배속에 따라 실제 게임 속도 조정
        this.sprinkleSpeed = this.baseSprinkleSpeed * this.gameSpeed;
        this.sprinkleInterval = this.baseSprinkleInterval / this.gameSpeed;
        this.monsterSpeed = this.baseMonsterSpeed * this.gameSpeed;
        this.monsterSpawnRate = this.baseMonsterSpawnRate / this.gameSpeed;
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.sprinkles = [];
        this.monsters = [];
        this.particles = [];

        // 게임 모드에 따른 초기화
        if (this.gameMode === 'timeattack') {
            this.timeAttackTimer = this.timeAttackDuration;
            this.stage = 1; // 타임어택은 항상 1스테이지
            this.maxStage = 1;
        } else {
            this.stage = 1;
            this.maxStage = 20;
        }

        // 도넛 초기 위치
        const donutSize = this.gameMode === 'timeattack' ? 20 : 40; // 타임어택에서 50% 작게
        let donutY;
        if (this.gameMode === 'timeattack') {
            // 타임어택 모드에서는 도마가 없으므로 화면 하단에서 20px 위
            donutY = this.canvas.height - 40;
        } else {
            // 노말 모드에서는 도마 윗면에 딱 맞춤
            donutY = this.canvas.height - 60 - donutSize;
        }

        this.donut = {
            x: this.canvas.width / 2 - donutSize / 2,
            y: donutY,
            width: donutSize,
            height: donutSize,
            speed: 4
        };

        this.lastSprinkleTime = Date.now();
        this.lastMonsterSpawn = Date.now();

        // 타이머 표시 설정
        if (this.gameMode === 'timeattack') {
            this.timerDisplayEl.style.display = 'block';
        } else {
            this.timerDisplayEl.style.display = 'none';
        }

        this.startOverlay.classList.add('hidden');
        this.gameOverOverlay.classList.remove('active');

        this.updateUI();
    }

    update() {
        if (this.gameState !== 'playing') return;

        const now = Date.now();

        // 타임어택 모드 타이머 업데이트
        if (this.gameMode === 'timeattack') {
            this.timeAttackTimer -= 16 / 1000; // 16ms 기준으로 계산 (약 60fps)
            if (this.timeAttackTimer <= 0) {
                this.timeAttackComplete();
                return;
            }
        }

        // 자동 스프링클 발사 (가장 가까운 몬스터를 향해)
        if (now - this.lastSprinkleTime > this.sprinkleInterval) {
            this.shootSprinkleAtNearestMonster();
            this.lastSprinkleTime = now;
        }

        // 보스 체크 및 생성 (타임어택 모드에서는 보스 없음)
        if (this.gameMode !== 'timeattack') {
            this.checkBossStage();
        }

        // 몬스터 생성
        if (!this.isBossStage && now - this.lastMonsterSpawn > this.monsterSpawnRate) {
            this.spawnMonster();
            this.lastMonsterSpawn = now;
        }

        // 스프링클 업데이트
        this.updateSprinkles();

        // 몬스터 업데이트
        this.updateMonsters();

        // 보스 업데이트
        this.updateBoss(16.67); // 대략 60fps 기준

        // 충돌 체크
        this.checkCollisions();

        // 파티클 업데이트
        this.updateParticles();

        // UI 업데이트
        this.updateUI();

        // 게임오버 체크
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    shootSprinkleAtNearestMonster() {
        if (this.monsters.length === 0) return;

        // 가장 가까운 몬스터 찾기
        let nearestMonster = null;
        let nearestDistance = Infinity;

        for (const monster of this.monsters) {
            const dx = monster.x + monster.width / 2 - (this.donut.x + this.donut.width / 2);
            const dy = monster.y + monster.height / 2 - (this.donut.y + this.donut.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestMonster = monster;
            }
        }

        if (nearestMonster) {
            // 몬스터 방향으로 스프링클 발사
            const startX = this.donut.x + this.donut.width / 2;
            const startY = this.donut.y + this.donut.height / 2;
            const targetX = nearestMonster.x + nearestMonster.width / 2;
            const targetY = nearestMonster.y + nearestMonster.height / 2;

            const dx = targetX - startX;
            const dy = targetY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 방향 벡터 정규화
            const vx = (dx / distance) * this.sprinkleSpeed;
            const vy = (dy / distance) * this.sprinkleSpeed;

            // 스프링클 각도 계산
            const angle = Math.atan2(dy, dx);

            // 타임어택 모드에서는 스프링클 크기도 50% 작게
            const sprinkleSize = this.gameMode === 'timeattack' ? 2 : 4;

            this.sprinkles.push({
                x: startX - sprinkleSize / 2,
                y: startY - sprinkleSize / 2,
                width: sprinkleSize,
                height: sprinkleSize,
                vx: vx,
                vy: vy,
                angle: angle
            });
        }
    }

    updateSprinkles() {
        for (let i = this.sprinkles.length - 1; i >= 0; i--) {
            const sprinkle = this.sprinkles[i];
            sprinkle.x += sprinkle.vx;
            sprinkle.y += sprinkle.vy;

            // 화면 밖으로 나간 스프링클 제거
            if (sprinkle.x < -sprinkle.width || sprinkle.x > this.canvas.width ||
                sprinkle.y < -sprinkle.height || sprinkle.y > this.canvas.height) {
                this.sprinkles.splice(i, 1);
            }
        }
    }

    spawnMonster() {
        // 타임어택 모드에서는 몬스터 크기 50% 작게
        const size = this.gameMode === 'timeattack' ? 15 : 30;
        const monster = {
            x: Math.random() * (this.canvas.width - size),
            y: -size,
            width: size,
            height: size,
            speed: this.monsterSpeed + Math.random() * 0.2, // 0.3 ~ 0.5 속도
            hp: 1
        };
        this.monsters.push(monster);
    }

    updateMonsters() {
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            monster.y += monster.speed;

            // 화면 밖으로 나간 몬스터 제거 및 생명력 감소
            if (monster.y > this.canvas.height) {
                this.monsters.splice(i, 1);
                this.lives--;
            }
        }
    }

    checkCollisions() {
        // 스프링클과 몬스터 충돌
        for (let i = this.sprinkles.length - 1; i >= 0; i--) {
            const sprinkle = this.sprinkles[i];

            for (let j = this.monsters.length - 1; j >= 0; j--) {
                const monster = this.monsters[j];

                if (this.isColliding(sprinkle, monster)) {
                    // 파티클 효과 생성
                    this.createParticles(monster.x + monster.width / 2, monster.y + monster.height / 2);

                    // 스프링클과 몬스터 제거
                    this.sprinkles.splice(i, 1);
                    this.monsters.splice(j, 1);

                    // 점수와 경험치 증가
                    this.score += 10;
                    this.gainExperience(20);
                    break;
                }
            }
        }

        // 스프링클과 보스 충돌
        if (this.boss) {
            for (let i = this.sprinkles.length - 1; i >= 0; i--) {
                const sprinkle = this.sprinkles[i];

                if (this.isColliding(sprinkle, this.boss)) {
                    // 파티클 효과 생성
                    this.createParticles(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2);

                    // 스프링클 제거
                    this.sprinkles.splice(i, 1);

                    // 보스 데미지
                    this.boss.hp -= 20;

                    // 점수와 경험치 증가
                    this.score += 50;
                    this.gainExperience(10);

                    // 보스 처치 체크
                    if (this.boss.hp <= 0) {
                        this.createParticles(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2);
                        this.score += 1000;
                        this.gainExperience(200);
                        this.boss = null;
                        this.isBossStage = false;
                        this.nextStage();
                    }
                    break;
                }
            }
        }

        // 도넛과 몬스터 충돌
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];

            if (this.isColliding(this.donut, monster)) {
                this.createParticles(monster.x + monster.width / 2, monster.y + monster.height / 2);
                this.monsters.splice(i, 1);
                this.takeDamage(50);
            }
        }
    }

    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    createParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                maxLife: 30,
                color: `hsl(${Math.random() * 60 + 20}, 70%, 60%)`
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    gainExperience(amount) {
        this.experience += amount;
        if (this.experience >= this.experienceToNext && this.level < this.maxLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.experience -= this.experienceToNext;
        this.experienceToNext = Math.floor(this.experienceToNext * 1.2); // 20% 증가

        // 레벨업 시 체력 회복
        this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + 300);

        // 레벨업 효과 표시
        this.showLevelUpEffect();
    }

    showLevelUpEffect() {
        // 레벨업 파티클 효과
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.donut.x + this.donut.width / 2,
                y: this.donut.y + this.donut.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 60,
                maxLife: 60,
                color: '#FFD700' // 골드 색상
            });
        }
    }

    checkBossStage() {
        // 5스테이지와 15스테이지는 중간보스 (무당벌레)
        // 10스테이지와 20스테이지는 진짜보스
        if (!this.boss && this.monsters.length === 0) {
            if (this.stage === 5 || this.stage === 15) {
                this.spawnLadybugBoss();
            } else if (this.stage === 10) {
                this.spawnBigBoss();
            } else if (this.stage === 20) {
                this.spawnFinalBoss();
            }
        }
    }

    spawnLadybugBoss() {
        this.isBossStage = true;
        this.boss = {
            x: this.canvas.width / 2 - 30,
            y: -60,
            width: 60,
            height: 60,
            hp: 500,
            maxHp: 500,
            speed: 0.5,
            zigzagTime: 0,
            type: 'ladybug'
        };
    }

    spawnBigBoss() {
        this.isBossStage = true;
        this.boss = {
            x: this.canvas.width / 2 - 50,
            y: -100,
            width: 100,
            height: 100,
            hp: 1500,
            maxHp: 1500,
            speed: 0.3,
            moveTime: 0,
            shootTime: 0,
            projectiles: [],
            type: 'big_boss'
        };
    }

    spawnFinalBoss() {
        this.isBossStage = true;
        this.boss = {
            x: this.canvas.width / 2 - 75,
            y: -150,
            width: 150,
            height: 150,
            hp: 3000,
            maxHp: 3000,
            speed: 0.2,
            moveTime: 0,
            shootTime: 0,
            specialTime: 0,
            projectiles: [],
            type: 'final_boss'
        };
    }

    updateBoss(dt) {
        if (!this.boss) return;

        if (this.boss.type === 'ladybug') {
            // 지그재그 움직임
            this.boss.zigzagTime += dt * 0.001;
            this.boss.x += Math.sin(this.boss.zigzagTime * 2) * 2;
            this.boss.y += this.boss.speed * this.gameSpeed;

            // 화면 경계 체크
            if (this.boss.x < 0) this.boss.x = 0;
            if (this.boss.x > this.canvas.width - this.boss.width) {
                this.boss.x = this.canvas.width - this.boss.width;
            }

            // 보스가 도넛과 충돌하면 데미지
            if (this.isColliding(this.boss, this.donut)) {
                this.takeDamage(100);
                this.boss.y -= 20; // 보스를 약간 뒤로 밀어냄
            }

            // 보스가 화면 아래로 나가면 스테이지 클리어 실패
            if (this.boss.y > this.canvas.height) {
                this.takeDamage(1000);
                this.boss = null;
                this.isBossStage = false;
                this.nextStage();
            }
        } else if (this.boss.type === 'big_boss') {
            // 큰 보스 - 좌우 움직임과 탄막 공격
            this.boss.moveTime += dt * 0.001;
            this.boss.shootTime += dt;

            // 좌우 움직임
            this.boss.x += Math.sin(this.boss.moveTime) * 1.5;
            this.boss.y += this.boss.speed * this.gameSpeed;

            // 화면 경계 체크
            if (this.boss.x < 0) this.boss.x = 0;
            if (this.boss.x > this.canvas.width - this.boss.width) {
                this.boss.x = this.canvas.width - this.boss.width;
            }

            // 탄막 발사 (2초마다)
            if (this.boss.shootTime > 2000) {
                this.boss.shootTime = 0;
                this.createBossProjectiles();
            }

            // 보스가 도넛과 충돌하면 데미지
            if (this.isColliding(this.boss, this.donut)) {
                this.takeDamage(200);
                this.boss.y -= 30;
            }

            // 보스가 화면 아래로 나가면 스테이지 클리어 실패
            if (this.boss.y > this.canvas.height) {
                this.takeDamage(1500);
                this.boss = null;
                this.isBossStage = false;
                this.nextStage();
            }
        } else if (this.boss.type === 'final_boss') {
            // 최종 보스 - 복잡한 패턴 공격
            this.boss.moveTime += dt * 0.001;
            this.boss.shootTime += dt;
            this.boss.specialTime += dt;

            // 원형 움직임
            this.boss.x += Math.cos(this.boss.moveTime * 0.5) * 2;
            this.boss.y += this.boss.speed * this.gameSpeed;

            // 화면 경계 체크
            if (this.boss.x < 0) this.boss.x = 0;
            if (this.boss.x > this.canvas.width - this.boss.width) {
                this.boss.x = this.canvas.width - this.boss.width;
            }

            // 일반 탄막 발사 (1.5초마다)
            if (this.boss.shootTime > 1500) {
                this.boss.shootTime = 0;
                this.createBossProjectiles();
            }

            // 특수 공격 (8초마다)
            if (this.boss.specialTime > 8000) {
                this.boss.specialTime = 0;
                this.createSpecialAttack();
            }

            // 보스가 도넛과 충돌하면 데미지
            if (this.isColliding(this.boss, this.donut)) {
                this.takeDamage(300);
                this.boss.y -= 40;
            }

            // 보스가 화면 아래로 나가면 스테이지 클리어 실패
            if (this.boss.y > this.canvas.height) {
                this.takeDamage(2000);
                this.boss = null;
                this.isBossStage = false;
                this.nextStage();
            }
        }

        // 보스 투사체 업데이트
        if (this.boss && this.boss.projectiles) {
            this.updateBossProjectiles(dt);
        }
    }

    createBossProjectiles() {
        if (!this.boss || !this.boss.projectiles) return;

        const bossX = this.boss.x + this.boss.width / 2;
        const bossY = this.boss.y + this.boss.height;

        if (this.boss.type === 'big_boss') {
            // 3방향 탄막
            for (let i = -1; i <= 1; i++) {
                this.boss.projectiles.push({
                    x: bossX,
                    y: bossY,
                    vx: i * 1.5 * this.gameSpeed,
                    vy: 2 * this.gameSpeed,
                    width: 12,
                    height: 12,
                    color: '#ff4444'
                });
            }
        } else if (this.boss.type === 'final_boss') {
            // 5방향 탄막
            for (let i = -2; i <= 2; i++) {
                this.boss.projectiles.push({
                    x: bossX,
                    y: bossY,
                    vx: i * 1.2 * this.gameSpeed,
                    vy: 2.5 * this.gameSpeed,
                    width: 15,
                    height: 15,
                    color: '#8844ff'
                });
            }
        }
    }

    createSpecialAttack() {
        if (!this.boss || this.boss.type !== 'final_boss') return;

        const bossX = this.boss.x + this.boss.width / 2;
        const bossY = this.boss.y + this.boss.height;

        // 원형 탄막 (8방향)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.boss.projectiles.push({
                x: bossX,
                y: bossY,
                vx: Math.cos(angle) * 3 * this.gameSpeed,
                vy: Math.sin(angle) * 3 * this.gameSpeed,
                width: 20,
                height: 20,
                color: '#ff8844'
            });
        }
    }

    updateBossProjectiles(dt) {
        if (!this.boss || !this.boss.projectiles) return;

        for (let i = this.boss.projectiles.length - 1; i >= 0; i--) {
            const proj = this.boss.projectiles[i];

            proj.x += proj.vx;
            proj.y += proj.vy;

            // 화면 밖으로 나가면 제거
            if (proj.x < -proj.width || proj.x > this.canvas.width + proj.width ||
                proj.y < -proj.height || proj.y > this.canvas.height + proj.height) {
                this.boss.projectiles.splice(i, 1);
                continue;
            }

            // 도넛과 충돌 체크
            if (this.isColliding(proj, this.donut)) {
                this.takeDamage(150);
                this.boss.projectiles.splice(i, 1);
            }
        }
    }

    takeDamage(amount) {
        this.playerHp = Math.max(0, this.playerHp - amount);
        if (this.playerHp <= 0) {
            this.gameOver();
        }
    }

    timeAttackComplete() {
        this.gameState = 'gameover';
        this.finalScoreEl.textContent = `🎉 타임어택 완료! 최종 점수: ${this.score}`;
        this.gameOverOverlay.classList.add('active');
    }

    nextStage() {
        if (this.stage < this.maxStage) {
            this.stage++;
            this.monsters = [];
            this.boss = null;
            this.isBossStage = false;
        } else {
            // 게임 클리어
            this.gameOver();
        }
    }

    render() {
        // 배경 그리기
        this.drawBackground();

        if (this.gameState !== 'playing') return;

        // 도마 그리기 (하단 벽) - 타임어택 모드에서는 제거
        if (this.gameMode !== 'timeattack') {
            this.drawCuttingBoard();
        }

        // HP 바 그리기 (도마 아래)
        this.drawPlayerHP();

        // 도넛 그리기
        this.drawDonut();

        // 스프링클 그리기
        this.drawSprinkles();

        // 몬스터 그리기
        this.drawMonsters();

        // 보스 그리기
        if (this.boss) {
            this.drawBoss();
        }

        // 파티클 그리기
        this.drawParticles();

        // 날씨 효과 그리기
        this.drawWeather();
    }

    drawDonut() {
        const donut = this.donut;
        this.ctx.save();

        // 도넛 몸체 (갈색 원)
        this.ctx.fillStyle = '#D2691E';
        this.ctx.beginPath();
        this.ctx.arc(donut.x + donut.width / 2, donut.y + donut.height / 2, donut.width / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 도넛 구멍 (검은색 원)
        this.ctx.fillStyle = '#101218';
        this.ctx.beginPath();
        this.ctx.arc(donut.x + donut.width / 2, donut.y + donut.height / 2, donut.width / 4, 0, Math.PI * 2);
        this.ctx.fill();

        // 글레이즈 (하얀색)
        this.ctx.fillStyle = '#FFE4E1';
        this.ctx.beginPath();
        this.ctx.arc(donut.x + donut.width / 2, donut.y + donut.height / 2, donut.width / 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // 도넛 구멍 다시 그리기
        this.ctx.fillStyle = '#101218';
        this.ctx.beginPath();
        this.ctx.arc(donut.x + donut.width / 2, donut.y + donut.height / 2, donut.width / 4, 0, Math.PI * 2);
        this.ctx.fill();

        // 스프링클 장식
        const sprinkleColors = ['#FF69B4', '#00CED1', '#FFD700', '#32CD32', '#FF4500'];
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = donut.width / 3;
            const sx = donut.x + donut.width / 2 + Math.cos(angle) * radius;
            const sy = donut.y + donut.height / 2 + Math.sin(angle) * radius;

            this.ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
            this.ctx.fillRect(sx - 1, sy - 3, 2, 6);
        }

        this.ctx.restore();
    }

    drawCuttingBoard() {
        const boardHeight = 60; // 120에서 60으로 줄임 (절반)
        const boardY = this.canvas.height - boardHeight;

        this.ctx.save();

        // 떡갈나무 도마 색상 (더 진하고 고급스러운 오크색)
        const oakColor = '#8B7355';
        const oakLightColor = '#A0906B';
        const oakDarkColor = '#6B5B42';

        // 도마 기본 배경 (떡갈나무색)
        this.ctx.fillStyle = oakColor;
        this.ctx.fillRect(0, boardY, this.canvas.width, boardHeight);

        // 도마 윗면 (밝은 떡갈나무색) - 더 얇게
        this.ctx.fillStyle = oakLightColor;
        this.ctx.fillRect(0, boardY, this.canvas.width, 8);

        // 떡갈나무 나무 결 그리기 (더 자연스럽고 고급스럽게)
        this.ctx.strokeStyle = oakDarkColor;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.4;

        // 가로 나무 결 (더 적게, 더 자연스럽게)
        for (let i = 0; i < 3; i++) {
            const y = boardY + 15 + i * 15;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            // 곡선으로 자연스러운 나무결 표현
            this.ctx.quadraticCurveTo(this.canvas.width / 2, y + 2, this.canvas.width, y);
            this.ctx.stroke();
        }

        // 세로 나무 결 (더 섬세하게)
        this.ctx.globalAlpha = 0.2;
        for (let i = 0; i < this.canvas.width; i += 60) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, boardY + 8);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }

        // 나무 매듭 표현 (떡갈나무 특징)
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = oakDarkColor;
        const knotX = this.canvas.width * 0.3;
        const knotY = boardY + boardHeight * 0.6;
        this.ctx.beginPath();
        this.ctx.ellipse(knotX, knotY, 8, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 도마 가장자리 그림자 (더 섬세하게)
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = oakDarkColor;
        this.ctx.fillRect(0, boardY, this.canvas.width, 2);
        this.ctx.fillRect(0, this.canvas.height - 2, this.canvas.width, 2);

        // 좌우 가장자리 (더 얇게)
        this.ctx.fillRect(0, boardY, 2, boardHeight);
        this.ctx.fillRect(this.canvas.width - 2, boardY, 2, boardHeight);

        this.ctx.restore();
    }

    drawPlayerHP() {
        const hpBarWidth = this.canvas.width; // 캔버스 전체 너비
        const hpBarHeight = 20;
        const hpBarX = 0; // 왼쪽 끝에 딱 맞춤
        const hpBarY = this.canvas.height - hpBarHeight; // 맨 하단에 딱 맞춤

        this.ctx.save();

        // HP 바 배경 (빈 공간은 검은색)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        // HP 바 채우기 (빨간색)
        const hpPercentage = this.playerHp / this.maxPlayerHp;
        const fillWidth = hpBarWidth * hpPercentage;

        this.ctx.fillStyle = '#ff0000'; // 빨간색
        this.ctx.fillRect(hpBarX, hpBarY, fillWidth, hpBarHeight);

        // HP 텍스트
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`HP: ${this.playerHp}/${this.maxPlayerHp}`, this.canvas.width / 2, hpBarY + 14);

        this.ctx.restore();
    }

    drawSprinkles() {
        for (const sprinkle of this.sprinkles) {
            this.drawSprinkleProjectile(sprinkle.x + sprinkle.width/2, sprinkle.y + sprinkle.height/2, sprinkle.angle || 0);
        }
    }

    drawSprinkleProjectile(centerX, centerY, angle) {
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(angle);

        const width = 3;
        const height = 12;

        // 도넛라이크 스프링클 스타일 - 그라데이션
        const gradient = this.ctx.createLinearGradient(0, -height/2, 0, height/2);
        gradient.addColorStop(0, '#ff6b93');
        gradient.addColorStop(0.3, '#ff8fab');
        gradient.addColorStop(0.7, '#ffb3c6');
        gradient.addColorStop(1, '#ffd7e4');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(-width/2, -height/2, width, height);

        // 스프링클 하이라이트
        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
        this.ctx.fillRect(-width/2 + 0.5, -height/2 + 1, 1, height - 2);

        this.ctx.restore();
    }

    drawMonsters() {
        for (const monster of this.monsters) {
            this.drawPinkBacteria(monster.x + monster.width / 2, monster.y + monster.height / 2, monster.width / 2);
        }
    }

    drawPinkBacteria(centerX, centerY, radius) {
        this.ctx.save();
        this.ctx.translate(centerX, centerY);

        const size = radius * 2;
        const spikes = 12;
        const baseRadius = size / 2.2;

        // 도넛라이크 핑크세균 몸체 - 스파이크 모양
        this.ctx.fillStyle = '#ff8ed1';  // 핑크세균 몸체 색상
        this.ctx.strokeStyle = '#cc5ea3'; // 테두리 색상
        this.ctx.lineWidth = 3;

        // 스파이크 모양 몸체 그리기
        this.ctx.beginPath();
        for (let i = 0; i <= spikes; i++) {
            const angle = (Math.PI * 2 * i) / spikes;
            const spikeRadius = baseRadius + Math.sin(angle * 3) * (size * 0.08);
            const x = Math.cos(angle) * spikeRadius;
            const y = Math.sin(angle) * spikeRadius;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // 눈 그리기 (흰색 배경)
        this.ctx.fillStyle = '#ffe9f7';
        // 왼쪽 눈
        this.ctx.beginPath();
        this.ctx.arc(-size * 0.15, -size * 0.1, size * 0.18, 0, Math.PI * 2);
        this.ctx.fill();
        // 오른쪽 눈
        this.ctx.beginPath();
        this.ctx.arc(size * 0.18, -size * 0.05, size * 0.14, 0, Math.PI * 2);
        this.ctx.fill();

        // 눈동자 (어두운 색상)
        this.ctx.fillStyle = '#662054';
        // 왼쪽 눈동자
        this.ctx.beginPath();
        this.ctx.arc(-size * 0.15, -size * 0.1, size * 0.07, 0, Math.PI * 2);
        this.ctx.fill();
        // 오른쪽 눈동자
        this.ctx.beginPath();
        this.ctx.arc(size * 0.18, -size * 0.05, size * 0.06, 0, Math.PI * 2);
        this.ctx.fill();

        // 입 그리기 (미소)
        this.ctx.strokeStyle = '#cc5ea3';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, size * 0.15, size * 0.2, 0, Math.PI);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawBoss() {
        if (this.boss.type === 'ladybug') {
            this.drawLadybugBoss(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2, this.boss.width / 2);
        } else if (this.boss.type === 'big_boss') {
            this.drawBigBoss(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2, this.boss.width / 2);
        } else if (this.boss.type === 'final_boss') {
            this.drawFinalBoss(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2, this.boss.width / 2);
        }

        // 보스 HP 바 그리기
        this.drawBossHP();

        // 보스 투사체 그리기
        if (this.boss.projectiles) {
            this.drawBossProjectiles();
        }
    }

    drawLadybugBoss(centerX, centerY, radius) {
        this.ctx.save();
        this.ctx.translate(centerX, centerY);

        // 주황색 몸체 그라디언트
        const bodyGradient = this.ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
        bodyGradient.addColorStop(0, '#ff8c42');
        bodyGradient.addColorStop(0.6, '#ff6b1a');
        bodyGradient.addColorStop(1, '#e55100');

        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 무당벌레 테두리
        this.ctx.strokeStyle = '#bf360c';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 무당벌레 중앙 선
        this.ctx.strokeStyle = '#d84315';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -radius);
        this.ctx.lineTo(0, radius);
        this.ctx.stroke();

        // 검은 점들 (무당벌레 특징)
        this.ctx.fillStyle = '#263238';
        const spots = [
            { x: -0.4, y: -0.3, size: 0.15 },
            { x: 0.4, y: -0.3, size: 0.15 },
            { x: -0.3, y: 0.2, size: 0.12 },
            { x: 0.3, y: 0.2, size: 0.12 },
            { x: 0, y: 0.4, size: 0.1 }
        ];

        spots.forEach(spot => {
            this.ctx.beginPath();
            this.ctx.arc(
                spot.x * radius,
                spot.y * radius,
                spot.size * radius,
                0, Math.PI * 2
            );
            this.ctx.fill();
        });

        // 무당벌레 머리 부분
        this.ctx.fillStyle = '#d84315';
        this.ctx.beginPath();
        this.ctx.arc(0, -radius * 0.7, radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // 작은 눈
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(-radius * 0.15, -radius * 0.7, radius * 0.08, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(radius * 0.15, -radius * 0.7, radius * 0.08, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawBossHP() {
        const hpBarWidth = this.canvas.width - 40;
        const hpBarHeight = 15;
        const hpBarX = 20;
        const hpBarY = 30;

        this.ctx.save();

        // 보스 HP 바 배경
        this.ctx.fillStyle = 'rgba(18, 26, 36, 0.9)';
        this.ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        // 보스 HP 바 테두리
        this.ctx.strokeStyle = '#ff6b1a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        // 보스 HP 바 채우기
        const hpPercentage = this.boss.hp / this.boss.maxHp;
        const fillWidth = hpBarWidth * hpPercentage;

        this.ctx.fillStyle = '#ff8c42';
        this.ctx.fillRect(hpBarX + 2, hpBarY + 2, fillWidth - 4, hpBarHeight - 4);

        // 보스 이름과 HP 텍스트
        this.ctx.fillStyle = '#eef5ff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';

        let bossName = '보스';
        if (this.boss.type === 'ladybug') {
            bossName = '무당벌레 보스';
        } else if (this.boss.type === 'big_boss') {
            bossName = '거대 보스';
        } else if (this.boss.type === 'final_boss') {
            bossName = '최종 보스';
        }

        this.ctx.fillText(bossName, this.canvas.width / 2, hpBarY - 5);
        this.ctx.fillText(`${this.boss.hp}/${this.boss.maxHp}`, this.canvas.width / 2, hpBarY + 25);

        this.ctx.restore();
    }

    drawBigBoss(centerX, centerY, radius) {
        this.ctx.save();
        this.ctx.translate(centerX, centerY);

        // 큰 보스 - 어두운 보라색 그라디언트
        const bodyGradient = this.ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
        bodyGradient.addColorStop(0, '#6a1b9a');
        bodyGradient.addColorStop(0.6, '#4a148c');
        bodyGradient.addColorStop(1, '#2e0f47');

        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 테두리
        this.ctx.strokeStyle = '#1a237e';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // 위험한 패턴들
        this.ctx.strokeStyle = '#ff5722';
        this.ctx.lineWidth = 2;

        // X 모양
        this.ctx.beginPath();
        this.ctx.moveTo(-radius * 0.7, -radius * 0.7);
        this.ctx.lineTo(radius * 0.7, radius * 0.7);
        this.ctx.moveTo(radius * 0.7, -radius * 0.7);
        this.ctx.lineTo(-radius * 0.7, radius * 0.7);
        this.ctx.stroke();

        // 중앙 원
        this.ctx.fillStyle = '#ff1744';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // 눈
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.beginPath();
        this.ctx.arc(-radius * 0.2, -radius * 0.2, radius * 0.1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(radius * 0.2, -radius * 0.2, radius * 0.1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawFinalBoss(centerX, centerY, radius) {
        this.ctx.save();
        this.ctx.translate(centerX, centerY);

        // 최종 보스 - 무지개 그라디언트
        const bodyGradient = this.ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
        bodyGradient.addColorStop(0, '#ff6b93');
        bodyGradient.addColorStop(0.2, '#ffb347');
        bodyGradient.addColorStop(0.4, '#70c8ff');
        bodyGradient.addColorStop(0.6, '#98fb98');
        bodyGradient.addColorStop(0.8, '#dda0dd');
        bodyGradient.addColorStop(1, '#ff69b4');

        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 회전하는 외곽 링
        const ringGradient = this.ctx.createLinearGradient(-radius, -radius, radius, radius);
        ringGradient.addColorStop(0, '#ffd700');
        ringGradient.addColorStop(0.5, '#ff4500');
        ringGradient.addColorStop(1, '#9400d3');

        this.ctx.strokeStyle = ringGradient;
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
        this.ctx.stroke();

        // 다중 동심원
        for (let i = 0; i < 3; i++) {
            this.ctx.strokeStyle = `hsl(${Date.now() * 0.1 + i * 120}, 100%, 60%)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius * (0.3 + i * 0.2), 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // 크라운 (왕관)
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * radius * 1.3;
            const y = Math.sin(angle) * radius * 1.3;
            this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fill();

        // 강력한 눈빛
        this.ctx.fillStyle = '#ff0000';
        this.ctx.shadowColor = '#ff0000';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(radius * 0.3, -radius * 0.3, radius * 0.15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }

    drawBossProjectiles() {
        if (!this.boss || !this.boss.projectiles) return;

        this.boss.projectiles.forEach(proj => {
            this.ctx.save();
            this.ctx.fillStyle = proj.color;
            this.ctx.shadowColor = proj.color;
            this.ctx.shadowBlur = 5;
            this.ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
            this.ctx.restore();
        });
    }

    drawBackground() {
        this.ctx.save();

        // 스테이지에 따른 날씨 계산
        const weatherIntensity = Math.min(this.stage / 20, 1); // 0 ~ 1

        // 기본 초록색 마을 배경
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);

        if (this.stage <= 5) {
            // 맑은 날씨 (초록색 마을)
            skyGradient.addColorStop(0, '#87CEEB'); // 하늘색
            skyGradient.addColorStop(0.7, '#98FB98'); // 연한 초록
            skyGradient.addColorStop(1, '#228B22'); // 진한 초록
        } else if (this.stage <= 10) {
            // 흐린 날씨
            skyGradient.addColorStop(0, '#696969'); // 회색 하늘
            skyGradient.addColorStop(0.7, '#6B8E23'); // 어두운 올리브
            skyGradient.addColorStop(1, '#2F4F2F'); // 어두운 초록
        } else if (this.stage <= 15) {
            // 비 오는 날씨
            skyGradient.addColorStop(0, '#2F2F2F'); // 어두운 회색
            skyGradient.addColorStop(0.7, '#556B2F'); // 매우 어두운 올리브
            skyGradient.addColorStop(1, '#1C1C1C'); // 거의 검은색
        } else {
            // 폭풍우 (번개)
            const lightningBrightness = this.lightningFlash ? 0.8 : 0;
            const baseR = 20 + lightningBrightness * 200;
            const baseG = 20 + lightningBrightness * 200;
            const baseB = 40 + lightningBrightness * 200;

            skyGradient.addColorStop(0, `rgb(${baseR}, ${baseG}, ${baseB})`);
            skyGradient.addColorStop(0.7, `rgb(${Math.floor(baseR * 0.3)}, ${Math.floor(baseG * 0.5)}, ${Math.floor(baseB * 0.2)})`);
            skyGradient.addColorStop(1, '#000000');
        }

        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 마을 실루엣 그리기
        this.drawVillageBackground();

        this.ctx.restore();
    }

    drawVillageBackground() {
        // 단순하고 행복한 마을
        this.ctx.save();

        // 멀리 보이는 부드러운 언덕들
        this.ctx.fillStyle = 'rgba(34, 139, 34, 0.6)'; // 연한 초록
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - 120);
        this.ctx.quadraticCurveTo(150, this.canvas.height - 160, 300, this.canvas.height - 130);
        this.ctx.quadraticCurveTo(400, this.canvas.height - 140, 400, this.canvas.height - 100);
        this.ctx.lineTo(400, this.canvas.height - 100);
        this.ctx.lineTo(0, this.canvas.height - 100);
        this.ctx.closePath();
        this.ctx.fill();

        // 아주 단순한 집들 (작고 귀여운)
        const houses = [
            {x: 80, y: this.canvas.height - 140, w: 35, h: 25},
            {x: 150, y: this.canvas.height - 135, w: 30, h: 20},
            {x: 250, y: this.canvas.height - 145, w: 40, h: 30},
            {x: 320, y: this.canvas.height - 130, w: 25, h: 15}
        ];

        // 집들을 단순하게 그리기
        this.ctx.fillStyle = 'rgba(139, 69, 19, 0.7)'; // 갈색
        houses.forEach(house => {
            this.ctx.fillRect(house.x, house.y, house.w, house.h);

            // 간단한 삼각형 지붕
            this.ctx.fillStyle = 'rgba(178, 34, 34, 0.8)'; // 빨간 지붕
            this.ctx.beginPath();
            this.ctx.moveTo(house.x - 3, house.y);
            this.ctx.lineTo(house.x + house.w / 2, house.y - 12);
            this.ctx.lineTo(house.x + house.w + 3, house.y);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.fillStyle = 'rgba(139, 69, 19, 0.7)'; // 다시 갈색으로
        });

        // 아주 단순한 나무들
        const trees = [
            {x: 50, y: this.canvas.height - 130},
            {x: 200, y: this.canvas.height - 125},
            {x: 360, y: this.canvas.height - 135}
        ];

        trees.forEach(tree => {
            // 나무 줄기
            this.ctx.fillStyle = 'rgba(101, 67, 33, 0.8)';
            this.ctx.fillRect(tree.x, tree.y, 4, 15);

            // 나무 잎 (간단한 원)
            this.ctx.fillStyle = 'rgba(34, 139, 34, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(tree.x + 2, tree.y - 5, 12, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.restore();
    }

    drawWeather() {
        if (this.stage > 5) {
            this.updateRain();
            this.drawRain();
        }

        if (this.stage > 15) {
            this.updateLightning();
        }
    }

    updateRain() {
        // 스테이지에 따른 비 강도
        const rainIntensity = Math.min((this.stage - 5) / 15, 1);
        const maxRainDrops = Math.floor(50 * rainIntensity);

        // 새로운 빗방울 생성
        if (this.rainDrops.length < maxRainDrops && Math.random() < 0.3) {
            this.rainDrops.push({
                x: Math.random() * this.canvas.width,
                y: -10,
                speed: 3 + Math.random() * 4,
                length: 10 + Math.random() * 10
            });
        }

        // 빗방울 이동 및 제거
        for (let i = this.rainDrops.length - 1; i >= 0; i--) {
            const drop = this.rainDrops[i];
            drop.y += drop.speed * this.gameSpeed;

            if (drop.y > this.canvas.height) {
                this.rainDrops.splice(i, 1);
            }
        }
    }

    drawRain() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(173, 216, 230, 0.6)';
        this.ctx.lineWidth = 2;

        this.rainDrops.forEach(drop => {
            this.ctx.beginPath();
            this.ctx.moveTo(drop.x, drop.y);
            this.ctx.lineTo(drop.x, drop.y + drop.length);
            this.ctx.stroke();
        });

        this.ctx.restore();
    }

    updateLightning() {
        this.lightningTime += 16; // 대략 60fps 기준

        // 번개 효과
        if (this.lightningTime > 3000 + Math.random() * 5000) { // 3-8초마다
            this.lightningTime = 0;
            this.lightningFlash = true;
            this.lightningDuration = 0;
        }

        if (this.lightningFlash) {
            this.lightningDuration += 16;
            if (this.lightningDuration > 200) { // 0.2초간 번개
                this.lightningFlash = false;
            }
        }
    }

    drawParticles() {
        for (const particle of this.particles) {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
            this.ctx.restore();
        }
    }

    updateUI() {
        this.scoreEl.textContent = this.score;
        this.stageEl.textContent = this.stage;
        this.levelEl.textContent = this.level;

        // 타임어택 모드에서 타이머 업데이트
        if (this.gameMode === 'timeattack' && this.timerEl) {
            const minutes = Math.floor(this.timeAttackTimer / 60);
            const seconds = Math.floor(this.timeAttackTimer % 60);
            this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    gameOver() {
        this.gameState = 'gameover';
        this.finalScoreEl.textContent = `최종 점수: ${this.score}`;
        this.gameOverOverlay.classList.add('active');
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

function restartGame() {
    game.startGame();
}

// 게임 시작
const game = new ShootingGame();