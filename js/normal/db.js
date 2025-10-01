// 도넛라이크 랭킹 데이터베이스 (파일 기반)
// 실제 랭킹 데이터를 이 파일에 저장

// 랭킹 데이터 (상위 100위)
let rankingData = [
  // 예시 랭킹 데이터
  {
    id: 1,
    nickname: "도넛마스터",
    character: "signature_knotted",
    stage: 3,
    survivalTime: 245.8,
    finalScore: 28500,
    timestamp: "2024-01-15T10:30:00.000Z"
  },
  {
    id: 2,
    nickname: "김도넛킹",
    character: "glazed_ring",
    stage: 2,
    survivalTime: 180.2,
    finalScore: 22000,
    timestamp: "2024-01-14T15:20:00.000Z"
  },
  {
    id: 3,
    nickname: "도넛러버",
    character: "signature_knotted",
    stage: 2,
    survivalTime: 150.5,
    finalScore: 18900,
    timestamp: "2024-01-13T20:45:00.000Z"
  },
  {
    id: 4,
    nickname: "스위트도넛",
    character: "glazed_ring",
    stage: 2,
    survivalTime: 120.0,
    finalScore: 15600,
    timestamp: "2024-01-12T18:15:00.000Z"
  },
  {
    id: 5,
    nickname: "글레이즈킹",
    character: "glazed_ring",
    stage: 1,
    survivalTime: 95.3,
    finalScore: 12400,
    timestamp: "2024-01-11T14:30:00.000Z"
  }
];

class DonutRankingDB {
  constructor() {
    this.rankings = [...rankingData]; // 파일의 데이터를 복사
    this.isInitialized = false;
    this.maxRankings = 100; // 최대 100위까지 저장
  }

  // 초기화
  async initialize() {
    try {
      // 파일의 랭킹 데이터를 로드
      this.rankings = [...rankingData];
      this.isInitialized = true;
      console.log('DonutRankingDB 초기화 완료 - 현재 랭킹:', this.rankings.length, '개');
    } catch (error) {
      console.error('DB 초기화 실패:', error);
    }
  }

  // 랭킹 데이터 저장 - 닉네임별 최고 점수만 업데이트
  async saveRanking(nickname, character, stage, survivalTime, finalScore) {
    try {
      const cleanNickname = nickname.trim();
      const newScore = parseInt(finalScore);

      // 기존 해당 닉네임의 기록 찾기
      const existingIndex = this.rankings.findIndex(rank => rank.nickname === cleanNickname);

      if (existingIndex >= 0) {
        // 기존 기록이 있으면 점수 비교
        const existingScore = this.rankings[existingIndex].finalScore;
        if (newScore <= existingScore) {
          console.log(`기존 점수(${existingScore}) >= 새 점수(${newScore}), 저장 안함`);
          return false;
        }

        // 더 높은 점수면 업데이트
        this.rankings[existingIndex] = {
          id: this.rankings[existingIndex].id, // 기존 ID 유지
          nickname: cleanNickname,
          character,
          stage,
          survivalTime,
          finalScore: newScore,
          timestamp: new Date().toISOString()
        };
        console.log(`기존 점수(${existingScore}) < 새 점수(${newScore}), 업데이트`);
      } else {
        // 새로운 닉네임이면 추가
        const newRanking = {
          id: Date.now() + Math.random(), // 임시 ID
          nickname: cleanNickname,
          character,
          stage,
          survivalTime,
          finalScore: newScore,
          timestamp: new Date().toISOString()
        };

        this.rankings.push(newRanking);
        console.log('새로운 닉네임, 랭킹 저장:', cleanNickname);
      }

      // 점수순으로 정렬 (내림차순)
      this.rankings.sort((a, b) => b.finalScore - a.finalScore);

      // 100위 초과 시 삭제
      if (this.rankings.length > this.maxRankings) {
        this.rankings = this.rankings.slice(0, this.maxRankings);
      }

      // 파일의 rankingData 업데이트
      await this.updateFileData();

      console.log('로컬 DB 랭킹 저장 완료');
      return true;
    } catch (error) {
      console.error('랭킹 저장 실패:', error);
      return false;
    }
  }

  // 랭킹 데이터 불러오기 (상위 10개)
  async getRankings(limit = 10) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return this.rankings.slice(0, limit);
    } catch (error) {
      console.error('랭킹 불러오기 실패:', error);
      return [];
    }
  }

  // 전체 랭킹 개수
  getTotalCount() {
    return this.rankings.length;
  }

  // db.js 파일의 rankingData 업데이트
  async updateFileData() {
    try {
      // 메모리의 랭킹 데이터를 파일의 rankingData에 반영
      rankingData.length = 0; // 배열 초기화
      rankingData.push(...this.rankings); // 새 데이터로 업데이트

      console.log('파일 데이터 업데이트 완료 - 총', rankingData.length, '개 랭킹');

      // 개발자 콘솔에 현재 랭킹 상태 출력
      console.log('현재 상위 5위 랭킹:', rankingData.slice(0, 5));
    } catch (error) {
      console.error('파일 데이터 업데이트 실패:', error);
    }
  }

  // 랭킹 초기화 (관리자용)
  async clearAllRankings() {
    try {
      this.rankings = [];
      await this.updateFileData();
      console.log('모든 랭킹 데이터가 삭제되었습니다');
    } catch (error) {
      console.error('랭킹 초기화 실패:', error);
    }
  }

  // 현재 랭킹 상태 출력 (디버깅용)
  printCurrentRankings() {
    console.log('=== 현재 랭킹 TOP 10 ===');
    this.rankings.slice(0, 10).forEach((rank, index) => {
      console.log(`${index + 1}위: ${rank.nickname} (${rank.finalScore.toLocaleString()}점)`);
    });
    console.log('==================');
  }
}

// 싱글톤 패턴으로 DB 인스턴스 생성
export const rankingDB = new DonutRankingDB();

// DB 관련 유틸리티 함수들
export async function initializeDB() {
  await rankingDB.initialize();
}

export async function savePlayerRanking(nickname, character, stage, survivalTime, finalScore) {
  return await rankingDB.saveRanking(nickname, character, stage, survivalTime, finalScore);
}

export async function getTopRankings(limit = 10) {
  return await rankingDB.getRankings(limit);
}

export function getTotalRankingCount() {
  return rankingDB.getTotalCount();
}

export function printRankings() {
  rankingDB.printCurrentRankings();
}

export function clearAllRankings() {
  return rankingDB.clearAllRankings();
}