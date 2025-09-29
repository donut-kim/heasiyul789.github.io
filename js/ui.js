import { loadRankingData, formatSurvivalTime, getCharacterDisplayName, truncateText, isLocalEnvironment } from './ranking.js';

// DOM 요소들
export let modalOverlay, startOverlay, nicknameInput, startButton;

export function initializeUIElements() {
  modalOverlay = document.getElementById('modal-overlay');
  startOverlay = document.getElementById('start-overlay');
  nicknameInput = document.getElementById('nickname-input');
  startButton = document.getElementById('start-button');
}

export function showModal(title, message, { showRestart = false, showRanking = false, extraHTML = '' } = {}) {
  modalOverlay.innerHTML = '';
  const titleEl = document.createElement('h1');
  titleEl.textContent = title;
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  modalOverlay.appendChild(titleEl);
  modalOverlay.appendChild(messageEl);
  if (extraHTML) {
    const wrapper = document.createElement('div');
    wrapper.className = 'result-summary';
    wrapper.innerHTML = extraHTML;
    modalOverlay.appendChild(wrapper);
  }

  if (showRestart || showRanking) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.justifyContent = 'center';

    if (showRestart) {
      const restartButton = document.createElement('button');
      restartButton.className = 'overlay-button';
      restartButton.type = 'button';
      restartButton.textContent = '다시 시작';
      restartButton.addEventListener('click', window.restartGame);
      buttonContainer.appendChild(restartButton);
    }

    if (showRanking) {
      const rankingButton = document.createElement('button');
      rankingButton.className = 'overlay-button';
      rankingButton.type = 'button';
      rankingButton.textContent = '랭킹보기';
      rankingButton.addEventListener('click', showRankingModal);
      buttonContainer.appendChild(rankingButton);
    }

    modalOverlay.appendChild(buttonContainer);
  }
  modalOverlay.classList.add('active');
}

export async function showRankingModal() {
  // 로딩 중 표시
  showModal('🏆 랭킹', '', {
    showRestart: false,
    showRanking: false,
    extraHTML: `
      <div style="width: min(95vw, 600px); max-width: 600px;">
        <div style="text-align: center; padding: 40px; color: #9fb4d8;">
          랭킹 데이터를 불러오는 중...
        </div>
      </div>
    `
  });

  let rankingHTML = '';

  try {
    const rankings = await loadRankingData();

    if (rankings.length === 0) {
      rankingHTML = '<div style="text-align: center; padding: 20px; color: #9fb4d8;">아직 랭킹 데이터가 없습니다.</div>';
    } else {
      rankingHTML = '<div style="max-height: min(60vh, 400px); overflow-y: auto; font-family: monospace;">';
      rankings.forEach((rank, index) => {
        const nickname = truncateText(rank.nickname, 8);
        const survivalTime = formatSurvivalTime(rank.survivalTime);
        const rankEmoji = index === 0 || index === 1 ? ' 🍗' : '';
        rankingHTML += `
          <div style="display: grid; grid-template-columns: 25px 1fr 55px 65px 75px; gap: 6px; align-items: center; padding: 6px 8px; margin: 2px 0; background: rgba(0,0,0,0.3); border-radius: 4px; border-left: 3px solid ${index < 3 ? '#ffd700' : '#4a90e2'}; font-size: 13px;">
            <span style="font-weight: bold; color: #ffffff; text-align: center;">${index + 1}${rankEmoji}</span>
            <span style="color: #9fb4d8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${nickname}</span>
            <span style="color: #a3e635; text-align: center; font-size: 12px;">S${rank.stage}</span>
            <span style="color: #fbbf24; text-align: center; font-size: 12px;">${survivalTime}</span>
            <span style="color: #ffffff; font-weight: bold; text-align: right; font-size: 12px;">${rank.finalScore.toLocaleString()}</span>
          </div>
        `;
      });
      rankingHTML += '</div>';
    }
  } catch (error) {
    console.error('랭킹 데이터 로딩 실패:', error);
    rankingHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">랭킹 데이터를 불러오는데 실패했습니다.</div>';
  }

  // 로컬 환경 경고 메시지
  const localWarning = isLocalEnvironment() ?
    '<div style="background: rgba(255, 193, 7, 0.2); border: 1px solid #ffc107; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 12px; color: #ffc107; text-align: center;">⚠️ 로컬 환경에서는 랭킹 저장이 비활성화됩니다</div>' : '';

  showModal('🏆 랭킹', '', {
    showRestart: false,
    showRanking: false,
    extraHTML: `
      <div style="width: min(95vw, 600px); max-width: 600px;">
        ${localWarning}
        <div style="display: grid; grid-template-columns: 25px 1fr 55px 65px 75px; gap: 6px; padding: 6px 8px; margin-bottom: 8px; font-weight: bold; color: #9fb4d8; border-bottom: 1px solid rgba(159,180,216,0.3); font-size: 13px;">
          <span style="text-align: center;">순위</span>
          <span>닉네임</span>
          <span style="text-align: center;">스테이지</span>
          <span style="text-align: center;">시간</span>
          <span style="text-align: right;">점수</span>
        </div>
        ${rankingHTML}
        <div style="text-align: center; margin-top: 20px;">
          <button class="overlay-button" id="ranking-close-btn" style="background: #4a90e2;">닫기</button>
        </div>
      </div>
    `
  });

  // 닫기 버튼에 이벤트 리스너 추가
  setTimeout(() => {
    const closeBtn = document.getElementById('ranking-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeRankingAndGoToStart);
    }
  }, 0);
}

export function closeRankingAndGoToStart() {
  hideModal();
  // 게임 상태 완전히 초기화하고 시작 화면으로 돌아가기
  window.resetGameplayState();
  window.state.started = false;
  window.state.paused = true;
  window.state.gameOver = false;
  startOverlay.classList.add('active');

  // 닉네임 입력 필드 초기화
  nicknameInput.value = '';
  updateStartButtonState();
}

export function hideModal() {
  modalOverlay.classList.remove('active');
  modalOverlay.innerHTML = '';
}

export function isNicknameValid(name) {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 9;
}

export function updateStartButtonState() {
  startButton.disabled = !isNicknameValid(nicknameInput.value);
}

export function buildResultHtml(details) {
  let html = `
    <div class="result-block" style="background: rgba(18,26,38,0.0); border: none; box-shadow: none;">
      <span class="result-label" style="display:block; font-size:14px; color:#9fb4d8; margin-bottom:8px;">최종 점수</span>
      <span class="result-value" style="font-size:64px; font-weight:800; color:#ffffff; text-shadow:0 8px 24px rgba(0,0,0,0.5);">
        ${details.totalScore.toLocaleString()}
      </span>
    </div>`;

  return html;
}

// 전역에서 사용할 수 있도록 window 객체에 연결
window.showRankingModal = showRankingModal;
window.closeRankingAndGoToStart = closeRankingAndGoToStart;
window.hideModal = hideModal;