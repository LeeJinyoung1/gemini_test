# Lee Project (이 프로젝트)

다양한 이벤트 및 메시지 전달을 위한 리액트 기반 웹 애플리케이션 프로젝트 모음입니다.

## 📂 프로젝트 구성

현재 이 저장소에는 다음과 같은 프로젝트들이 포함되어 있습니다.

### 1. 💌 Cheer Up Letter (`cheer-up-letter`)
- **설명**: 누군가에게 응원의 메시지를 전달하기 위한 웹 레터 프로젝트.
- **기술 스택**: Vite, React, App.css.

### 2. 🕰️ Clocktower Invitation (`clocktower-invitation`)
- **설명**: '시계탑에 흐른 피' 보드게임 모임을 위한 테마형 웹 초대장.
- **기술 스택**: Create React App (CRA), React, Vanilla CSS.
- **상세 규칙**: `rule/clocktower-invitation-dev-notes.md` 참고.

### 🏠 Sweet Home Budget (`sweet-home-budget`)
- **설명**: 부부가 함께 사용하는 가계부 앱 (투자 누적 관리, 할부/반복 결제 지원).
- **기술 스택**: Create React App (CRA), React, Firebase (Auth & Firestore), XLSX.
- **상세 규칙**: `rule/sweet-home-budget-dev-notes.md` 참고.

## 🤖 Gemini CLI 개발 지침 (Mandatory)

이 프로젝트에서 Gemini CLI는 다음 규칙을 **최우선**으로 준수해야 합니다.

1. **컨텍스트 확인**: 작업을 시작하기 전, `rule/` 폴더 내의 해당 프로젝트 가이드라인(`*.md`)을 반드시 확인하십시오.
2. **코드 스타일 유지**: 각 프로젝트의 기존 코딩 스타일(변수명, 함수 선언 방식 등)을 엄격히 따르십시오.
3. **언어**: 설명 및 응답은 한국어로 작성하되, 코드 내 주석이나 변수명은 각 프로젝트의 관습을 따릅니다.
4. **빌드 및 배포 고려**:
   - 모든 수정 후에는 `npm run build`가 정상적으로 동작하는지 확인해야 합니다.
   - 정적 호스팅(Apache, GitHub Pages 등)을 고려하여 파일 경로 설정을 신중히 다루십시오.
5. **보안**: API 키, 개인 정보 등이 포함된 파일이 노출되거나 커밋되지 않도록 주의하십시오.
6. **개발 기록 유지 (필수)**: 작업을 진행할 때마다 새롭게 추가된 기능, 수정된 로직, 디자인 규칙 등 **중요 내용을 `rule/` 폴더 내 해당 프로젝트의 개발 노트(`.md`)에 즉시 업데이트**하십시오. 이는 다음 개발 시 연속성을 유지하기 위한 필수 절차입니다.

## 🚀 시작하기

각 프로젝트 폴더로 이동하여 의존성을 설치하고 실행합니다.

```bash
# 예시: clocktower-invitation 실행
cd clocktower-invitation
npm install
npm start
```

## 📄 라이선스

이 프로젝트는 [MIT](LICENSE) 라이선스 하에 배포됩니다.
