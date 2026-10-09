# Fonts

`Gloock-Latin.woff2` — Gloock, © The Gloock Project Authors (https://github.com/duartp/gloock),
licensed under the SIL Open Font License 1.1 (`Gloock-OFL.txt`). The only web
font: display headings, brand names and plates. Body text uses the system font.

Self-hosted on purpose: the site loads no third-party resources. The file is a
subset of `ofl/gloock/Gloock-Regular.ttf` from google/fonts, made with:

```bash
pyftsubset Gloock-Regular.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+20AC" \
  --layout-features='kern,liga' --flavor=woff2 --output-file=Gloock-Latin.woff2
```

Latin-1 covers every Portuguese letter (ã õ ç á é í ó ú â ê ô à); the rest is
dashes, curly quotes, the ellipsis and €.

Share images (`site/src/lib/og.ts`) are drawn with `@fontsource/inter`, because
Satori reads woff, not woff2.
