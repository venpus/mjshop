# 한글 폰트 파일

이 폴더에 나눔고딕 폰트 파일을 추가해야 합니다.

## 폰트 다운로드 방법

1. 나눔고딕 폰트를 다운로드합니다:
   - 공식 사이트: https://hangeul.naver.com/2017/nanum
   - 또는 다음 링크에서 다운로드: https://fonts.google.com/specimen/Nanum+Gothic
   - TTF 형식의 Regular 폰트를 다운로드하세요

2. `NanumGothic-Regular.ttf` 파일을 이 폴더(`public/fonts/`)에 복사합니다.

3. 파일명이 정확히 `NanumGothic-Regular.ttf`인지 확인합니다.

## 참고

- jsPDF는 TTF 폰트 형식만 지원합니다 (WOFF2는 지원하지 않음).
- 폰트 파일이 없으면 PDF 생성 시 기본 폰트(Helvetica)를 사용하며, 한글이 깨질 수 있습니다.
- 폰트 파일이 없어도 PDF는 생성되지만, 한글 텍스트는 깨져서 표시됩니다.
