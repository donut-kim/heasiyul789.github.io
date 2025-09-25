import { savePlayerRanking, getTopRankings } from './db.js';
import {
  saveRankingToFirebase,
  loadRankingsFromFirebase,
  checkAndSaveFirebaseRanking,
  isFirebaseAvailable
} from './firebase-ranking.js';

// 하이브리드 랭킹 시스템 (Firebase 우선, localStorage 백업)
export async function saveRankingData(nickname, character, stage, survivalTime, finalScore) {
  let firebaseSuccess = false;
  let localSuccess = false;

  try {
    // Firebase 저장 시도
    firebaseSuccess = await saveRankingToFirebase(nickname, character, stage, survivalTime, finalScore);
    if (firebaseSuccess) {
      console.log('Firebase에 랭킹 저장 완료');
    }

    // 로컬 DB에도 저장 (백업용)
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

// 하이브리드 랭킹 데이터 불러오기 (Firebase 우선, localStorage 백업)
export async function loadRankingData() {
  try {
    // Firebase 데이터 시도
    const firebaseRankings = await loadRankingsFromFirebase(10);
    if (firebaseRankings && firebaseRankings.length > 0) {
      console.log('Firebase에서 랭킹 로드:', firebaseRankings.length, '개');
      return firebaseRankings;
    }

    // Firebase 실패 시 로컬 데이터 사용
    const localRankings = await getTopRankings(10);
    console.log('로컬 DB에서 랭킹 로드:', localRankings.length, '개');
    return localRankings;
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