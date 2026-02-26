import { start } from 'node:repl';
const rawComplaints = [
  // COMPLAINT
  { title: '엘리베이터 고장', type: 'COMPLAINT' },
  { title: '주차 문제', type: 'COMPLAINT' },
  { title: '소음', type: 'COMPLAINT' },
  { title: '난방 이상', type: 'COMPLAINT' },
  { title: '쓰레기 분리수거', type: 'COMPLAINT' },
  { title: '복도 쓰레기', type: 'COMPLAINT' },
  { title: '반려동물 분변 문제', type: 'COMPLAINT' },
  { title: '지하주차장 이중주차', type: 'COMPLAINT' },
  { title: '층간소음 관련', type: 'COMPLAINT' },
  { title: '상가 에어컨 실외기 소음 문제', type: 'COMPLAINT' },
  { title: '공용 복도 적치물', type: 'COMPLAINT' },
  { title: '외부인 무단 출입 관련', type: 'COMPLAINT' },
  { title: '택배 분실 관련', type: 'COMPLAINT' },
  { title: '어린이 놀이터 안전 문제', type: 'COMPLAINT' },
  { title: '흡연 구역 외 흡연', type: 'COMPLAINT' },
  { title: '공용 전등 미점등', type: 'COMPLAINT' },
  { title: '세대 간 누수 의심', type: 'COMPLAINT' },
  { title: '방범카메라 부족', type: 'COMPLAINT' },
  { title: '재활용장 정리상태 불량', type: 'COMPLAINT' },
];

export const complaintItems = rawComplaints.map((item) => ({
  ...item,
  content: `${item.title} 민원입니다. 빠른 조치 부탁드립니다.`,
}));

const rawNotices = [
  // MAINTENANCE
  { title: '전기 점검', type: 'MAINTENANCE', startDate: '2025-03-01', endDate: '2025-03-07' },
  { title: '시설 점검', type: 'MAINTENANCE', startDate: '2025-03-10', endDate: '2025-03-17' },
  { title: '겨울철 수전 동결 방지', type: 'MAINTENANCE' },
  { title: '하절기 냉방', type: 'MAINTENANCE' },
  { title: '방충망 교체', type: 'MAINTENANCE', startDate: '2025-03-21', endDate: '2025-03-25' },
  { title: '정기 실내 방충작업', type: 'MAINTENANCE', startDate: '2025-04-01', endDate: '2025-04-10' },
  { title: '어린이 놀이터 안전 점검', type: 'MAINTENANCE', startDate: '2025-04-11' },
  { title: '엘리베이터 정기 점검 일정', type: 'MAINTENANCE' },
  { title: '지하주차장 배수펌프 점검', type: 'MAINTENANCE', startDate: '2025-04-28', endDate: '2025-04-28' },
  { title: '공용 배관 정기 점검', type: 'MAINTENANCE', startDate: '2025-04-11', endDate: '2025-04-21' },
  { title: '옥상 방수 공사 일정', type: 'MAINTENANCE', startDate: '2025-04-21', endDate: '2025-04-23' },
  { title: '외벽 균열 보수 공사', type: 'MAINTENANCE', startDate: '2025-05-01', endDate: '2025-05-10' },
  { title: '비상 발전기 점검', type: 'MAINTENANCE', startDate: '2025-03-01', endDate: '2025-03-01' },
  { title: '단지 내 가로등 점검 일정', type: 'MAINTENANCE', startDate: '2025-03-01', endDate: '2025-03-01' },
  { title: '급수 탱크 청소', type: 'MAINTENANCE', startDate: '2025-03-09', endDate: '2025-03-09' },
  { title: '승강기 안전 검사 일정', type: 'MAINTENANCE', startDate: '2025-03-20', endDate: '2025-03-20' },
  { title: '소방 설비 정기 점검', type: 'MAINTENANCE', startDate: '2025-03-20', endDate: '2025-03-20' },
  { title: '세대 내 계량기 교체', type: 'MAINTENANCE', startDate: '2025-06-01', endDate: '2025-06-10' },

  // EMERGENCY
  { title: '소방로 불법 주정차 즉시 이동 요청', type: 'EMERGENCY' },
  { title: '전기 설비 이상', type: 'EMERGENCY' },
  { title: '긴급 단수', type: 'EMERGENCY', startDate: '2025-02-08', endDate: '2025-02-08' },
  { title: '가스 누출 점검', type: 'EMERGENCY', startDate: '2025-02-19', endDate: '2025-02-22' },
  { title: '엘리베이터 운행 중단', type: 'EMERGENCY', startDate: '2025-06-08', endDate: '2025-06-08' },
  { title: '지하주차장 침수', type: 'EMERGENCY' },
  { title: '단지 내 정전 발생', type: 'EMERGENCY', startDate: '2025-06-20', endDate: '2025-06-20' },
  { title: '외부인 무단 출입 주의 요청', type: 'EMERGENCY' },
  { title: '보일러 긴급 점검', type: 'EMERGENCY', startDate: '2025-07-01', endDate: '2025-07-01' },
  { title: '옥상 출입 통제', type: 'EMERGENCY' },
  { title: '폭설로 인한 차량 이동 협조 요청', type: 'EMERGENCY', startDate: '2026-01-27', endDate: '2026-01-27' },
  { title: '태풍 대비 시설물 점검', type: 'EMERGENCY', startDate: '2025-09-13', endDate: '2025-09-13' },
  { title: '수도관 파열로 인한 긴급 공사', type: 'EMERGENCY', startDate: '2025-10-16', endDate: '2025-10-16' },
  { title: '아동 안전사고', type: 'EMERGENCY' },
  { title: '화재 경보 오작동', type: 'EMERGENCY', startDate: '2025-11-25', endDate: '2025-11-25' },

  // COMMUNITY
  { title: '봄맞이 단지 대청소', type: 'COMMUNITY', startDate: '2025-03-22', endDate: '2025-03-22' },
  { title: '어린이날 행사 참가 신청', type: 'COMMUNITY', startDate: '2025-04-20', endDate: '2025-05-03' },
  { title: '여름 물놀이장 운영', type: 'COMMUNITY', startDate: '2025-07-20', endDate: '2025-08-10' },
  { title: '입주민 장기자랑 참가자 모집', type: 'COMMUNITY', startDate: '2025-09-01', endDate: '2025-09-15' },
  { title: '단지 독서모임 개설', type: 'COMMUNITY' },
  { title: '반려동물 에티켓 캠페인', type: 'COMMUNITY' },
  { title: '가을 음악회 개최', type: 'COMMUNITY', startDate: '2025-10-12', endDate: '2025-10-12' },
  { title: '김장 나눔 행사', type: 'COMMUNITY', startDate: '2025-11-25', endDate: '2025-11-25' },
  { title: '단지 체육대회 일정', type: 'COMMUNITY', startDate: '2025-05-18', endDate: '2025-05-18' },
  { title: '연말 바자회 개최', type: 'COMMUNITY', startDate: '2025-12-10', endDate: '2025-12-10' },

  // RESIDENT_VOTE
  { title: '지하주차장 추가 CCTV 설치', type: 'RESIDENT_VOTE', startDate: '2025-01-01', endDate: '2025-01-10' },
  { title: '커뮤니티룸 운영 시간 연장', type: 'RESIDENT_VOTE', startDate: '2025-01-20', endDate: '2025-01-30' },
  { title: '단지 내 전기차 충전기 추가 설치', type: 'RESIDENT_VOTE', startDate: '2025-02-01', endDate: '2025-02-10' },
  { title: '반려동물 놀이터 조성', type: 'RESIDENT_VOTE', startDate: '2025-03-21', endDate: '2025-03-30' },
  { title: '옥상 정원 개방', type: 'RESIDENT_VOTE', startDate: '2025-03-21', endDate: '2025-03-30' },
  { title: '관리비 일부 항목 조정안', type: 'RESIDENT_VOTE', startDate: '2025-04-01', endDate: '2025-04-10' },
  { title: '경비 인원 증원', type: 'RESIDENT_VOTE', startDate: '2025-04-11', endDate: '2025-04-20' },
  { title: '공동현관 자동문 교체', type: 'RESIDENT_VOTE', startDate: '2025-05-01', endDate: '2025-05-10' },
  { title: '어린이 놀이터 시설 교체', type: 'RESIDENT_VOTE', startDate: '2025-05-01', endDate: '2025-05-10' },
  { title: '아파트 외벽 도색 색상 변경', type: 'RESIDENT_VOTE', startDate: '2025-06-21', endDate: '2025-06-30' },
  { title: '단지 축제 개최', type: 'RESIDENT_VOTE', startDate: '2025-07-11', endDate: '2025-07-20' },
  { title: '분리수거장 위치 변경안', type: 'RESIDENT_VOTE', startDate: '2025-08-01', endDate: '2025-08-10' },
  { title: '주차 구역 재배치안', type: 'RESIDENT_VOTE', startDate: '2025-09-01', endDate: '2025-09-10' },
  { title: '입주민 전용 앱 도입', type: 'RESIDENT_VOTE', startDate: '2025-10-01', endDate: '2025-10-10' },

  // RESIDENCE_COUNCIL
  { title: '입주자대표회의 임시회의 소집', type: 'RESIDENT_COUNCIL', startDate: '2025-02-15', endDate: '2025-02-15' },
  { title: '동대표 보궐선거 공고', type: 'RESIDENT_COUNCIL', startDate: '2025-04-01', endDate: '2025-04-07' },
  { title: '입주자대표회의 정기회의 결과 공지', type: 'RESIDENT_COUNCIL' },
  { title: '선거인 명부 열람', type: 'RESIDENT_COUNCIL', startDate: '2025-09-10', endDate: '2025-09-15' },
  { title: '회장 후보자 등록', type: 'RESIDENT_COUNCIL', startDate: '2025-09-01', endDate: '2025-09-05' },
  { title: '입주자대표 윤리규정 제정안 공고', type: 'RESIDENT_COUNCIL' },
  { title: '입주자대표회의 회의록 공개', type: 'RESIDENT_COUNCIL' },
  { title: '감사 선출', type: 'RESIDENT_COUNCIL' },
  { title: '관리주체 평가 결과 보고', type: 'RESIDENT_COUNCIL' },
  { title: '입주자대표 워크숍 개최', type: 'RESIDENT_COUNCIL', startDate: '2025-11-20', endDate: '2025-11-20' },

  // GENERAL
  { title: '관리사무소 휴무', type: 'ETC', startDate: '2025-01-28', endDate: '2025-01-30' },
  { title: '아파트 명칭 표기 변경', type: 'ETC' },
  { title: '단지 내 촬영 협조 요청', type: 'ETC', startDate: '2025-05-12', endDate: '2025-05-14' },
  { title: '외부 기관 방문 조사', type: 'ETC', startDate: '2025-07-03', endDate: '2025-07-03' },
  { title: '홈페이지 개편', type: 'ETC' },
  { title: '모바일 앱 서비스 점검', type: 'ETC', startDate: '2025-09-02', endDate: '2025-09-02' },
  { title: '관리사무소 연락처 변경', type: 'ETC' },
  { title: '입주민 설문조사 결과', type: 'ETC' },
  { title: '단지 홍보 영상 제작', type: 'ETC' },
  { title: '입주민 안내문 배포 방식 변경', type: 'ETC' },
  { title: '공동현관 출입카드 디자인 변경', type: 'ETC' },
];

export const noticeItems = rawNotices.map((item) => ({
  ...item,
  content:
    item.type === 'RESIDENT_VOTE'
      ? `${item.title} 투표 안내입니다. 자세한 사항은 공지를 참고하세요.`
      : `${item.title} 관련 안내입니다. 자세한 사항은 공지를 참고하세요.`,
}));

export const commentTexts = [
  '저도요~',
  '공감합니다.',
  '빨리 처리되면 좋겠네요.',
  '언제쯤 해결될까요?',
  '저희도 같은 상황입니다.',
  '사진 첨부했으니 확인 부탁드려요.',
  '관리사무소에서 확인해주셨으면 합니다.',
  '계속 반복되고 있어요.',
  '걱정됩니다.',
  '이건 좀 심하네요.',
  '공지로 안내해주시면 좋겠습니다.',
  '해결되면 다시 알려주세요.',
  '감사합니다.',
  '조치 예정 일정이 궁금합니다.',
  '다른 입주민 분들도 불편하실 듯해요.',
  '이 부분은 개선이 필요해 보입니다.',
  '비슷한 민원이 예전에도 있었던 것 같아요.',
  '확인 후 답변 부탁드립니다.',
  '수고 많으십니다.',
  '조속히 처리되길 바랍니다.',
  '별 문제 못 느꼈는데 그럤군요.',
  '화이팅~',
];
