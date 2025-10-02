// 타임어택 모드 배경 렌더링

export function drawDonutShopBackground(ctx, state, getWorldDims, worldToScreen, vector, clamp, timeAttackConstants) {
  const { worldW, worldH, halfW, halfH } = getWorldDims();

  // ===== 도넛 가게 내부 배경 =====

  // 부드러운 갈색계열 바닥
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(0, 0, worldW, worldH);

  // 타일 패턴
  drawDonutShopTiles(ctx, state, getWorldDims, worldToScreen, vector);

  // 가게 구조물 그리기 (월드 좌표계)
  drawShopStructures(ctx, state, getWorldDims, worldToScreen, vector, timeAttackConstants);

  // 도넛들 배치
  drawDonutDisplay(ctx, state, getWorldDims, worldToScreen, vector, clamp, timeAttackConstants);
}

// 가게 구조물 그리기 함수 - 시작 위치가 가게 중앙
function drawShopStructures(ctx, state, getWorldDims, worldToScreen, vector, timeAttackConstants) {
  const { worldW, worldH } = getWorldDims();

  // 상단 메뉴판 (큰 메뉴판)
  const menuPos = worldToScreen(vector(0, -600));
  if (menuPos.x > -1000 && menuPos.x < worldW + 1000 &&
      menuPos.y > -500 && menuPos.y < worldH + 500) {
    ctx.save();
    ctx.translate(menuPos.x, menuPos.y);
    drawMenuBoard(ctx);
    ctx.restore();
  }

  // 왼쪽 쇼케이스 1 (도넛&케이크)
  const showcase1Pos = worldToScreen(vector(-700, 200));
  if (showcase1Pos.x > -1000 && showcase1Pos.x < worldW + 1000 &&
      showcase1Pos.y > -500 && showcase1Pos.y < worldH + 500) {
    ctx.save();
    ctx.translate(showcase1Pos.x, showcase1Pos.y);
    drawShowcaseWithDonuts(ctx);
    ctx.restore();
  }

  // 왼쪽 쇼케이스 2 (음료수)
  const showcase2Pos = worldToScreen(vector(-700, 800));
  if (showcase2Pos.x > -1000 && showcase2Pos.x < worldW + 1000 &&
      showcase2Pos.y > -500 && showcase2Pos.y < worldH + 500) {
    ctx.save();
    ctx.translate(showcase2Pos.x, showcase2Pos.y);
    drawShowcaseWithDrinks(ctx);
    ctx.restore();
  }

  // 오른쪽 계산대
  const counterPos = worldToScreen(vector(700, 500));
  if (counterPos.x > -500 && counterPos.x < worldW + 500 &&
      counterPos.y > -500 && counterPos.y < worldH + 500) {
    ctx.save();
    ctx.translate(counterPos.x, counterPos.y);
    drawCounter(ctx);
    ctx.restore();
  }
}

// 메뉴판 그리기 (큰 사이즈)
function drawMenuBoard(ctx) {
  // 메뉴판 배경
  ctx.fillStyle = '#2c1810';
  ctx.fillRect(-500, -200, 1000, 400);

  // 메뉴판 테두리
  ctx.strokeStyle = '#8b6f47';
  ctx.lineWidth = 15;
  ctx.strokeRect(-500, -200, 1000, 400);

  // 메뉴 텍스트
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('KIMDONUT SHOP MENU', 0, -120);

  ctx.font = '36px Arial';
  ctx.fillStyle = '#ffebcd';
  ctx.fillText('KIM Donut .............. $7.77', 0, -40);
  ctx.fillText('KIM Latte .............. $7.77', 0, 10);
  ctx.fillText('pretzel ................ $2.80', 0, 60);
  ctx.fillText('Strawberry Cake ........ $4.50', 0, 110);
  ctx.fillText('Orange Juice ........... $3.50', 0, 160);
}

// 쇼케이스 (도넛&케이크) - 더 큰 사이즈
function drawShowcaseWithDonuts(ctx) {
  const width = 1000;
  const height = 500;

  // 쇼케이스 하단부 (나무)
  ctx.fillStyle = '#8b6f47';
  ctx.fillRect(-width/2, height/2 - 100, width, 100);

  // 쇼케이스 유리 (투명)
  const glassGrad = ctx.createLinearGradient(0, -height/2, 0, height/2 - 100);
  glassGrad.addColorStop(0, 'rgba(200, 230, 255, 0.3)');
  glassGrad.addColorStop(0.5, 'rgba(220, 240, 255, 0.2)');
  glassGrad.addColorStop(1, 'rgba(200, 230, 255, 0.3)');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(-width/2 + 20, -height/2, width - 40, height - 100);

  // 쇼케이스 테두리
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 10;
  ctx.strokeRect(-width/2, -height/2, width, height - 100);

  // 내부 선반
  ctx.strokeStyle = '#a0826d';
  ctx.lineWidth = 5;
  const shelf1Y = -120;
  const shelf2Y = 40;
  ctx.beginPath();
  ctx.moveTo(-width/2 + 20, shelf1Y);
  ctx.lineTo(width/2 - 20, shelf1Y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-width/2 + 20, shelf2Y);
  ctx.lineTo(width/2 - 20, shelf2Y);
  ctx.stroke();

  // 유리 반사광
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-width/2 + 40, -height/2 + 20);
  ctx.lineTo(-width/2 + 40, height/2 - 120);
  ctx.stroke();

  // 도넛과 케이크 채우기
  // 상단 선반 - 케이크들
  for (let i = 0; i < 6; i++) {
    const x = -450 + i * 150;
    const y = -190;
    ctx.save();
    ctx.translate(x, y);
    if (i % 2 === 0) {
      drawCake(ctx);
    } else {
      drawSmallDonut(ctx);
    }
    ctx.restore();
  }

  // 중간 선반 - 도넛들 (선반에 정렬)
  for (let i = 0; i < 7; i++) {
    const x = -450 + i * 140;
    const y = shelf1Y - 50;
    ctx.save();
    ctx.translate(x, y);
    drawSmallDonut(ctx, i % 3);
    ctx.restore();
  }

  // 하단 선반 - 도넛과 케이크 섞어서 (선반에 정렬)
  for (let i = 0; i < 6; i++) {
    const x = -450 + i * 150;
    const y = shelf2Y - 30;
    ctx.save();
    ctx.translate(x, y);
    if (i % 3 === 0) {
      drawCake(ctx);
    } else {
      drawSmallDonut(ctx, (i + 1) % 3);
    }
    ctx.restore();
  }
}

// 쇼케이스 (음료수) - 더 큰 사이즈
function drawShowcaseWithDrinks(ctx) {
  const width = 1000;
  const height = 500;

  // 쇼케이스 하단부 (나무)
  ctx.fillStyle = '#8b6f47';
  ctx.fillRect(-width/2, height/2 - 100, width, 100);

  // 쇼케이스 유리 (투명)
  const glassGrad = ctx.createLinearGradient(0, -height/2, 0, height/2 - 100);
  glassGrad.addColorStop(0, 'rgba(200, 230, 255, 0.3)');
  glassGrad.addColorStop(0.5, 'rgba(220, 240, 255, 0.2)');
  glassGrad.addColorStop(1, 'rgba(200, 230, 255, 0.3)');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(-width/2 + 20, -height/2, width - 40, height - 100);

  // 쇼케이스 테두리
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 10;
  ctx.strokeRect(-width/2, -height/2, width, height - 100);

  // 내부 선반
  ctx.strokeStyle = '#a0826d';
  ctx.lineWidth = 5;
  const drinkShelf1Y = -120;
  const drinkShelf2Y = 40;
  ctx.beginPath();
  ctx.moveTo(-width/2 + 20, drinkShelf1Y);
  ctx.lineTo(width/2 - 20, drinkShelf1Y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-width/2 + 20, drinkShelf2Y);
  ctx.lineTo(width/2 - 20, drinkShelf2Y);
  ctx.stroke();

  // 유리 반사광
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-width/2 + 40, -height/2 + 20);
  ctx.lineTo(-width/2 + 40, height/2 - 120);
  ctx.stroke();

  // 음료수 채우기
  // 상단 선반
  for (let i = 0; i < 8; i++) {
    const x = -450 + i * 120;
    const y = -190;
    ctx.save();
    ctx.translate(x, y);
    drawDrink(ctx, i % 4);
    ctx.restore();
  }

  // 중간 선반 (선반에 정렬)
  for (let i = 0; i < 8; i++) {
    const x = -450 + i * 120;
    const y = drinkShelf1Y - 50;
    ctx.save();
    ctx.translate(x, y);
    drawDrink(ctx, (i + 1) % 4);
    ctx.restore();
  }

  // 하단 선반 (선반에 정렬)
  for (let i = 0; i < 8; i++) {
    const x = -450 + i * 120;
    const y = drinkShelf2Y - 50;
    ctx.save();
    ctx.translate(x, y);
    drawDrink(ctx, (i + 2) % 4);
    ctx.restore();
  }
}

// 작은 도넛 그리기 (부드러운 배경 색상)
function drawSmallDonut(ctx, type = 0) {
  const colors = ['#c9a66b', '#9d7a54', '#d4a5a5'];
  const toppingColors = ['#e6d5b8', '#7d5d43', '#dbb8b8'];

  // 도넛 본체
  ctx.fillStyle = colors[type];
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();

  // 가운데 구멍
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  // 토핑
  ctx.fillStyle = toppingColors[type];
  ctx.beginPath();
  ctx.arc(0, -2, 21, 0, Math.PI, true);
  ctx.fill();
}

// 케이크 그리기 (부드러운 배경 색상)
function drawCake(ctx) {
  // 케이크 아래층
  ctx.fillStyle = '#d9c9a3';
  ctx.fillRect(-25, 0, 50, 25);

  // 케이크 위층
  ctx.fillStyle = '#e5d4d4';
  ctx.fillRect(-20, -20, 40, 20);

  // 크림
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(-20, -22, 40, 3);

  // 딸기
  ctx.fillStyle = '#c97a7a';
  ctx.beginPath();
  ctx.arc(-10, -25, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -25, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(10, -25, 4, 0, Math.PI * 2);
  ctx.fill();
}

// 음료수 그리기 (부드러운 배경 색상)
function drawDrink(ctx, type = 0) {
  const colors = ['#d4956e', '#8fb8b2', '#d9c98a', '#a8c9b0'];

  // 컵 본체
  ctx.fillStyle = 'rgba(230, 230, 230, 0.8)';
  ctx.fillRect(-15, -30, 30, 50);

  // 음료
  ctx.fillStyle = colors[type];
  ctx.fillRect(-14, -25, 28, 42);

  // 뚜껑
  ctx.fillStyle = '#666';
  ctx.fillRect(-16, -32, 32, 3);

  // 빨대
  ctx.strokeStyle = '#b87070';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(5, -32);
  ctx.lineTo(5, -45);
  ctx.stroke();
}

// 계산대 그리기 (큰 사이즈)
function drawCounter(ctx) {
  // 계산대 본체
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(-300, -250, 600, 500);

  // 계산대 상단
  ctx.fillStyle = '#8b6f47';
  ctx.fillRect(-320, -270, 640, 50);

  // 계산기
  ctx.fillStyle = '#2c2c2c';
  ctx.fillRect(-100, -200, 200, 150);

  ctx.fillStyle = '#4a4a4a';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      ctx.fillRect(-70 + j * 50, -170 + i * 35, 35, 25);
    }
  }

  // 디스플레이
  ctx.fillStyle = '#88cc88';
  ctx.fillRect(-90, -190, 180, 30);

  // 계산대 서랍
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 5;
  ctx.strokeRect(-280, -50, 560, 80);
  ctx.strokeRect(-280, 50, 560, 80);
  ctx.strokeRect(-280, 150, 560, 80);

  // 손잡이
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(-30, -20, 60, 15);
  ctx.fillRect(-30, 80, 60, 15);
  ctx.fillRect(-30, 180, 60, 15);
}

function drawDonutShopTiles(ctx, state, getWorldDims, worldToScreen, vector) {
  const { worldW, worldH } = getWorldDims();
  const tileSize = 60;

  // 고정된 월드 좌표 기준으로 타일 그리기
  const viewStartX = state.playerPos.x - worldW / 2;
  const viewEndX = state.playerPos.x + worldW / 2;
  const viewStartY = state.playerPos.y - worldH / 2;
  const viewEndY = state.playerPos.y + worldH / 2;

  // 타일은 0,0 기준으로 고정
  const firstTileX = Math.floor(viewStartX / tileSize) * tileSize;
  const firstTileY = Math.floor(viewStartY / tileSize) * tileSize;

  ctx.strokeStyle = 'rgba(200, 185, 160, 0.5)';
  ctx.lineWidth = 2;

  // 세로 타일선
  for (let worldX = firstTileX; worldX <= viewEndX + tileSize; worldX += tileSize) {
    const screenX = worldToScreen(vector(worldX, 0)).x;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, worldH);
    ctx.stroke();
  }

  // 가로 타일선
  for (let worldY = firstTileY; worldY <= viewEndY + tileSize; worldY += tileSize) {
    const screenY = worldToScreen(vector(0, worldY)).y;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(worldW, screenY);
    ctx.stroke();
  }
}

function drawDisplayShelves(ctx, getWorldDims) {
  const { worldW, worldH } = getWorldDims();

  // 가로 진열대 라인 (상단, 중단, 하단)
  const shelfPositions = [worldH * 0.2, worldH * 0.5, worldH * 0.8];

  ctx.save();
  ctx.strokeStyle = 'rgba(139, 94, 60, 0.3)';
  ctx.lineWidth = 4;

  shelfPositions.forEach(y => {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(worldW, y);
    ctx.stroke();
  });

  ctx.restore();
}

let timeAttackBackgroundItems = null;
let timeAttackBackgroundBounds = null;

function drawDonutDisplay(ctx, state, getWorldDims, worldToScreen, vector, clamp, timeAttackConstants) {
  const { worldW, worldH } = getWorldDims();
  const bounds = state.elapsed; // 게임 시간으로 bounds 대체
  const donutSpacing = 150;
  const jitterRange = donutSpacing * 0.3;
  const placementChance = 0.4;

  // 배경 도넛을 한 번만 생성
  if (!timeAttackBackgroundItems || timeAttackBackgroundBounds !== bounds) {
    // 시드 기반 랜덤 함수
    function seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    let seedCounter = 1000;
    const donutTypes = ['glazed', 'chocolate', 'strawberry', 'sprinkle', 'boston', 'jelly'];
    timeAttackBackgroundItems = [];

    const limitX = timeAttackConstants.TIME_ATTACK_WORLD_BOUNDS;
    const limitY = timeAttackConstants.TIME_ATTACK_WORLD_BOUNDS;
    const minX = -limitX;
    const maxX = limitX;
    const minY = -limitY;
    const maxY = limitY;

    // 배경 전체에 도넛 배치
    for (let x = minX; x <= maxX; x += donutSpacing) {
      for (let y = minY; y <= maxY; y += donutSpacing) {
        const placementRoll = seededRandom(seedCounter++);
        if (placementRoll > placementChance) {
          continue;
        }
        const randomX = clamp(
          x + (seededRandom(seedCounter++) - 0.5) * 2 * jitterRange,
          minX,
          maxX
        );
        const randomY = clamp(
          y + (seededRandom(seedCounter++) - 0.5) * 2 * jitterRange,
          minY,
          maxY
        );
        const typeIndex = Math.floor(seededRandom(seedCounter++) * donutTypes.length);
        const scale = 0.7 + seededRandom(seedCounter++) * 0.5;

        timeAttackBackgroundItems.push({
          worldX: randomX,
          worldY: randomY,
          type: donutTypes[typeIndex],
          scale
        });
      }
    }

    timeAttackBackgroundBounds = bounds;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, worldW, worldH);
  ctx.clip();

  // 모든 배경 도넛 그리기
  timeAttackBackgroundItems.forEach(item => {
    const screenPos = worldToScreen(vector(item.worldX, item.worldY));

    if (screenPos.x > -100 && screenPos.x < worldW + 100 &&
        screenPos.y > -100 && screenPos.y < worldH + 100) {

      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.translate(screenPos.x, screenPos.y);
      ctx.scale(item.scale, item.scale);

      switch (item.type) {
        case 'glazed':
          drawGlazedDonut(ctx, 0, 0);
          break;
        case 'chocolate':
          drawChocolateDonut(ctx, 0, 0);
          break;
        case 'strawberry':
          drawStrawberryDonut(ctx, 0, 0);
          break;
        case 'sprinkle':
          drawSprinkleDonut(ctx, 0, 0);
          break;
        case 'boston':
          drawBostonDonut(ctx, 0, 0);
          break;
        case 'jelly':
          drawJellyDonut(ctx, 0, 0);
          break;
      }

      ctx.restore();
    }
  });

  ctx.restore();
}

// 도넛 그리기 함수들
function drawGlazedDonut(ctx, x, y) {
  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5e6d3';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 8, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawChocolateDonut(ctx, x, y) {
  ctx.fillStyle = '#c8a574';
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5e6d3';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.arc(x, y - 2, 26, 0, Math.PI, true);
  ctx.fill();
}

function drawStrawberryDonut(ctx, x, y) {
  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5e6d3';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff69b4';
  ctx.beginPath();
  ctx.arc(x, y - 2, 26, 0, Math.PI, true);
  ctx.fill();
}

function drawSprinkleDonut(ctx, x, y) {
  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5e6d3';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffb6c1';
  ctx.beginPath();
  ctx.arc(x, y - 2, 26, 0, Math.PI, true);
  ctx.fill();

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 8) * i;
    const sx = x + Math.cos(angle) * 18;
    const sy = y - 8 + Math.sin(angle) * 10;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(sx - 1, sy - 3, 2, 6);
  }
}

function drawBostonDonut(ctx, x, y) {
  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5e6d3';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.arc(x, y - 2, 26, 0, Math.PI, true);
  ctx.fill();

  ctx.fillStyle = '#fff8dc';
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawJellyDonut(ctx, x, y) {
  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dc143c';
  ctx.beginPath();
  ctx.arc(x + 5, y, 4, 0, Math.PI * 2);
  ctx.fill();
}
