# Firebase Firestore 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 만들기" 클릭
3. 프로젝트 이름 입력 (예: donut-like-game)
4. Google Analytics 설정 (선택사항)

## 2. Firestore Database 설정 ⭐

1. Firebase Console에서 **"Firestore Database"** 메뉴 선택
2. "데이터베이스 만들기" 클릭
3. **"테스트 모드에서 시작"** 선택 (나중에 보안 규칙 변경)
4. 위치 선택 (asia-northeast1 - Tokyo 또는 asia-northeast3 - Seoul 권장)

## 3. 웹 앱 설정

1. Firebase Console에서 "프로젝트 설정" (톱니바퀴 아이콘)
2. "내 앱"에서 웹 앱 추가 (</> 아이콘)
3. 앱 닉네임 입력 (예: DonutLike Web)
4. Firebase SDK 구성 정보 복사

## 4. 설정 파일 수정 ⭐

`js/firebase-config.js` 파일을 열어서 다음 값들을 **실제 값으로 교체**:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSyC...",                    // ← 여기 실제 값 입력
  authDomain: "your-project.firebaseapp.com",  // ← 여기 실제 값 입력
  projectId: "your-project",               // ← 여기 실제 값 입력
  storageBucket: "your-project.appspot.com",   // ← 여기 실제 값 입력
  messagingSenderId: "123456789",          // ← 여기 실제 값 입력
  appId: "1:123456789:web:abcdef..."       // ← 여기 실제 값 입력
};
```

**중요**: `databaseURL`은 Firestore에서 필요없으므로 제거하세요.

## 5. Firestore Security Rules 설정

1. Firebase Console에서 **"Firestore Database"** → **"규칙"** 탭
2. 다음 규칙을 복사하여 붙여넣기:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 랭킹 컬렉션
    match /rankings/{document} {
      // 모든 사용자가 랭킹을 읽을 수 있음
      allow read: if true;

      // 랭킹 데이터 쓰기 허용 (데이터 검증 포함)
      allow write: if request.resource.data.keys().hasAll([
        'nickname', 'character', 'stage', 'survivalTime', 'finalScore', 'timestamp'
      ]) &&
      request.resource.data.nickname is string &&
      request.resource.data.nickname.size() >= 2 &&
      request.resource.data.nickname.size() <= 12 &&
      request.resource.data.stage is number &&
      request.resource.data.stage >= 1 &&
      request.resource.data.finalScore is number &&
      request.resource.data.finalScore >= 0;
    }

    // 다른 모든 문서는 접근 금지
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. **"게시"** 클릭

## 6. 테스트

1. 웹사이트를 **웹서버**를 통해 실행 (Live Server 사용 권장)
2. 게임을 플레이하여 랭킹 조건 충족:
   - **1스테이지 90초 이상** 또는
   - **2스테이지 이상 진행**
3. 브라우저 개발자 도구 → Console에서 성공 메시지 확인
4. Firebase Console → **"Firestore Database"** → **"데이터"** 탭에서 `rankings` 컬렉션 확인

## 7. 실제 입력해야 할 값들 예시

Firebase Console의 "프로젝트 설정"에서 이런 값들을 복사하세요:

```javascript
// 예시 (실제 값으로 교체하세요)
export const firebaseConfig = {
  apiKey: "AIzaSyCHr8s1-abc123def456ghi789",
  authDomain: "donut-like-game.firebaseapp.com",
  projectId: "donut-like-game",
  storageBucket: "donut-like-game.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789"
};
```

## 문제 해결

### 1. CORS 오류 발생
- ❌ `file://` 프로토콜 사용 금지
- ✅ Live Server 또는 웹서버 사용 필수

### 2. Firebase 초기화 실패
- `js/firebase-config.js`의 설정값 재확인
- 브라우저 개발자 도구 Console 확인

### 3. 랭킹이 저장되지 않음
- Firestore Security Rules 확인
- 네트워크 연결 상태 확인
- 브라우저 개발자 도구 Network 탭에서 요청 확인

### 4. "Permission denied" 오류
- Firestore Security Rules가 올바르게 설정되었는지 확인
- Console에서 "게시" 버튼을 눌렀는지 확인

## 보안

- ✅ API 키는 공개되어도 안전합니다
- ✅ 실제 보안은 Firestore Security Rules로 관리됩니다
- ✅ GitHub에 커밋해도 문제없습니다