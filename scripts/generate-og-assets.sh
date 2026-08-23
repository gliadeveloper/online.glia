#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$ROOT/.tmp-og"
APP="$ROOT/src/app"
PUBLIC_OG="$ROOT/public/og"

mkdir -p "$TMP" "$PUBLIC_OG"

# GLIA mark path (from public/glia-symbol.svg), used as a group.
SYMBOL='<path fill-rule="evenodd" clip-rule="evenodd" d="M114.709 0L0 169.095L114.291 195L229 169.095L114.709 0ZM16.3272 164.255L114.709 18.7883L114.291 138.066L212.673 164.255L114.291 186.46L16.3272 164.255Z" fill="url(#glia-mark)"/>'

write_og() {
  local name="$1"
  local eyebrow="$2"
  local title="$3"
  local lede="$4"
  local out="$PUBLIC_OG/$name.png"

  cat > "$TMP/$name.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1E839E"/>
      <stop offset="1" stop-color="#17677D"/>
    </linearGradient>
    <linearGradient id="glia-mark" x1="114.5" y1="0" x2="114.5" y2="195" gradientUnits="userSpaceOnUse">
      <stop stop-color="#CCF7D5"/>
      <stop offset="0.5" stop-color="#BFF2CB"/>
      <stop offset="1" stop-color="#ADCDED"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1080" cy="-40" r="280" fill="#ADCDED" fill-opacity="0.22"/>
  <circle cx="160" cy="700" r="260" fill="#CCF7D5" fill-opacity="0.16"/>
  <g transform="translate(80,78) scale(0.42)">$SYMBOL</g>
  <text x="80" y="280" fill="#E8F5F7" font-family="Apple SD Gothic Neo, AppleSDGothicNeo, sans-serif" font-size="26" font-weight="600" letter-spacing="4">$eyebrow</text>
  <text x="80" y="372" fill="#FFFFFF" font-family="Apple SD Gothic Neo, AppleSDGothicNeo, sans-serif" font-size="72" font-weight="700">$title</text>
  <text x="80" y="448" fill="#E8F5F7" font-family="Apple SD Gothic Neo, AppleSDGothicNeo, sans-serif" font-size="28" font-weight="500">$lede</text>
</svg>
EOF

  rsvg-convert -w 1200 -h 630 "$TMP/$name.svg" -o "$out"
  echo "wrote $out"
}

write_og default "ONLINE" "GLIA" "몸의 신호를 읽고 스스로 조절하는 온라인"
write_og event1 "1기 모집" "GLIA 온라인 8주" "몸의 신호를 읽고 스스로 조절하는 8주 프로그램"
write_og shop "SHOP" "프로그램" "수강권 · 코칭 · 번들을 고르는 상점"
write_og community "COMMUNITY" "커뮤니티" "회복을 함께 기록하는 공간"

cat > "$TMP/icon.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="glia-mark" x1="114.5" y1="0" x2="114.5" y2="195" gradientUnits="userSpaceOnUse">
      <stop stop-color="#CCF7D5"/>
      <stop offset="0.5" stop-color="#BFF2CB"/>
      <stop offset="1" stop-color="#ADCDED"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" rx="40" fill="#1E839E"/>
  <g transform="translate(26, 28) scale(0.56)">$SYMBOL</g>
</svg>
EOF

rsvg-convert -w 32 -h 32 "$TMP/icon.svg" -o "$APP/icon.png"
rsvg-convert -w 180 -h 180 "$TMP/icon.svg" -o "$APP/apple-icon.png"
magick "$APP/icon.png" -define icon:auto-resize=16,32,48 "$APP/favicon.ico"

echo "wrote $APP/icon.png $APP/apple-icon.png $APP/favicon.ico"
rm -rf "$TMP"
