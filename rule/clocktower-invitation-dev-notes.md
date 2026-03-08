# Clocktower Invitation 프로젝트 개발 가이드

이 문서는 `clocktower-invitation` 프로젝트의 구조, 주요 기능 및 개발 규칙을 정리한 문서입니다. 다음 개발 시 이 내용을 참고하여 일관성을 유지하십시오.

## 1. 프로젝트 개요
- **목적**: '시계탑에 흐른 피' 보드게임 모임을 위한 웹 초대장.
- **기술 스택**: React (v19+), Vanilla CSS.
- **주요 특징**: 봉투가 열리는 애니메이션 효과 및 테마에 맞는 다크/엔틱 디자인.

## 2. 디렉토리 구조
- `src/components/`: 재사용 가능한 UI 컴포넌트.
    - `FoldedInvitation.js/css`: 닫힌 상태의 봉투와 열기 애니메이션.
    - `UnfoldedInvitation.js/css`: 열린 상태의 상세 초대장 내용.
- `src/img/`: 프로젝트에서 사용되는 이미지 자산.
    - `seal.jpg`: 실링 왁스 이미지.
    - `invite_img.jpg`: 초대장 하단 배경 이미지.
- `public/img/`: 정적 서빙용 이미지 (필요 시).

## 3. 핵심 기능 및 로직
### 애니메이션 (FoldedInvitation)
- 사용자가 봉투를 클릭하면 `isOpening` 상태가 `true`가 됨.
- CSS 클래스 `.opening`이 추가되어 애니메이션 실행 (약 800ms).
- `setTimeout`을 통해 애니메이션 종료 후 `App.js`의 `isUnfolded` 상태를 변경하여 컴포넌트 전환.

### 디자인 규칙 (CSS & Style)
- **폰트**: 'Nanum Myeongjo' (명조체), 'Pirata One' (Gothic/Medieval 스타일).
- **색상**: 
    - 메인 레드: `#8a0303` (피의 색)
    - 강조 골드: `#d4af37` (엔틱한 느낌)
    - 텍스트: `#2c2c2c` (짙은 회색/검정)
- **이미지 처리**: `seal.jpg`는 `clip-path: circle(40%)`를 사용하여 원형으로 출력하며, 그림자 효과(`drop-shadow`)를 적용함.

## 4. 개발 시 주의사항
1. **정적 호스팅 고려**: 아파치나 다른 웹서버에 배포할 때 `npm run build` 후 `build/` 폴더의 내용을 사용함.
2. **라우팅**: 현재는 단일 페이지 앱(SPA)이며 별도의 라우터는 없으나, 추가 시 아파치에서 `index.html`로 리다이렉트 설정이 필요함.
3. **이미지 경로**: `import` 방식을 사용하여 빌드 시 해시값이 붙도록 처리함. (예: `import sealImg from '../img/seal.jpg'`)
4. **반응형**: 모바일 접속을 고려하여 `max-width`가 적용된 컨테이너 구조를 유지함.

## 5. 향후 개선 아이디어
- 배경 음악 추가 (으스스한 분위기).
- 참석 여부 확인 (RSVP) 폼 추가.
- 카카오톡 공유 기능 연동.
