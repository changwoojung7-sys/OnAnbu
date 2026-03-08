# Expo 클라우드 빌드 (EAS Build) 사용법

안드로이드 앱을 구글 플레이스토어에 출시하거나, 실제 기기에 설치하려면 **인증서(Keystore, 통칭 빌드 키)**가 반드시 필요합니다.
EAS Build를 사용하면 골치 아픈 '빌드 키(Keystore) 생성 및 관리' 과정을 클라우드에서 안전하게 자동 처리해 줍니다.

## EAS Build 안드로이드 빌드 전체 과정

### 1단계: Expo 계정 생성 및 EAS CLI 설치

EAS(Expo Application Services)를 사용하려면 계정과 전용 도구가 필요합니다.

1. [Expo 공식 홈페이지](https://expo.dev/)에 접속하여 회원가입
2. 터미널(VS Code 등)에서 EAS CLI 전역 설치:

   ```bash
   npm install -g eas-cli
   ```

### 2단계: 터미널에서 Expo 계정 로그인

```bash
eas login
```

### 3단계: 프로젝트에 EAS 빌드 설정 초기화

프로젝트 폴더 최상단에서 아래 명령어 실행 (실행 시 `eas.json` 설정 파일이 생성됨):

```bash
eas build:configure
```

### 4단계: 안드로이드 빌드 실행 (빌드 키 생성)

실제 스토어 출시용 원본 파일(`AAB` 포맷) 생성 명령어:

```bash
eas build --platform android
```

- 실행 중 **"Generate a new Android Keystore?" (새로운 안드로이드 빌드 키를 생성하시겠습니까?)** 라는 질문이 나오면 **`Y` (Yes)** 선택.
- Expo 서버가 고유한 키를 생성하여 계정에 보관하고, 이후 빌드 시 이 키를 사용해 자동으로 서명합니다.

### 5단계: 완료 대기 및 다운로드

- 터미널에 빌드 진행 상황 확인용 URL이 나타남 (대기열에 따라 10분~20분 소요).
- 빌드 완료 후 제공되는 **다운로드 링크**에서 `앱이름.aab` 파일을 다운로드하여 구글 플레이 콘솔에 업로드.

---

## 💡 (참고) 플레이스토어 출시 전 실제 기기 테스트용 (.apk) 빌드 방법

`.aab` 파일은 일반 안드로이드 폰에 직접 설치할 수 없습니다. 테스터 기기에 직접 설치하려면 `.apk` 파일이 필요합니다.

`eas.json` 파일에 `preview` 설정을 추가하여 `.apk`를 빌드할 수 있습니다:

```json
{
  "cli": {
    "version": ">= 3.8.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"     // <--- apk 빌드 타입 설정 추가
      }
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

설정 완료 후, 다음 명령어를 실행하면 폰에 직접 설치 가능한 `.apk` 파일이 생성됩니다:

```bash

eas build -p android --profile preview
```

# eas build --local 명령어 사용

엑스포의 편리한 빌드 과정을 그대로 쓰고 싶지만, 서버만 내 컴퓨터를 사용하고 싶을 때 쓰는 명령어입니다. 이 역시 무료입니다.

eas build --platform android --profile production --local

---

## 🍎 iOS 빌드 전체 과정 및 테스트 기기 설치 방법

### 1단계: iOS 빌드의 가장 큰 차이점 (Apple Developer Program 필요)

iOS 앱을 빌드하고 아이폰에 설치하거나 앱스토어에 올리려면, **Apple Developer Program (연 129,000원 상당)** 결제가 필수적입니다.
애플은 구글과 달리, 테스트 단계에서부터 철저하게 "인증된 개발자가 서명한 코드(Provisioning Profile)"만 아이폰에 설치할 수 있도록 막아두었습니다.

### 2단계: 터미널에서 iOS 빌드 실행

만약 유료 애플 개발자 계정이 준비되었다면, 다음 명령어로 iOS 빌드를 시작할 수 있습니다:

```bash
eas build --platform ios
```

### 3단계: 애플 계정 연동 및 인증 (EAS가 자동 진행)

빌드를 시작하면 터미널에서 Apple ID와 비밀번호를 묻습니다.
로그인하면 **EAS 서버가 자동으로 애플 디벨로퍼 센터에 접근하여** 다음 작업들을 기가 막히게 알아서 처리해 줍니다:

1. 배포/개발용 인증서(Certificate) 생성 (이것이 iOS용 "빌드 키"입니다.)
2. 앱 정보 등록 (App ID)
3. 프로비저닝 프로파일(Provisioning Profile) 생성 및 관리

질문이 나오면 가급적 **Y (Yes)**를 눌러서 Expo가 모두 관리해주도록 하는 것이 속 편합니다!

### 4단계: 내 아이폰(iPhone)에 직접 설치하기

스토어(TestFlight나 App Store)에 올리지 않고, 곧바로 내 아이폰에 설치하고 싶다면 **Ad Hoc 빌드** 방식을 사용합니다.

1. **기기 등록:** 빌드 명령어 실행 중 `Would you like to register a new Apple device?`라는 질문에 `Y`를 누릅니다. 안내되는 링크로 아이폰을 통해 접속하여, 해당 폰의 UDID(고유 식별자)를 개발자 계정에 등록합니다.
2. `eas.json` 파일에 내부 배포(Ad Hoc) 옵션을 설정합니다 (보통 `preview` 프로필로 사용).
3. 명령어 실행: `eas build -p ios --profile preview`
4. **다운로드(QR 코드):** 빌드가 끝나면 터미널에 **QR 코드**나 웹 링크가 나타납니다. 이걸 아이폰 카메라로 비춰서 들어가면, 아이폰에 직접 앱을 다운로드 및 설치할 수 있습니다!

---

**💡 윈도우(Windows) 사용자 최고 장점**
원래 iOS 앱을 빌드하려면 무조건 **Mac 컴퓨터**가 있어야 합니다 (Xcode 필수).
하지만 **EAS Build를 이용하면 윈도우 PC에서도 iOS 빌드가 가능합니다!** (클라우드 서버가 Mac 역할을 대신해 주기 때문입니다.)
단, 여전히 Apple Developer Program (유료 계정)은 필요하다는 점을 잊지 마세요!

🍎 iOS 앱 빌드 및 아이폰 설치 방법

1. 가장 큰 특징 (유료 계정 필수): 안드로이드와 달리, 애플은 테스트 단계에서도 무조건 Apple Developer Program (연 129,000원 상당) 유료 결제가 필요합니다. 유료 계정이 없으면 아이폰에 개발 중인 앱을 설치하는 것 자체가 불가능합니다.

2. 윈도우(Windows) 사용자의 가장 큰 장점: 원래 iOS 앱을 만들려면 무조건 맥(Mac) 컴퓨터가 있어야 하지만, EAS Build 클라우드 서버가 Mac 역할을 대신 해주기 때문에 윈도우 PC에서도 명령어 한 줄로 iOS 빌드가 가능합니다!

3. iOS 빌드 및 설치 방법 (Ad Hoc):

터미널에 eas build --platform ios (또는 -profile preview) 명령어를 입력합니다.
터미널에서 Apple ID와 비밀번호를 묻습니다. 로그인하면 EAS 서버가 골치 아픈 '배포용 인증서'와 '프로비저닝 프로파일'을 자동으로 생성해 줍니다.
빌드 중간에 Would you like to register a new Apple device?라고 묻습니다. 여기서 Y를 누르고, 안내되는 링크로 아이폰(Safari 브라우저)에 접속합니다.
아이폰에서 '프로파일 설치'를 누르면, 아이폰의 고유 식별자(UDID)가 개발자 계정에 등록됩니다.
빌드가 모두 끝나면 터미널에 QR 코드나 다운로드 링크가 나타납니다.
해당 QR 코드를 아이폰 카메라로 비추면, 아이폰 바탕화면에 앱이 스르륵 설치됩니다!
