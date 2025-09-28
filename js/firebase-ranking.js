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
      limit,
      where,
      updateDoc,
      doc,
      setDoc
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
      limit,
      where,
      updateDoc,
      doc,
      setDoc
    };

    isFirebaseReady = true;
    console.log('Firebase Firestore 초기화 완료');
    return true;
  } catch (error) {
    console.error('Firebase 초기화 실패:', error);
    return false;
  }
}

// 랭킹 데이터 저장 (Firestore) - 닉네임별 최고 점수만 업데이트
export async function saveRankingToFirebase(nickname, character, stage, survivalTime, finalScore) {
  try {
    if (!isFirebaseReady) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        throw new Error('Firebase 초기화 실패');
      }
    }

    const { collection, getDocs, query, where, setDoc, doc } = window.firestoreDB;
    const cleanNickname = nickname.trim();

    // 기존 해당 닉네임의 기록 찾기
    const existingQuery = query(
      collection(db, 'rankings'),
      where('nickname', '==', cleanNickname)
    );

    const existingSnapshot = await getDocs(existingQuery);

    const newScore = parseInt(finalScore);
    let shouldSave = false;
    let docId = cleanNickname; // 닉네임을 document ID로 사용

    if (existingSnapshot.empty) {
      // 해당 닉네임이 없으면 새로 저장
      shouldSave = true;
      console.log('새로운 닉네임, 랭킹 저장:', cleanNickname);
    } else {
      // 기존 기록이 있으면 점수 비교
      let maxExistingScore = 0;
      existingSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.finalScore > maxExistingScore) {
          maxExistingScore = data.finalScore;
        }
      });

      if (newScore > maxExistingScore) {
        shouldSave = true;
        console.log(`기존 최고점수(${maxExistingScore}) < 새 점수(${newScore}), 업데이트`);
      } else {
        console.log(`기존 최고점수(${maxExistingScore}) >= 새 점수(${newScore}), 저장 안함`);
        return false;
      }
    }

    if (shouldSave) {
      const rankingData = {
        nickname: cleanNickname,
        character,
        stage: parseInt(stage),
        survivalTime: parseFloat(survivalTime),
        finalScore: newScore,
        timestamp: Date.now(),
        date: new Date().toISOString()
      };

      // 닉네임을 document ID로 사용하여 upsert
      await setDoc(doc(db, 'rankings', docId), rankingData);

      console.log('Firestore에 랭킹 저장 완료:', rankingData);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Firestore 랭킹 저장 실패:', error);
    return false;
  }
}

// 랭킹 데이터 불러오기 (Firestore)
export async function loadRankingsFromFirebase(limitCount = 7) {
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
