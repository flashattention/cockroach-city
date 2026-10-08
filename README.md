# 🐻 젤리시티 (Jelly City)

말랑말랑한 **곰돌이 젤리들이 사는 3D 도시**에서 동료들과 함께 살아가는 멀티플레이 라이프 시뮬레이션 웹 게임입니다.
GTA처럼 3인칭으로 걷고, 날고, 차를 빼앗아 운전하고, 건물에 들어가고, LLM으로 대화하는 이웃 젤리들과 친해질 수 있어요.

> 원래는 바퀴벌레 도시(바퀴시티)였어요. 상단의 **🪳 바퀴 모드** 버튼을 누르면 지금도 모두 바퀴벌레로, 도시 이름은 바퀴시티로 보여요 (내 화면에만 적용).

플레이: **https://jelly-city.fly.dev** (입장 비밀번호 필요 · 구글 로그인 또는 체험판)

## 무엇을 할 수 있나요

- **곰돌이 젤리 캐릭터**: 젤리 색·눈·코·입·볼터치·날개·액세서리를 골라 나만의 젤리를 만들어요. 고른 색이 다른 플레이어 화면에서도 똑같이 보여요. 맞으면 그 색 젤리가 튀어요.
- **도시 생활**: 48종 건물에 모두 들어갈 수 있고, 시민 140명이 이름·직업·성격·가족·꿈을 갖고 하루를 살아요. 일하고, 먹고, 집을 사고, 클럽·영화관·사격장·무릉도장에 가요.
- **LLM 이웃**: 시민은 자기 프로필, 지금 하는 일, 몸 상태, 친밀도, 기억을 바탕으로 gpt-4o-mini로 대답해요. 기분이 나쁘거나 맞으면 112에 신고해요.
- **넓은 세계 (2.3km)**: 계곡·바퀴산·야생의 숲·사냥꾼 들판·악어 늪지대·호랑이 정글·아마존·바다·대교·섬 목장 마을, 그리고 **🐉 드래곤 협곡**.
- **동물 포획 · 탈것**: 모든 동물에 체력바가 있어요. 체력을 절반 아래로 깎고 Z로 타이밍을 맞추면 포획해서 타고 다녀요. 드래곤은 날아다니며 화염방사(왼쪽 클릭)와 불덩이(오른쪽 클릭)를 써요.
- **🎢 바퀴랜드 놀이공원**: 롤러코스터·바이킹·관람차·회전목마를 실제로 타요. 모든 플레이어 화면에서 같은 시간에 같은 모습으로 움직여요.
- **전투**: 근접무기(등급별 휘두르기 이펙트, 광선검), 총 20여 종(실제와 비슷한 사거리·위력·반동, 1인칭 조준), 활·석궁, 마법봉 7종, 수류탄·로켓. 총·화살 헤드샷은 한 방이에요. 탄약은 필요 없어요.
- **수배와 경찰**: 시민·플레이어가 112에 신고해야 경찰이 와요. 경범죄는 체포(하늘에 있으면 경찰도 날아와요) → 교도소 60초, 중범죄는 경찰·군대·전차·헬기가 출동해요.
- **탈것**: 자동차 21종(스포츠카 5종)·자전거·스쿠터·오토바이 5종을 쇼룸에서 사고 차 키로 불러요. 차로 가로등·나무를 들이받으면 부서져요.
- **휴대폰**: 카메라·갤러리·인스타그램·튄더(매칭)·연락처·문자·112·지도·훈장 등.
- **그 밖에**: 낚시(22종)와 매운탕·횟집, TV 7채널, 날기(Space 두 번)·벽 타기·수영, 리스폰 존 무적(호텔·대표 집 문 앞 10m), 훈장, 일일 퀘스트, 레벨.

자세한 기능은 [`docs/기능정리.md`](docs/기능정리.md)에 정리되어 있어요.

## 조작

| 키 | 동작 |
|---|---|
| WASD / 방향키 | 이동 (운전 중엔 운전) |
| Shift | 달리기 · 탈것 전력 질주 |
| Space | 점프 (2단 점프) · **두 번 누르면 날기/날개 접기** · 날 때 꾹 누르면 위로 |
| X | 날 때 아래로 |
| C | 대쉬 |
| 마우스 왼쪽 | 공격 · 사용 (활은 당겼다 놓기, 근접무기는 누르고 있으면 연속) |
| 마우스 오른쪽 | 1인칭 조준 (저격총은 스코프) · 드래곤 탑승 중엔 불덩이 |
| V | 1인칭 ↔ 3인칭 |
| E | 대화 · 건물 입장 · 행동 · 아이템 줍기 · 놀이기구 타기 |
| F | 차 타기/빼앗기/내리기 · 탈것에서 내리기 |
| Z (꾹 → 떼기) | 동물 포획 |
| B | 플러팅 |
| P | 사진 찍기 |
| Q | 선택한 아이템 버리기 |
| 1~0 | 핫바 선택 |
| I | 가방 |
| M | 지도 (전체 지도 · 휠로 확대 · 드래그 이동 · 클릭으로 목적지) |
| R | 목적지까지 자동 이동 |
| K / Tab | 휴대폰 |
| Enter / T | 채팅 |
| H | 조작법 열고 닫기 |

## 실행 (로컬)

서버는 Node.js(20 이상)로 돌아가요. Node가 없으면 Docker로 실행하면 됩니다.

```bash
# Docker (권장)
cp .env.example .env        # OPENAI_API_KEY, GAME_PASSWORD 입력
docker compose up --build   # → http://localhost:8000

# 또는 Node가 있다면
npm install
OPENAI_API_KEY=sk-... GAME_PASSWORD=비밀번호 npm start
```

| 환경변수 | 설명 |
|---|---|
| `GOOGLE_CLIENT_ID` | 구글 로그인용 OAuth 클라이언트 ID. 없으면 개발용 이름 로그인 (로컬 `npm start` 에서만) |
| `OPENAI_API_KEY` | NPC 대화용 키. 없으면 기본 대사로 동작 |
| `ADMIN_EMAILS` | 건의함을 볼 수 있는 관리자 구글 이메일 (쉼표로 여러 명). 휴대폰 📮 건의함 또는 `/admin.html` |
| `GAME_PASSWORD` | 입장 비밀번호. 비워두면 누구나 입장 가능 |
| `OPENAI_MODEL` | 기본 `gpt-4o-mini` |
| `OPENAI_BASE_URL` | OpenAI 호환 API를 쓸 때 |
| `TIME_SPEED` | 현실 1초당 게임 분 (기본 1.5) |
| `DATA_DIR` | 세계 저장 위치 (기본 `./data`, Docker는 `/data`) |
| `STREET_CHAT_PER_MIN` | NPC끼리 거리 수다를 LLM으로 만드는 횟수 상한 (분당, 기본 6) |
| `WORLD_DROPS` | 거리에 떨어져 있는 무기 개수 (기본 14) |
| `REDIRECT_TO` | 설정하면 모든 요청을 이 주소로 보내요 (서버 이전 후 옛 주소용) |

개발용 URL 파라미터: `?autostart&name=이름` (개발용 로그인일 때 시작 화면 건너뛰기)

## 로그인

- **구글 로그인**: 구글 계정마다 캐릭터를 4개까지 만들 수 있어요.
- **체험판**: 로그인 화면의 '체험판으로 바로 시작'으로 구글 로그인 없이 플레이할 수 있어요 (입장 비밀번호는 필요). 이틀 동안 접속하지 않으면 체험판 캐릭터는 사라져요.

### 구글 로그인 설정
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
2. 애플리케이션 유형: **웹 애플리케이션**
3. **승인된 JavaScript 원본**에 `https://jelly-city.fly.dev` 와 `http://localhost:8000` 추가 (리디렉션 URI는 필요 없음)
4. 처음이면 OAuth 동의 화면을 **외부 / 테스트** 로 만들고, 같이 할 동료 이메일을 테스트 사용자로 추가 (또는 앱 게시)
5. 발급된 클라이언트 ID(`....apps.googleusercontent.com`)를 `GOOGLE_CLIENT_ID` 로 설정. 클라이언트 보안 비밀번호는 쓰지 않아요

## 배포 (Fly.io + GitHub 자동 배포)

세계 상태(시계, NPC, 차량, 동물)가 서버 메모리에 있으므로 **서버는 반드시 1대**로 돌려야 해요. WebSocket을 지원하는 곳이어야 하고, 정적 호스팅으로는 안 됩니다.

처음 한 번만 설정하면, 이후에는 `main` 브랜치에 push할 때마다 GitHub Actions가 문법 검사·서버 기동 테스트를 하고 실서버에 배포해요 (`.github/workflows/deploy.yml`).

```bash
# 1) 처음 한 번: 앱 만들기 (fly.toml의 app 이름을 바꿨다면 그대로 커밋)
brew install flyctl && fly auth signup
fly launch --copy-config --no-deploy
fly volumes create roach_data --size 1 --region nrt
fly secrets set GOOGLE_CLIENT_ID=....apps.googleusercontent.com OPENAI_API_KEY=sk-... GAME_PASSWORD=동료용비밀번호 ADMIN_EMAILS=나@gmail.com
fly deploy

# 2) GitHub에 배포 권한 주기 (앱 이름이 바뀌면 토큰도 새로 만들어야 해요)
fly tokens create deploy -a jelly-city
# GitHub 저장소 → Settings → Secrets and variables → Actions → FLY_API_TOKEN 에 저장

# 3) 이후로는 push만 하면 배포
git push origin main
```

- 배포하는 동안 서버는 세계를 저장하고 재시작돼요. 접속 중인 브라우저는 몇 초 뒤 자동으로 새 코드를 받아 같은 캐릭터로 다시 접속해요.
- 머신은 꼭 1대로 유지하세요 (`fly scale count 1`).
- 서버를 옮길 때: 옛 서버의 `/data`(world.json, photos)를 새 서버에 옮기고, `world.json`을 `/data/import.json`으로 두고 재시작하면 그걸로 세계를 복원해요. 옛 앱에는 `REDIRECT_TO`를 설정해 새 주소로 보내요.

### Render
`render.yaml`로 Blueprint 배포도 할 수 있어요. 무료 플랜은 잠들고 디스크가 없어 재시작하면 세계가 초기화되니 starter 플랜과 디스크를 쓰세요.

### 비용과 보안
- 모든 NPC 대화는 서버의 OpenAI 키로 과금돼요. gpt-4o-mini는 대화 1회에 약 1~2천 토큰이 들어요.
- 키는 서버에만 있고 브라우저로 전달되지 않아요. 입장 비밀번호를 꼭 설정하세요.

## 구조

```
server/index.js        HTTP(정적 파일·API) + WebSocket 서버, 시뮬레이션 루프(20Hz), 스냅샷(10Hz)
server/world.js        공유 세계: 계정·캐릭터·로그인(구글·체험판), 시계, 시민·차량, 집, 휴대폰·튄더, NPC 대화(LLM), 저장
server/combat.js       전투·헤드샷·화상·수배·체포·경찰/군대 AI·바닥 아이템·리스폰 존
server/wildlife.js     야생동물·드래곤 AI, 포획
server/llm.js          OpenAI 호환 API 호출 (서버 전용)
public/index.html      UI 뼈대 (import map으로 three.js 로드)
public/js/
  main.js              렌더러, 낮밤, 입력, 상호작용, 욕구, 탈것·포획·놀이기구, 네트워크 처리
  roach.js             캐릭터 모델 (곰돌이 젤리 / 바퀴벌레 모드)
  views.js             서버 스냅샷으로 시민·다른 플레이어·경찰을 그리는 레이어
  terrain.js, wilds.js 넓은 세계의 지형·지역·도로·대교·놀이공원 터 / 지형 메쉬·나무·소품
  animals.js, fauna.js 동물·드래곤 모델과 움직임, 체력바 / 동물 데이터·탈것 속도
  park.js              바퀴랜드 놀이공원 놀이기구
  traffic.js           차량·이륜차 AI와 메쉬, 내 차 운전
  combat.js            조준·타격·투사체·불꽃·총알 자국·젤리 이펙트
  items.js             무기·방어구·치장·음식·낚시·전리품·탈것 데이터베이스
  ui.js, phone.js      HUD·창·지도 / 휴대폰 앱
  city.js, interior.js, player.js, lobby.js, data.js, config.js, utils.js ...
docs/기능정리.md        전체 기능 정리
```
