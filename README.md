# Secure Finance RAG

금융 사내 문서를 대상으로 한 RAG 파이프라인 데모입니다. 문서를 올리면 파싱, 청킹, 임베딩, 하이브리드 검색(BM25 + 의미 유사도)을 거쳐 근거가 달린 답변을 만들고, 각 단계의 품질 점수를 대시보드에서 보여줍니다.

이 프로젝트에서 가장 신경 쓴 건 데이터가 어디까지 나가는가입니다. 원본 문서와 검색 과정 전체가 실행 중인 PC 안에서 끝나고, 외부 AI나 클라우드 저장소로는 아무것도 보내지 않습니다.

## 실행

Node.js 22 이상과 pnpm이 필요합니다. PDF를 올리려면 `pdftotext`(poppler-utils)도 설치되어 있어야 합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 http://localhost:3000 을 열면 됩니다. 별도 설정 없이 바로 동작하고, 처음 실행할 때 `data/` 폴더에 DB 파일(`rag.db`)과 업로드 저장소가 만들어집니다.

배포용 빌드는 `pnpm build && pnpm start`, 테스트는 `pnpm test`, 타입 검사는 `pnpm check`입니다. 설정을 바꾸고 싶으면 `.env.example`을 `.env`로 복사해서 고치면 됩니다.

Docker로 띄울 때는 포트를 반드시 루프백에만 열어 주세요.

```bash
docker build -t secure-finance-rag .
docker run -p 127.0.0.1:3000:3000 -v rag-data:/app/data secure-finance-rag
```

## 로컬 모드의 보안 경계

로그인이 없습니다. 대신 아래 조건으로 "이 PC의 사용자만 쓸 수 있다"를 보장합니다.

- 서버는 기본적으로 `127.0.0.1`에만 바인딩되어 같은 네트워크의 다른 기기에서 접속할 수 없습니다.
- Host 헤더가 localhost 계열이 아니면 요청을 거절합니다. 로그인 없는 로컬 서버를 악성 웹페이지가 DNS 리바인딩으로 호출하는 공격을 막기 위한 장치입니다.
- 업로드한 원본 파일은 `data/uploads` 아래에 한글이나 원래 파일명이 들어가지 않은 ASCII 키로 저장되고, HTTP로는 내려받을 수 없습니다. 문서를 삭제하면 색인과 원본 파일이 함께 지워집니다.
- 외부로 나가는 요청이 없습니다. 답변 생성도 검색된 후보 청크 안에서만 문장을 고르는 방식이라 LLM API를 호출하지 않습니다.

`data/` 폴더를 BitLocker나 FileVault로 암호화된 디스크에 두면 저장 데이터 보호까지 OS 수준에서 해결됩니다.

## 구조

```
server/
  routers.ts              tRPC API (대시보드, 검색, 업로드, 삭제)
  rag/                    파싱·청킹·임베딩·하이브리드 검색·품질 점수
  repo/
    documentRepository.ts 저장소 인터페이스
    sqliteRepository.ts   SQLite 구현 (현재 유일한 구현)
  storage.ts              로컬 디스크 저장소
  _core/hostGuard.ts      Host 헤더 검사
client/                   React 대시보드
scripts/                  로컬 마스킹 변환기, 문서 파서 (Python)
drizzle/schema.ts         테이블 정의
```

라우터는 `DocumentRepository` 인터페이스만 알고 있습니다. 지금은 클론하자마자 돌아가도록 SQLite 구현 하나만 두었고, 여러 사람이 쓰는 사내 서버로 옮길 때는 PostgreSQL(pgvector) 구현을 추가해서 갈아끼우는 것을 전제로 설계했습니다.

파이프라인 단계별 설계와 품질 점수 기준은 [ARCHITECTURE.md](ARCHITECTURE.md), 실제 데이터를 외부에 보내기 전 마스킹하는 방법은 [LOCAL_MASKING_GUIDE.md](LOCAL_MASKING_GUIDE.md)에 정리했습니다.

## 사내망 서버로 옮길 때

로컬 모드는 한 사람이 자기 PC에서 쓰는 것을 전제로 합니다. 사내 서버에 올려 여러 명이 쓰려면 최소한 다음이 필요합니다.

1. 사내 SSO 연동으로 사용자 식별 (`server/_core/context.ts`에서 고정 사용자를 실제 인증으로 교체)
2. `HOST`와 `ALLOWED_HOSTS`를 사내 도메인에 맞게 설정
3. 문서 소유자별 접근 제어와 감사 로그
4. 저장소를 PostgreSQL과 사내 객체 저장소로 교체
