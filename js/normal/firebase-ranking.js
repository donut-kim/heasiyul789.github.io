// Firestore를 사용한 글로벌 랭킹 시스템
import { firebaseConfig } from './firebase-config.js';

let db = null;
let auth = null;
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
      getDoc,
      query,
      orderBy,
      limit,
      where,
      updateDoc,
      doc,
      setDoc,
      serverTimestamp
    } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

    db = getFirestore(app);

    // Firebase Auth 초기화
    auth = window.firebase.getAuth(app);
    window.firebaseAuth = auth;
    window.firebaseApp = app;

    // 전역에서 사용할 수 있도록 설정
    window.firestoreDB = {
      getFirestore,
      collection,
      addDoc,
      getDocs,
      getDoc,
      query,
      orderBy,
      limit,
      where,
      updateDoc,
      doc,
      setDoc,
      serverTimestamp
    };

    isFirebaseReady = true;

    // 구글 로그인 초기화
    if (window.initGoogleAuth) {
      window.initGoogleAuth();
    }

    return true;
  } catch (error) {
    console.error('Firebase 초기화 실패:', error);
    return false;
  }
}

// 랭킹 데이터 저장 (Firestore) - 로그인한 사용자만 저장, create only
export async function saveRankingToFirebase(nickname, character, stage, survivalTime, finalScore) {
  try {
    if (!isFirebaseReady) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        throw new Error('Firebase 초기화 실패');
      }
    }

    // 비회원도 랭킹 등록 가능 (닉네임 기반)
    const currentUser = auth?.currentUser;
    const cleanNickname = nickname.trim();
    const userId = currentUser?.uid || `guest_${cleanNickname}`; // 비회원은 guest_ 접두사 사용

    const { collection, getDocs, query, where, addDoc, updateDoc, doc } = window.firestoreDB;

    // 기존 해당 닉네임의 최고 기록 찾기 (닉네임 기반, gameType='normal' 또는 빈 값)
    const existingQuery = query(
      collection(db, 'rankings'),
      where('nickname', '==', cleanNickname)
    );

    const existingSnapshot = await getDocs(existingQuery);

    const newScore = parseInt(finalScore);

    // gameType이 'normal' 또는 비어있는 것만 필터링
    const normalRecords = [];
    existingSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.gameType || data.gameType === 'normal') {
        normalRecords.push({ id: docSnap.id, data });
      }
    });

    if (normalRecords.length === 0) {
      // 해당 사용자가 없으면 새로 저장
      console.log('새로운 사용자, 랭킹 저장:', userId);

      const now = new Date();
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      const rankingData = {
        character: character,
        date: koreaTime.toISOString().replace('Z', '+09:00'),
        finalScore: newScore,
        nickname: cleanNickname,
        stage: parseInt(stage),
        survivalTime: parseFloat(survivalTime),
        timestamp: now.getTime(),
        gameType: 'normal'
      };

      await addDoc(collection(db, 'rankings'), rankingData);
      console.log('Firestore에 랭킹 저장 완료:', rankingData);
      return true;
    } else {
      // 기존 기록이 있으면 점수 비교
      let maxExistingScore = 0;
      let maxDocId = null;

      normalRecords.forEach((record) => {
        const existingScore = record.data.finalScore || record.data.score || 0;
        if (existingScore > maxExistingScore) {
          maxExistingScore = existingScore;
          maxDocId = record.id;
        }
      });

      if (newScore > maxExistingScore) {
        // 기존 최고 기록보다 높으면 업데이트
        console.log(`기존 최고점수(${maxExistingScore}) < 새 점수(${newScore}), 업데이트`);

        const now = new Date();
        const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const updateData = {
          character: character,
          date: koreaTime.toISOString().replace('Z', '+09:00'),
          finalScore: newScore,
          nickname: cleanNickname,
          stage: parseInt(stage),
          survivalTime: parseFloat(survivalTime),
          timestamp: now.getTime(),
          gameType: 'normal'
        };

        await updateDoc(doc(db, 'rankings', maxDocId), updateData);
        console.log('Firestore에 랭킹 업데이트 완료:', updateData);
        return true;
      } else {
        console.log(`기존 최고점수(${maxExistingScore}) >= 새 점수(${newScore}), 저장 안함`);
        return false;
      }
    }
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

    const { collection, getDocs, query, where } = window.firestoreDB;

    // 모든 랭킹 데이터 가져오기 (gameType 필터 없음 - 클라이언트에서 필터링)
    const rankingsQuery = query(collection(db, 'rankings'));
    const querySnapshot = await getDocs(rankingsQuery);

    if (querySnapshot.empty) {
      return [];
    }

    const rankings = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // gameType이 없거나 'normal'인 경우만 포함
      if (!data.gameType || data.gameType === 'normal') {
        rankings.push({
          id: doc.id,
          nickname: data.nickname || '익명',
          character: 'signature_knotted', // character 필드가 없으므로 기본값
          stage: data.stage || 1,
          survivalTime: data.survivalTime || data.gameTime || 0,
          finalScore: data.finalScore || data.score || 0,
          timestamp: data.createdAt?.toMillis() || Date.now(),
          date: data.createdAt?.toDate().toISOString() || new Date().toISOString()
        });
      }
    });

    // 클라이언트에서 score 기준 내림차순 정렬 후 상위 limitCount개만 반환
    rankings.sort((a, b) => b.finalScore - a.finalScore);
    const topRankings = rankings.slice(0, limitCount);

    return topRankings;

  } catch (error) {
    console.error('Firestore 랭킹 로딩 실패:', error);
    return [];
  }
}

// 사용자 닉네임 조회
export async function getUserNickname(uid) {
  try {
    if (!isFirebaseReady) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        throw new Error('Firebase 초기화 실패');
      }
    }

    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    const userDoc = await getDoc(doc(db, 'users', uid));

    if (userDoc.exists()) {
      return userDoc.data().nickname;
    }
    return null;
  } catch (error) {
    console.error('닉네임 조회 실패:', error);
    return null;
  }
}

// 사용자 닉네임 저장
export async function saveUserNickname(uid, nickname) {
  try {
    if (!isFirebaseReady) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        throw new Error('Firebase 초기화 실패');
      }
    }

    const { doc, setDoc, serverTimestamp } = window.firestoreDB;

    await setDoc(doc(db, 'users', uid), {
      uid,
      nickname: nickname.trim(),
      createdAt: serverTimestamp()
    });

    console.log('닉네임 저장 완료:', nickname);
    return true;
  } catch (error) {
    console.error('닉네임 저장 실패:', error);
    return false;
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
