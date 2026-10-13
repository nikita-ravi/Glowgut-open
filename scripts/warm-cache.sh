#!/bin/bash
# Pre-load the demo products into the API's response cache (spec 025).
B=${API_URL:-http://localhost:8000}
for g in 0096619160754 0076808008470 0857484006284 0744473476138 0037600138727 0038000138416 0028400090858 0016000275287; do
  for p in "" /breakdown /alternatives /recalls; do
    curl -s -o /dev/null -w "%{http_code} %{time_total}s $g$p\n" "$B/products/$g$p"
  done
done
for c in "" /breakfast /yogurts /breads /snacks /bars /sweets /drinks /cheese /meals /spreads; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s explore$c\n" "$B/explore$c?per_category=4"
  curl -s -o /dev/null "$B/explore$c?limit=48"
done
curl -s -o /dev/null "$B/explore?per_category=4"; curl -s -o /dev/null "$B/methodology"
