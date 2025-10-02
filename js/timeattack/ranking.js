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
    // 로컬 환경이 아닐 때만 Firebase 저장 시도
    if (!isLocalEnvironment()) {
      firebaseSuccess = await saveRankingToFirebase(nickname, character, stage, survivalTime, finalScore);
      if (firebaseSuccess) {
        console.log('Firebase에 랭킹 저장 완료');
      }
    } else {
      console.log('로컬 환경 - Firebase 저장 건너뜀');
    }

    // 로컬 DB에는 항상 저장 (로컬 환경에서도 저장)
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
    if (b.survivalTime !== a.survivalTime) {
      return b.survivalTime - a.survivalTime; // 시간 긴 순
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
    if (b.survivalTime !== a.survivalTime) {
      return b.survivalTime - a.survivalTime;
    }
    return b.finalScore - a.finalScore;
  });
}

// 하이브리드 랭킹 데이터 불러오기 (Firebase 우선, localStorage 백업)
export async function loadRankingData() {
  try {
    // Firebase 데이터 시도
    const firebaseRankings = await loadRankingsFromFirebase(50); // 더 많이 가져와서 필터링
    if (firebaseRankings && firebaseRankings.length > 0) {
      console.log('Firebase에서 랭킹 로드:', firebaseRankings.length, '개');
      const uniqueRankings = filterUniqueNicknames(firebaseRankings);
      return uniqueRankings.slice(0, 7); // 상위 7위만 반환
    }

    // Firebase 실패 시 로컬 데이터 사용
    const localRankings = await getTopRankings(50); // 더 많이 가져와서 필터링
    console.log('로컬 DB에서 랭킹 로드:', localRankings.length, '개');
    const uniqueRankings = filterUniqueNicknames(localRankings);
    return uniqueRankings.slice(0, 7); // 상위 7위만 반환
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

export function formatSurvivalTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getCharacterDisplayName(character) {
  return character === 'signature_knotted' ? '김도넛' : '글레이즈 도넛';
}

export function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
