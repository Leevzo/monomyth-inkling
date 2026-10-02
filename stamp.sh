#!/bin/bash
# THE BUILD STAMP: run before every ship. Renews the one build number everywhere (index.html, crown.html, share.js,
# version.json), so each phone fetches every file fresh: the app sees the new number in version.json and opens it.
cd "$(dirname "$0")"
OLD=$(sed -E 's/.*"v":"([0-9]+)".*/\1/' version.json)
NEW=$(date +%s)
for f in index.html crown.html share.js read.html version.json; do perl -pi -e "s/\Q$OLD\E/$NEW/g" "$f"; done
echo "build $OLD -> $NEW"
