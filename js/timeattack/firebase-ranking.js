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

    const { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp } = window.firestoreDB;

    // 기존 해당 닉네임의 최고 기록 찾기 (닉네임 기반)
    const existingQuery = query(
      collection(db, 'rankings'),
      where('nickname', '==', cleanNickname),
      where('gameType', '==', 'timeattack')
    );

    const existingSnapshot = await getDocs(existingQuery);

    const newScore = parseInt(finalScore);
    // 시간을 MMSS 형식의 4자리 텍스트로 변환 (예: 900초 = "1500", 61초 = "0101")
    const totalSeconds = Math.floor(survivalTime);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const newTime = minutes.toString().padStart(2, '0') + seconds.toString().padStart(2, '0');

    if (existingSnapshot.empty) {
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
        survivalTime: newTime,
        timestamp: now.getTime(),
        gameType: 'timeattack'
      };

      await addDoc(collection(db, 'rankings'), rankingData);
      console.log('Firestore에 랭킹 저장 완료:', rankingData);
      return true;
    } else {
      // 기존 기록이 있으면 시간 비교 (시간이 같으면 점수 비교)
      let bestTime = "0000";
      let bestScore = 0;
      let bestDocId = null;

      existingSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const existingTime = data.survivalTime || "0000";
        const existingScore = data.finalScore || data.score || 0;

        if (existingTime > bestTime || (existingTime === bestTime && existingScore > bestScore)) {
          bestTime = existingTime;
          bestScore = existingScore;
          bestDocId = docSnap.id;
        }
      });

      // 새 기록이 더 좋은지 확인 (시간 우선, 같으면 점수)
      const shouldUpdate = newTime > bestTime || (newTime === bestTime && newScore > bestScore);

      if (shouldUpdate) {
        console.log(`기존 기록(시간: ${bestTime}, 점수: ${bestScore}) < 새 기록(시간: ${newTime}, 점수: ${newScore}), 업데이트`);

        const now = new Date();
        const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const updateData = {
          character: character,
          date: koreaTime.toISOString().replace('Z', '+09:00'),
          finalScore: newScore,
          nickname: cleanNickname,
          stage: parseInt(stage),
          survivalTime: newTime,
          timestamp: now.getTime(),
          gameType: 'timeattack'
        };

        await updateDoc(doc(db, 'rankings', bestDocId), updateData);
        console.log('Firestore에 랭킹 업데이트 완료:', updateData);
        return true;
      } else {
        console.log(`기존 기록(시간: ${bestTime}, 점수: ${bestScore}) >= 새 기록(시간: ${newTime}, 점수: ${newScore}), 저장 안함`);
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

    // 타임어택 게임 타입만 필터링
    const rankingsQuery = query(
      collection(db, 'rankings'),
      where('gameType', '==', 'timeattack')
    );

    const querySnapshot = await getDocs(rankingsQuery);

    if (querySnapshot.empty) {
      return [];
    }

    const rankings = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const survivalTimeData = data.survivalTime || data.gameTime || 0;
      let survivalTimeText = '';

      // MMSS 형식 텍스트로 정규화
      if (typeof survivalTimeData === 'string') {
        survivalTimeText = survivalTimeData.trim().padStart(4, '0');
      } else if (typeof survivalTimeData === 'number') {
        // 숫자인 경우 MMSS 형식으로 변환 (기존 데이터 호환)
        const totalSeconds = Math.floor(survivalTimeData);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        survivalTimeText = minutes.toString().padStart(2, '0') + seconds.toString().padStart(2, '0');
      } else {
        survivalTimeText = '0000';
      }

      rankings.push({
        id: doc.id,
        nickname: data.nickname || '익명',
        character: data.character || 'signature_knotted',
        stage: data.stage || 1,
        survivalTime: survivalTimeText, // MMSS 형식 텍스트 그대로 사용
        finalScore: parseInt(data.finalScore || data.score || 0),
        timestamp: data.timestamp || data.createdAt?.toMillis() || Date.now(),
        date: data.date || data.createdAt?.toDate().toISOString() || new Date().toISOString()
      });
    });

    // 클라이언트에서 시간 기준 내림차순 정렬 (시간 같으면 점수) 후 상위 limitCount개만 반환
    // MMSS 형식을 숫자로 비교 (예: 1500 > 0900)
    rankings.sort((a, b) => {
      const timeA = parseInt(a.survivalTime, 10);
      const timeB = parseInt(b.survivalTime, 10);
      if (timeB !== timeA) {
        return timeB - timeA; // 시간 긴 순 (숫자 비교)
      }
      return b.finalScore - a.finalScore; // 시간 같으면 점수 높은 순
    });
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

// 기존 랭킹 데이터를 MMSS 형식 텍스트로 변환하는 함수
export async function convertExistingRankingsToTextFormat() {
  try {
    if (!isFirebaseReady) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        throw new Error('Firebase 초기화 실패');
      }
    }

    const { collection, getDocs, query, where, updateDoc, doc } = window.firestoreDB;

    // 타임어택 게임 타입만 필터링
    const rankingsQuery = query(
      collection(db, 'rankings'),
      where('gameType', '==', 'timeattack')
    );

    const querySnapshot = await getDocs(rankingsQuery);

    if (querySnapshot.empty) {
      console.log('변환할 랭킹 데이터가 없습니다.');
      return { success: true, updated: 0 };
    }

    let updatedCount = 0;
    const updatePromises = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const survivalTimeData = data.survivalTime;

      // 이미 텍스트 형식인 경우 스킵
      if (typeof survivalTimeData === 'string' && survivalTimeData.length === 4) {
        console.log(`${data.nickname} - 이미 텍스트 형식: ${survivalTimeData}`);
        return;
      }

      // 숫자인 경우 MMSS 형식으로 변환
      if (typeof survivalTimeData === 'number') {
        const totalSeconds = Math.floor(survivalTimeData);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const newTimeText = minutes.toString().padStart(2, '0') + seconds.toString().padStart(2, '0');

        console.log(`${data.nickname} - 변환: ${survivalTimeData}초 → ${newTimeText}`);

        const updatePromise = updateDoc(doc(db, 'rankings', docSnap.id), {
          survivalTime: newTimeText
        });

        updatePromises.push(updatePromise);
        updatedCount++;
      }
    });

    await Promise.all(updatePromises);

    console.log(`✅ 총 ${updatedCount}개의 랭킹 데이터를 텍스트 형식으로 변환했습니다.`);
    return { success: true, updated: updatedCount };

  } catch (error) {
    console.error('랭킹 데이터 변환 실패:', error);
    return { success: false, error: error.message };
  }
}

// window에 변환 함수 등록 (콘솔에서 사용 가능)
if (typeof window !== 'undefined') {
  window.convertExistingRankingsToTextFormat = convertExistingRankingsToTextFormat;
}
