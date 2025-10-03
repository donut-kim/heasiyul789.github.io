import { savePlayerRanking, getTopRankings } from './db.js';
import {
  saveRankingToFirebase,
  loadRankingsFromFirebase,
  checkAndSaveFirebaseRanking,
  isFirebaseAvailable
} from './firebase-ranking.js';

// 로컬 환경인지 확인하는 함수
export function isLocalEnvironment() {
  const hostname = window.location.hostname;
  return hostname === 'localhost' ||
         hostname === '127.0.0.1' ||
         hostname.startsWith('192.168.') ||
         hostname.startsWith('10.') ||
         hostname.includes('local') ||
         window.location.protocol === 'file:';
}

// 하이브리드 랭킹 시스템 (Firebase 우선, localStorage 백업)
export async function saveRankingData(nickname, character, stage, survivalTime, finalScore) {
  let firebaseSuccess = false;
  let localSuccess = false;

  try {
    // Firebase에 항상 저장 시도
    firebaseSuccess = await saveRankingToFirebase(nickname, character, stage, survivalTime, finalScore);
    if (firebaseSuccess) {
      console.log('Firebase에 랭킹 저장 완료');
    }

    // 로컬 DB에는 항상 저장 (백업용)
    localSuccess = await savePlayerRanking(nickname, character, stage, survivalTime, finalScore);
    if (localSuccess) {
      console.log('로컬 DB에 랭킹 저장 완료');
    }

    return firebaseSuccess || localSuccess;
  } catch (error) {
    console.error('랭킹 저장 중 오류 발생:', error);
    return false;
  }
}

// 닉네임별 최고 점수만 필터링하는 함수
function filterUniqueNicknames(rankings) {
  const nicknameMap = new Map();

  // 시간 기준 내림차순 정렬 (시간이 같으면 점수로 정렬)
  const sortedRankings = rankings.sort((a, b) => {
    const timeA = typeof a.survivalTime === 'string' ? parseInt(a.survivalTime, 10) : a.survivalTime;
    const timeB = typeof b.survivalTime === 'string' ? parseInt(b.survivalTime, 10) : b.survivalTime;
    if (timeB !== timeA) {
      return timeB - timeA; // 시간 긴 순
    }
    return b.finalScore - a.finalScore; // 시간 같으면 점수 높은 순
  });

  for (const ranking of sortedRankings) {
    const nickname = ranking.nickname.trim();
    if (!nicknameMap.has(nickname)) {
      // 해당 닉네임의 첫 번째(최고 기록) 기록만 저장
      nicknameMap.set(nickname, ranking);
    }
  }

  // Map의 값들을 배열로 변환하고 시간 기준으로 재정렬
  return Array.from(nicknameMap.values()).sort((a, b) => {
    const timeA = typeof a.survivalTime === 'string' ? parseInt(a.survivalTime, 10) : a.survivalTime;
    const timeB = typeof b.survivalTime === 'string' ? parseInt(b.survivalTime, 10) : b.survivalTime;
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return b.finalScore - a.finalScore;
  });
}

// Firebase 전용 랭킹 데이터 불러오기
export async function loadRankingData() {
  try {
    // Firebase 데이터만 사용
    const firebaseRankings = await loadRankingsFromFirebase(50);
    if (firebaseRankings && firebaseRankings.length > 0) {
      console.log('Firebase에서 랭킹 로드:', firebaseRankings.length, '개');
      const uniqueRankings = filterUniqueNicknames(firebaseRankings);
      return uniqueRankings.slice(0, 7); // 상위 7위만 반환
    }

    // Firebase에 데이터가 없으면 빈 배열 반환
    console.log('Firebase에 랭킹 데이터가 없습니다');
    return [];
  } catch (error) {
    console.error('랭킹 데이터 로딩 실패:', error);
    return [];
  }
}

export async function checkAndSaveRanking(state, computeFinalScoreDetails) {
  const survivalTime = state.elapsed;
  const stage = state.stage;

  // 랭킹 등록 조건: 1스테이지 1분30초 이상 또는 2스테이지 이상
  const shouldSave = (stage === 1 && survivalTime >= 90) || stage >= 2;

  if (shouldSave) {
    const details = computeFinalScoreDetails();
    await saveRankingData(
      state.nickname,
      state.selectedCharacter,
      stage,
      survivalTime,
      details.totalScore
    );
  }
}

export function formatSurvivalTime(timeData) {
  // MMSS 형식 문자열인 경우 (예: "1500" → "15:00")
  if (typeof timeData === 'string' && timeData.length >= 4) {
    const minutes = timeData.substring(0, 2);
    const seconds = timeData.substring(2, 4);
    return `${parseInt(minutes)}:${seconds}`;
  }

  // 숫자인 경우 (하위 호환)
  if (typeof timeData === 'number') {
    const minutes = Math.floor(timeData / 60);
    const remainingSeconds = Math.floor(timeData % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return '0:00';
}

export function getCharacterDisplayName(character) {
  return character === 'signature_knotted' ? '김도넛' : '글레이즈 도넛';
}

export function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
