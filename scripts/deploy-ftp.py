#!/usr/bin/env python3
"""Deploy ce-mozambique via FTP (passive mode)."""

from __future__ import annotations

import json
import sys
import time
from ftplib import FTP, error_perm, error_temp
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CRED_PATH = PROJECT_ROOT / ".ftp-credentials.json"

EXCLUDE_PARTS = (
    ".git",
    ".github",
    ".ftp-credentials",
    ".ftp-credentials.json",
    "scripts/deploy-ftps.ps1",
    "scripts/deploy-ftp.py",
)


def should_exclude(rel: str) -> bool:
    if any(part in rel for part in EXCLUDE_PARTS):
        return True
    if rel.startswith("assets/") and not rel.startswith("assets/web/"):
        lower = rel.lower()
        if lower.endswith((".jpg", ".jpeg", ".png")):
            return True
    return False


def load_files() -> list[Path]:
    files: list[Path] = []
    for path in PROJECT_ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(PROJECT_ROOT).as_posix()
        if should_exclude(rel):
            continue
        files.append(path)
    return sorted(files, key=lambda p: p.relative_to(PROJECT_ROOT).as_posix())


def connect(cred: dict, attempts: int = 5) -> FTP:
    last_error: Exception | None = None
    server = cred["server"]
    port = int(cred.get("port", 21))
    for attempt in range(1, attempts + 1):
        try:
            ftp = FTP()
            ftp.connect(server, port, timeout=45)
            ftp.login(cred["username"], cred["password"])
            ftp.set_pasv(True)
            base = cred.get("remoteDir", "/").rstrip("/") or "/"
            if base != "/":
                ftp.cwd(base)
            return ftp
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(f"  connect retry {attempt}/{attempts}: {exc}")
            time.sleep(3 * attempt)
    raise RuntimeError(f"Could not connect to FTP server: {last_error}")


def go_to_root(ftp: FTP, cred: dict) -> None:
    ftp.cwd("/")
    base = cred.get("remoteDir", "/").rstrip("/") or "/"
    if base != "/":
        ftp.cwd(base)


def ensure_remote_dir(ftp: FTP, cred: dict, remote_dir: str) -> None:
    go_to_root(ftp, cred)
    for part in [p for p in remote_dir.split("/") if p]:
        try:
            ftp.cwd(part)
        except error_perm:
            ftp.mkd(part)
            ftp.cwd(part)


def upload_file(ftp: FTP, cred: dict, local_path: Path, remote_rel: str, attempts: int = 4) -> FTP:
    remote_dir = "/".join(remote_rel.split("/")[:-1])
    filename = remote_rel.split("/")[-1]
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            ensure_remote_dir(ftp, cred, remote_dir)
            with local_path.open("rb") as handle:
                ftp.storbinary(f"STOR {filename}", handle)
            return ftp
        except (error_temp, error_perm, OSError, EOFError, RuntimeError) as exc:
            last_error = exc
            print(f"    retry {attempt}/{attempts} for {remote_rel}: {exc}")
            time.sleep(2 * attempt)
            try:
                ftp.close()
            except Exception:
                pass
            ftp = connect(cred)

    raise RuntimeError(f"Upload failed for {remote_rel}: {last_error}")


def main() -> int:
    if not CRED_PATH.exists():
        print(f"Missing credentials file: {CRED_PATH}", file=sys.stderr)
        return 1

    cred = json.loads(CRED_PATH.read_text(encoding="utf-8"))
    files = load_files()
    print(f"Deploying {len(files)} files to ftp://{cred['server']}:{cred.get('port', 21)}/")

    ftp = connect(cred)
    uploaded = 0
    for local_path in files:
        rel = local_path.relative_to(PROJECT_ROOT).as_posix()
        ftp = upload_file(ftp, cred, local_path, rel)
        uploaded += 1
        print(f"  [{uploaded}/{len(files)}] {rel}")

    try:
        ftp.quit()
    except Exception:
        ftp.close()

    print(f"Deploy complete - {uploaded} files uploaded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())