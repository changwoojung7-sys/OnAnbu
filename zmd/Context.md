# ONANBU: Project Context & Architecture

이 문서는 **ONANBU** 프로젝트의 기획 의도, 핵심 기능, 시스템 아키텍처 및 구현 상태를 설명합니다. AI 어시스턴트나 새로운 개발자가 프로젝트를 빠르게 이해하고 작업을 이어갈 수 있도록 하기 위함입니다.

## 1. 기획 의도 (Project Vision)

**"부모님과 자녀를 연결하는 따뜻한 안부 서비스"**

ONANBU는 디지털 기기에 익숙하지 않은 부모님과, 바쁜 일상 속에서 부모님의 안부를 챙기고 싶은 자녀들을 연결하는 모바일 애플리케이션입니다.
복잡한 기능을 배제하고 **직관적인 UI**와 **따뜻한 감성**을 중심으로, 서로의 일상을 공유하고 건강을 체크할 수 있는 기능을 제공합니다.

## 2. 사용자 역할 (User Roles)

### 👴 부모님 (Parent)

- **주요 니즈**: 자녀와 소통하고 싶지만 스마트폰 조작이 어려움. 자신의 건강 상태를 알리고 싶음.
- **주요 기능**:
  - **초간단 안부 전송**: 버튼 하나로 "일어났어요", "약 먹었어요" 등의 상태 알림.
  - **사진/동영상 촬영 및 전송**: 갤러리 접근 필요 없이 즉시 촬영하여 전송하거나 기존 미디어 전송.
  - **음성 메시지**: 타자 입력 대신 목소리로 안부 전송.
  - **기분 체크**: 오늘의 기문을 이모지로 선택.
  - **기록 삭제**: 본인이 잘못 보낸 메시지나 미디어를 직접 삭제 가능 (UI/RLS 적용).
- **프로필 사진**: 본인의 사진을 등록하여 가족들에게 노출 가능 (Storage/RLS 적용).

### 👩‍👧 자녀 (Guardian / Primary Caregiver)

- **주요 니즈**: 부모님의 하루 일과와 안부를 실시간으로 확인하고 싶음. 다른 가족 구성원과 케어 역할을 분담하고 싶음.
- **주요 기능**:
  - **안부 피드**: 부모님의 활동(기상, 식사, 기분, 사진/음성)을 타임라인으로 확인.
  - **알림 수신**: 부모님의 활동이 감지되면 푸시 알림 수신.
  - **가족 관리**: 형제, 자매 등 다른 가족 구성원(보조 보호자)을 초대하여 함께 부모님을 케어.

### 👤 보조 보호자 (Secondary Guardian)

- **주요 니즈**: 주 보호자와 함께 부모님의 안부를 확인하고 싶음.
- **주요 기능**:
  - 주 보호자와 동일하게 부모님의 안부 피드를 확인 (가족 그룹 내 모든 활동 공유 RLS 적용).
  - 초대 코드를 통해 기존 가족 그룹에 합류.
  - 본인의 사진을 프로필로 등록 가능.

## 3. 핵심 기능 및 구현 현황 (Implementation Status)

### 🔐 인증 및 온보딩 (Auth & Onboarding)

- [x] **로그인/회원가입**: 이메일 기반 인증 (Supabase Auth).
- [x] **역할 선택**: 가입 시 `guardian`(자녀) 또는 `parent`(부모님) 역할 선택.
- [x] **초대 시스템**:
  - 자녀가 부모님 초대 코드 생성 (`invite-parent.tsx`).
  - 자녀가 보조 보호자 초대 시 대상 부모님을 선택하여 초대 코드 생성 (`invite-guardian.tsx`).
  - 초대 코드로 가입 시 초대받은 부모님의 정보를 확인 후 수락/가입 (`enter-code.tsx`).

### 📱 부모님 대시보드 (Parent Dashboard) - `app/parent/index.tsx`

- [x] **기상 알림**: "일어났어요" 버튼 (1일 1회 제한).
- [x] **기분 선택**: 이모지로 오늘의 기분 기록.
- [x] **미디어 전송**:
  - **사진/동영상**: `expo-image-picker`를 사용하여 갤러리 미디어 전송 (자동 MIME 타입 감지).
  - **음성 메시지**: `expo-av`를 사용하여 음성 녹음 및 전송.
- [x] **활동 내역**: 자녀가 보낸 안부 메시지 확인 (텍스트/사진).

### 🏠 자녀 대시보드 (Guardian Dashboard) - `app/(tabs)/index.tsx`

- [x] **홈 화면**: 등록된 부모님의 프로필과 상태 카드 표시 (세션 동기화 보장).
- [x] **안부 확인 (History)**: 활동 로그를 구글 포토 스타일의 **리치 미디어 카드 피드**로 통합 조회 (`two.tsx` 및 `HistoryFeed.tsx`).
  - 사진과 영상의 풀 뷰 및 비디오/음성 인라인 재생 지원.
  - **멤버별 프로필 사진 노출**: 누가 기록을 남겼는지 아바타로 표시.
  - **가족 간 공유**: 보조 보호자도 주 보호자와 부모님 간의 기록을 모두 확인 가능.
  - **기록 삭제**: 부모님/보호자 본인 작성 글 삭제 가능.
- [x] **케어 기능 (Care)**: 보상형 광고 시청 후 횟수 제한 없이 사진/동영상/음성 통합 미디어 안부 무제한 발송 기능 구현 (`care.tsx`).
- [x] **프로필 관리**: 이름 및 사진 수정 기능 (`profile/edit.tsx`). 실시간 상태 동기화 및 이미지 캐시 처리 완료.

### 👨‍👩‍👧‍👦 가족 관리 (Family Management) - `app/family/index.tsx`

- [x] **가족 목록**: 현재 연결된 부모님과 보조 보호자 목록 확인.
- [x] **초대하기**: 새로운 보조 보호자 초대 (초대 코드 공유).

## 4. 기술 스택 및 아키텍처 (Tech Stack)

- **Frontend**: React Native (Expo SDK 54+), TypeScript
- **Navigation**: Expo Router (파일 시스템 기반 라우팅)
- **Backend & DB**: Supabase (PostgreSQL, Auth, Storage, Realtime)
  - **RLS 연동**: 가족 그룹 기반 공유 권한, Storage `media` 버킷 권한 최적화 (`avatars/` 전용 정책 적용)
- **Deployment**: **Cloudflare Pages** (GitHub 연동, SPA `single` 빌드 방식 적용)
- **State Management**: Zustand (`authStore`, `actionStore`)
- **Advertising**: Google Mobile Ads SDK (`react-native-google-mobile-ads`) 보상형 광고(Rewarded Ad) 연동
- **Styling**: `StyleSheet` w/ Constant Design Tokens (`constants/Colors.ts`, `theme.ts`)
- **Routing Support**: `_redirects` 설정을 통해 Cloudflare SPA 라우팅 새로고침 에러 방지

### 주요 디렉토리 구조

- `app/`: Expo Router 페이지 (스크린)
  - `(tabs)/`: 자녀용 하단 탭 내비게이션
  - `parent/`: 부모님용 화면
  - `auth/`: 로그인, 회원가입, 초대 코드 입력
  - `family/`: 가족 관리
  - `settings/`: 설정
- `components/`: 재사용 가능한 UI 컴포넌트
- `lib/`: Supabase 클라이언트, 유틸리티 함수
- `stores/`: 전역 상태 관리 (Zustand)
- `constants/`: 디자인 토큰, 문자열 상수

## 5. 데이터베이스 스키마 (Database Schema)

- **profiles**: 사용자 정보 (이름, 역할, 이메일 등)
- **family_groups**: 가족 그룹 (보호자와 부모님을 묶는 단위)
- **family_members**: 가족 그룹에 속한 구성원 매핑
- **action_logs**: 모든 활동 로그 (기상, 미디어 전송, 메시지 등)
- **parent_invitations**: 부모님 초대 코드 관리
- **guardian_invitations**: 보조 보호자 초대 코드 관리

## 6. 향후 계획 (Future Roadmap)

- [ ] **미션 시스템**: 부모님이 수행할 건강 미션(걷기, 물 마시기 등) 및 포인트 보상.
- [ ] **푸시 알림**: 활동 감지 시 실시간 푸시 알림 연동.
- [ ] **통계 및 리포트**: 주간/월간 안부 리포트 제공.
