#!/usr/bin/env bash
# Fetch GeneralUser GS (free for commercial music creation; see audio/sf/GeneralUser-GS-LICENSE.txt)
set -e; cd "$(dirname "$0")/../audio/sf"
[ -f GeneralUser-GS.sf2 ] && exit 0
tmp=$(mktemp -d); git clone -q --depth 1 https://github.com/mrbumpy409/GeneralUser-GS "$tmp/g" && cp "$tmp/g/GeneralUser-GS.sf2" . && rm -rf "$tmp"
