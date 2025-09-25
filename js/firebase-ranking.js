// Firestore를 사용한 글로벌 랭킹 시스템
import { firebaseConfig } from './firebase-config.js';

let db = null;
let isFirebaseReady = false;

// Firebase 초기화
async function initializeFirebase() {
  try {
    if (!window.firebase) {
      throw new Error('Firebase SDK가 로드되지 않았습니다.');
    }

    const app = window.firebase.initializeApp(firebaseConfig);

    // Firestore 사용을 위한 추가 import
    const {
      getFirestore,
      collection,
      addDoc,
      getDocs,
      query,
      orderBy,
      limit
    } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

    db = getFirestore(app);

    // 전역에서 사용할 수 있도록 설정
    window.firestoreDB = {
      getFirestore,
      collection,
      addDoc,
      getDocs,
      query,
      orderBy,
      limit
    };

    isFirebaseReady = true;
    console.log('Firebase Firestore 초기화 완료');
    return true;
  } catch (error) {
    console.error('Firebase 초기화 실패:', error);
    return false;
  }
}

// 랭킹 데이터 저장 (Firestore)
export async function saveRankingToFirebase(nickname, character, stage, survivalTime, finalScore) {
  try {
    if (!isFirebaseReady) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        throw new Error('Firebase 초기화 실패');
      }
    }

    const { collection, addDoc } = window.firestoreDB;

    const newRanking = {
      nickname: nickname.trim(),
      character,
      stage: parseInt(stage),
      survivalTime: parseFloat(survivalTime),
      finalScore: parseInt(finalScore),
      timestamp: Date.now(),
      date: new Date().toISOString()
    };

    // Firestore의 'rankings' 컬렉션에 문서 추가
    const docRef = await addDoc(collection(db, 'rankings'), newRanking);

    console.log('Firestore에 랭킹 저장 완료:', newRanking, 'ID:', docRef.id);
    return true;
  } catch (error) {
    console.error('Firestore 랭킹 저장 실패:', error);
    return false;
  }
}

// 랭킹 데이터 불러오기 (Firestore)
export async function loadRankingsFromFirebase(limitCount = 10) {
  try {
    if (!isFirebaseReady) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        throw new Error('Firebase 초기화 실패');
      }
    }

    const { collection, getDocs, query, orderBy, limit } = window.firestoreDB;

    // finalScore 기준으로 내림차순 정렬하여 상위 랭킹 가져오기
    const rankingsQuery = query(
      collection(db, 'rankings'),
      orderBy('finalScore', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(rankingsQuery);

    if (querySnapshot.empty) {
      console.log('Firestore에 랭킹 데이터가 없습니다.');
      return [];
    }

    const rankings = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      rankings.push({
        id: doc.id,
        nickname: data.nickname || '익명',
        character: data.character || 'signature_knotted',
        stage: data.stage || 1,
        survivalTime: data.survivalTime || 0,
        finalScore: data.finalScore || 0,
        timestamp: data.timestamp || Date.now(),
        date: data.date
      });
    });

    console.log('Firestore에서 랭킹 로드 완료:', rankings.length, '개');
    return rankings;

  } catch (error) {
    console.error('Firestore 랭킹 로딩 실패:', error);
    return [];
  }
}

// 랭킹 저장 조건 확인 및 저장
export async function checkAndSaveFirebaseRanking(state, computeFinalScoreDetails) {
  try {
    const survivalTime = state.elapsed;
    const stage = state.stage;

    // 랭킹 등록 조건: 1스테이지 90초+ 또는 2스테이지+
    const shouldSave = (stage === 1 && survivalTime >= 90) || stage >= 2;

    if (!shouldSave) {
      console.log('랭킹 등록 조건 미충족:', { stage, survivalTime });
      return false;
    }

    const details = computeFinalScoreDetails();
    const success = await saveRankingToFirebase(
      state.nickname,
      state.selectedCharacter,
      stage,
      survivalTime,
      details.totalScore
    );

    if (success) {
      console.log('Firestore 랭킹 등록 완료');
    }
    return success;
  } catch (error) {
    console.error('Firestore 랭킹 등록 실패:', error);
    return false;
  }
}

// Firebase 사용 가능 여부 확인
export function isFirebaseAvailable() {
  return isFirebaseReady;
}

// Firebase 수동 초기화 (필요시)
export async function initFirebase() {
  return await initializeFirebase();
}