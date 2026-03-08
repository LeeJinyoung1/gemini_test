# Sweet Home Budget (우리 집 가계부) 개발 가이드

이 문서는 부부가 함께 사용하는 가계부 앱 `sweet-home-budget` 프로젝트의 구조와 개발 규칙을 정리한 문서입니다.

## 1. 프로젝트 개요
- **목적**: 부부간 실시간 지출/수입 공유 및 자산 관리.
- **기술 스택**: React (CRA), Vanilla CSS, Firebase (Auth & Firestore).
- **주요 특징**: PWA(Progressive Web App) 지원으로 모바일 앱처럼 설치 및 사용 가능.

## 2. 핵심 기술 명세
### Firebase 연동
- **Authentication**: Google 로그인을 사용하여 사용자 식별 및 보안 유지.
- **Firestore (NoSQL)**: 
    - `transactions`: 수입/지출 내역 (금액, 카테고리, 결제방법, 메모 등).
    - `categories`: 지출/수입 카테고리 목록.
    - `paymentMethods`: 결제 수단 목록 (현금, 카드 등).
    - `onSnapshot`을 이용한 모든 데이터의 실시간 동기화.

## 3. UI/UX 디자인 규칙
- **모바일 우선 (Mobile-First)**: `max-width: 500px` 컨테이너.
- **색상**: 메인(`#4f46e5`), 수입(`#22c55e`), 지출(`#ef4444`).
- **가독성**: 금액과 메모를 가장 크게 표시하며, 상세 정보(카테고리, 결제수단, 작성자)를 보조적으로 노출.

## 4. 컴포넌트 구조 (App.js)
- `CalendarDashboard`: 메인 홈. 달력 격자와 하단 일일 상세 내역 리스트.
- `History`: 전체 내역 리스트. 무한 스크롤 대신 최신순 전체 리스트 제공.
- `Stats`: `recharts` 기반 시각화.
- `ListManager`: 카테고리 및 결제 수단을 관리하는 공통 컴포넌트.
- `TransactionModal`: 입력/수정 폼. 카테고리와 결제 수단 선택 기능 포함.
- `Settings`: 유저 설정 및 관리 메뉴.

## 5. 개발 시 주의사항
1. **실시간성**: 모든 데이터는 DB의 상태를 감시하여 자동으로 UI를 갱신함.
2. **초기값 주입**: `categories`나 `paymentMethods`가 비어있을 경우 기본 데이터를 자동으로 생성함.
3. **PWA**: `manifest.json`과 서비스 워커를 통해 앱 설치 기능을 유지해야 함.
4. **이미지**: 구글 프로필 이미지 로드 시 `referrerPolicy="no-referrer"` 설정 필수.
