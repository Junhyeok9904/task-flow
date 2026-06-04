# 🚨 트러블슈팅 및 알려진 이슈 (Troubleshooting)

이 문서는 Task-Flow 프로젝트에서 발생했던 주요 오류 사항과 해결 방법을 기록한 문서입니다. 동일한 문제 발생 시 참고하여 빠르게 해결할 수 있도록 관리합니다.

---

## [2026-05-24] Windows 배치 파일(.bat) 줄바꿈(Line Ending) 오류

### ⚠️ 증상
```text
'ocal'은(는) 내부 또는 외부 명령, 실행할 수 있는 프로그램, 또는 배치 파일이 아닙니다.
'e'은(는) 내부 또는 외부 명령, 실행할 수 있는 프로그램, 또는 배치 파일이 아닙니다.
```

### 🔍 원인
`.bat` 스크립트 파일 내부에 Windows 기본 줄바꿈 문자(`CRLF`, `\r\n`) 대신 Unix/Linux 방식의 줄바꿈 문자(`LF`, `\n`)가 섞여 있을 경우, Windows of `cmd.exe`가 명령어를 파싱할 때 문자가 잘리거나 누락되는 현상이 발생합니다. 
위 에러는 `setlocal`이 `ocal`로 잘려서 인식되어 발생한 문제입니다.

### ✅ 해결
파일 전체의 줄바꿈 문자를 일괄적으로 `CRLF(\r\n)`로 변환하여 저장해야 합니다. 에디터 하단 상태 표시줄에서 줄바꿈 형식을 `CRLF`로 변경하거나, Node.js/PowerShell 스크립트를 통해 일괄 치환해 줍니다.

---

## [2026-05-24] Discord Webhook 전송 시 이모지(UTF-8) 깨짐 현상

### ⚠️ 증상
디스코드로 전송된 메시지에서 `🚀`와 `🔗` 같은 이모지가 `??` 나 `?뵕` 와 같이 알 수 없는 문자로 깨져서 출력됨.

### 🔍 원인
Windows의 `cmd.exe`는 기본적으로 시스템 로캘(한국어의 경우 `CP949`)을 사용합니다. 스크립트 파일이 `UTF-8`로 저장되어 있더라도, 배치 스크립트 내에서 `curl` 명령어의 매개변수로 UTF-8 이모지를 직접 전달할 때 인코딩이 깨져서(mangled) 전송되는 문제가 발생합니다.

### ✅ 해결
배치 스크립트(`.bat`)의 최상단에 아래 명령어를 추가하여 현재 활성화된 콘솔의 코드 페이지(Code Page)를 강제로 `UTF-8`로 변경합니다.
```bat
chcp 65001 >nul
```
이렇게 하면 `cmd.exe`가 해당 쉘에서 실행되는 모든 문자열 입출력을 UTF-8 규격에 맞게 처리하므로 `curl` 명령어 전달 시 문자가 깨지지 않습니다.

---

## [2026-05-24] useRef 미정의로 인한 클라이언트 에러 (ReferenceError: useRef is not defined)

### ⚠️ 증상
- 브라우저 접속 시 `"This page couldn’t load. Reload to try again, or go back."` 오류 경고창 출력.
- 서버 콘솔 로그에 `ReferenceError: useRef is not defined` 에러 추적 출력.

### 🔍 원인
- `MobileContainer.tsx` 내에 모바일 터치 제스처 구현을 위해 `useRef` 훅을 사용하기 시작했으나, 파일 최상단의 React import 구문에 `useRef`가 누락되어 클라이언트 컴포넌트 렌더링 스레드가 중단되었습니다.

### ✅ 해결
- `import React, { useState, useEffect } from 'react';` 구문을 `import React, { useState, useEffect, useRef } from 'react';` 로 수정하여 모듈의 사용을 명확히 명시했습니다.

---

## [2026-05-24] 포트 중복 및 Next.js 개발 서버 충돌 (Another next dev server is already running)

### ⚠️ 증상
- 개발 서버 실행 시 포트 3000번 점유 경고와 함께 `Another next dev server is already running` 발생하며 중단됨.
- 소스코드 갱신 후에도 이전 메모리 좀비 캐시로 인해 수정 코드가 반영되지 않거나 Hydration 오류가 발생.

### 🔍 원인
- 백그라운드 태스크나 예전 쉘 스크립트 프로세스가 포트 3000/3001번을 점유하고 정상적으로 소거(Exit)되지 않아 좀비 상태로 유지되었습니다.

### ✅ 해결
- 터미널에서 아래 명령을 사용해 시스템에서 실행 중인 모든 Node.js 프로세스를 강제 청소하고 개발 서버를 새 포트에서 시작했습니다.
```powershell
taskkill /IM node.exe /F
```

---

## [2026-05-27] 타입스크립트 인터페이스 임포트로 인한 ESM 디렉토리 임포트 오류

### ⚠️ 증상
- `npm run test` 실행 시, 신규 테스트 `sort.test.ts`가 모듈 로드 시점에 아래와 같은 에러로 실패함.
```text
Error [ERR_UNSUPPORTED_DIR_IMPORT]: Directory import 'E:\mb\task-flow\src\types' is not supported resolving ES modules imported from E:\mb\task-flow\tests\sort.test.ts
```
- 또는 `does not provide an export named 'MediaFile'` 과 같은 런타임 가져오기 오류가 발생함.

### 🔍 원인
- Node.js ESM 기본 모드에서는 확장자가 없거나 디렉토리를 통째로 참조하는 `import { MediaFile } from '../types'` 구문을 런타임에 처리할 수 없습니다.
- 또한 `MediaFile`은 타입스크립트의 `interface`로, 트랜스파일 시 자바스크립트 런타임에는 실체가 소멸하는 타입 전용 정의입니다. `import { ... }` 형태로 빌드 없이 Node.js ESM 상에서 가져오려고 하면 런타임 로더가 값을 찾지 못해 가져오기 예외를 발생시킵니다.

### ✅ 해결
- 해당 컴포넌트나 테스트 스크립트에서 타입스크립트 타입/인터페이스만을 임포트할 때는 반드시 `import type` 문법을 사용해야 합니다.
```typescript
import type { MediaFile } from '../types';
```
- `import type`으로 선언하면 타입스크립트 트랜스파일러(`experimental-strip-types`)가 자바스크립트 변환 및 실행 전에 해당 `import`문 자체를 완전히 삭제하므로 Node.js ESM 로더가 런타임에 모듈을 검색하지 않아 오류가 나지 않습니다.

---

## [2026-05-27] 테스트 러너 환경에 따른 로케일(Locale) 별 다국어 정렬 순서 불일치

### ⚠️ 증상
- 영어, 한국어, 숫자가 혼합된 파일 명칭을 정렬할 때, 로컬 테스트 환경(한국어 로케일 Windows)에서 `assert.strictEqual` 문이 예상과 다른 순서로 정렬되어 실패함.
- 영어(`Avicii`)가 한글(`아이유`)보다 앞에 올 것을 기대했으나 실제 정렬 결과는 한글이 영어보다 먼저 오는 등의 순서 불일치 발생.

### 🔍 원인
- `String.prototype.localeCompare`는 실행 환경의 기본 로케일(시스템 설정)에 종속적입니다.
- 예를 들어, 한국어 설정(`ko-KR`) 시스템 환경에서는 기본 정렬 시 한글이 영어 알파벳보다 우선순위를 가지도록 정렬될 수 있습니다. 반면 기본 영어 로케일 환경에서는 영어가 한글보다 앞서는 등의 차이가 생깁니다. 이로 인해 정밀한 순서를 직접 못 박아 테스트하면 플랫폼별로 결과가 다르게 나옵니다.

### ✅ 해결
- 영어와 한글 등 서로 다른 언어 간의 정적 선후 순서를 강제하여 비교하지 말고, 각 언어 그룹 내에서 개별적으로 순서가 정렬되는지 그룹화 필터를 거쳐 검증하도록 테스트 코드를 로케일 독립적으로 개선합니다.
- 예: 숫자는 전체 목록에서 여전히 가장 앞에 오므로 숫자 정렬을 우선 확인하고, 한글 그룹과 영어 그룹을 따로 필터링하여 각 그룹 안에서 순차적(`Avicii` -> `Zedd`, `아이유` -> `홍길동`)으로 배열되었는지를 검사합니다.

---

## [2026-06-05] 오디오 소스 클리어(Empty Source) 시 Console Error 및 토스트 알림 오작동

### ⚠️ 증상
곡 전환, 대기열 클리어, 혹은 크로스페이드가 완료되는 순간 콘솔에 `Audio element error: {}` 에러 로그가 출력되고, 화면에 `"오디오를 재생할 수 없습니다. 파일이 없거나 지원하지 않는 형식입니다."` 토스트 경고 알림이 오작동하며 노출됨.

### 🔍 원인
현재 활성화되지 않은 이전 오디오 채널의 리소스를 해제하기 위해 오디오 엘리먼트의 `src` 주소값을 빈 문자열(`a.src = ''`)로 비워주는 과정에서 브라우저가 이를 잘못된/비어있는 경로 로드 실패로 파악하여 미디어 `error` 이벤트를 리스너에 던졌습니다. 이로 인해 `onError` 핸들러가 트리거되어 토스트 메시지를 띄우는 버그가 발생하였습니다.

### ✅ 해결
1. 오디오 소스를 해제할 때는 `src = ''` 대신, 명시적으로 속성을 지우고 리프레시하는 HTML5 표준 방법인 `audio.removeAttribute('src')` 와 `audio.load()`를 조합하여 호출합니다.
2. `onError` 핸들러 내부에서 에러가 감지되었을 때, `src`가 비어있거나, `getAttribute('src')`가 없거나, 현재 페이지의 주소(window.location.href)와 같은 경우는 소스 해제 시 발생하는 정상적인 의도된 상태이므로 무시하고 조기 반환(`return`)하도록 수정하였습니다.

