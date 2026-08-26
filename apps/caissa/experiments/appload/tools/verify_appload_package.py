#!/usr/bin/env python3
"""Verify the generated Caissa AppLoad package and its Qt resource tree."""

from __future__ import annotations

import json
import pathlib
import struct
import sys


APPLOAD_DIR = pathlib.Path(__file__).resolve().parents[1]
PACKAGE = APPLOAD_DIR / "output"
SOURCE_QML = APPLOAD_DIR / "ui" / "Caissa.qml"


def u16(data: bytes, offset: int) -> int:
    return struct.unpack_from(">H", data, offset)[0]


def u32(data: bytes, offset: int) -> int:
    return struct.unpack_from(">I", data, offset)[0]


def decode_name(data: bytes, names_offset: int, relative_offset: int) -> str:
    start = names_offset + relative_offset
    length = u16(data, start)
    start += 6  # 16-bit length and 32-bit Qt hash
    return data[start : start + length * 2].decode("utf-16-be")


def parse_entry(data: bytes, tree_offset: int, version: int, index: int) -> dict[str, int]:
    entry_size = 22 if version >= 2 else 14
    start = tree_offset + index * entry_size
    name_offset = u32(data, start)
    flags = u16(data, start + 4)
    if flags & 0x02:
        return {
            "name_offset": name_offset,
            "flags": flags,
            "child_count": u32(data, start + 6),
            "child_offset": u32(data, start + 10),
        }
    return {
        "name_offset": name_offset,
        "flags": flags,
        "territory": u16(data, start + 6),
        "language": u16(data, start + 8),
        "data_offset": u32(data, start + 10),
    }


def main() -> None:
    required = {"manifest.json", "icon.png", "resources.rcc"}
    actual = {path.name for path in PACKAGE.iterdir() if path.is_file()}
    if actual != required:
        raise AssertionError(f"package files differ: expected {required}, found {actual}")

    manifest = json.loads((PACKAGE / "manifest.json").read_text(encoding="utf-8"))
    expected_manifest = {
        "name": "Caissa Test",
        "loadsBackend": False,
        "entry": "/ui/Caissa.qml",
        "id": "caissa-device-test-v0",
        "supportsScaling": True,
        "canHaveMultipleFrontends": False,
    }
    if manifest != expected_manifest:
        raise AssertionError(f"unexpected manifest: {manifest!r}")

    icon = (PACKAGE / "icon.png").read_bytes()
    if not icon.startswith(b"\x89PNG\r\n\x1a\n"):
        raise AssertionError("icon.png is not a PNG")
    if u32(icon, 16) != 256 or u32(icon, 20) != 256:
        raise AssertionError("icon.png is not 256 by 256 pixels")

    rcc = (PACKAGE / "resources.rcc").read_bytes()
    if rcc[:4] != b"qres":
        raise AssertionError("resources.rcc has no qres header")
    version = u32(rcc, 4)
    tree_offset = u32(rcc, 8)
    data_offset = u32(rcc, 12)
    names_offset = u32(rcc, 16)
    if version not in (1, 2, 3):
        raise AssertionError(f"unsupported Qt resource version {version}")
    if not all(20 <= offset < len(rcc) for offset in (tree_offset, data_offset, names_offset)):
        raise AssertionError("resource section offset is outside resources.rcc")

    root = parse_entry(rcc, tree_offset, version, 0)
    if not root["flags"] & 0x02 or root["child_count"] != 1:
        raise AssertionError("resource root is not a one-child directory")
    ui = parse_entry(rcc, tree_offset, version, root["child_offset"])
    if decode_name(rcc, names_offset, ui["name_offset"]) != "ui":
        raise AssertionError("resource tree does not contain /ui")
    if not ui["flags"] & 0x02 or ui["child_count"] != 1:
        raise AssertionError("/ui is not a one-child directory")
    qml = parse_entry(rcc, tree_offset, version, ui["child_offset"])
    if decode_name(rcc, names_offset, qml["name_offset"]) != "Caissa.qml":
        raise AssertionError("resource tree does not contain /ui/Caissa.qml")
    if qml["flags"] != 0:
        raise AssertionError("QML resource is unexpectedly compressed or marked as a directory")

    payload_start = data_offset + qml["data_offset"]
    payload_size = u32(rcc, payload_start)
    payload = rcc[payload_start + 4 : payload_start + 4 + payload_size]
    if payload != SOURCE_QML.read_bytes():
        raise AssertionError("compiled QML payload differs from source")

    source = payload.decode("utf-8")
    required_contract = (
        "signal close",
        "function unloading()",
        "function handleSquareTap(square)",
        'square === "e2"',
        'square === "e4"',
        "function resetPosition()",
    )
    missing = [text for text in required_contract if text not in source]
    if missing:
        raise AssertionError(f"QML interaction contract is incomplete: {missing}")

    print(
        "PASS: AppLoad manifest, 256x256 icon, Qt resource header/tree, "
        "embedded QML bytes, lifecycle, e2/e4 interaction, and reset contract"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise
