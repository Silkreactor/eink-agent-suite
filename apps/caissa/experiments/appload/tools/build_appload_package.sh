#!/bin/sh
set -eu

appload_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
source_dir="$appload_dir"
output_dir="$appload_dir/output"

if [ -n "${RCC_BIN:-}" ]; then
    rcc_bin=$RCC_BIN
elif command -v rcc >/dev/null 2>&1; then
    rcc_bin=$(command -v rcc)
elif command -v pyside6-rcc >/dev/null 2>&1; then
    rcc_bin=$(command -v pyside6-rcc)
else
    echo "Qt rcc was not found. Set RCC_BIN to an rcc or pyside6-rcc executable." >&2
    exit 1
fi

if [ ! -x "$rcc_bin" ]; then
    echo "RCC_BIN is not executable: $rcc_bin" >&2
    exit 1
fi

mkdir -p "$output_dir"
cp "$source_dir/manifest.json" "$output_dir/manifest.json"
cp "$source_dir/icon.png" "$output_dir/icon.png"

(
    cd "$source_dir"
    SOURCE_DATE_EPOCH=1 "$rcc_bin" --binary --format-version 2 --no-compress \
        -o "$output_dir/resources.rcc" application.qrc
)

echo "$output_dir"
