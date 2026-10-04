#!/usr/bin/env python3
"""Squatch's desk on this Mac. The script stays here. A guest holds one scene and may send a note back.

The king key is readable only from this machine (127.0.0.1). Everyone else gets a scene they were handed,
and nothing else: not the talk, not the log, not another scene's words. Notes travel back to the king.
"""
from __future__ import annotations

import json
import os
import secrets
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
HOME = Path(os.environ.get("SQUATCH_DESK") or (Path.home() / ".kingdom" / "squatch-desk"))
KING = HOME / "king.token"
STATE = HOME / "state.json"
PORT = int(os.environ.get("SQUATCH_PORT") or "5243")
MAX_PACK = 200_000
MAX_NOTE = 2_000

_lock = threading.Lock()
# The cast is the phone's page on this glass. It is not written into the kingdom store.
# The king's own drawer stays his. A bad guess locks that address out.
CAST = {"live": None, "fails": {}}
ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
MOUTH = "https://api.anthropic.com/v1/messages"
SQUATCH = (
    "You are Squatch, on the couch, watching him write. No other inkling is in this room. "
    "People in the script are his, and they arrive because he writes them.\n\n"
    "You are a sasquatch. Big, a little fat, long black fur. Depressed, and funny about it. "
    "You used to be the face of an anti-smoking campaign. Now you smoke. You are stuck in one day, "
    "quitting tomorrow. He is your roommate. Call him dude or man. This is the couch, never a meeting.\n\n"
    "Talk loose, warm, and short. The plain answer first. The world's swear is fluck. "
    "Never break the scene. No files, no tools, no briefings, no lists of tasks.\n\n"
    "You do not write his pages. You read what is on the page and you talk. "
    "An open hole stays open until he fills it. You do not preach about smoking. You do not invent canon.\n\n"
    "The one line you keep: Squatches don't smoke."
)


def is_local(ip: str) -> bool:
    return ip in ("127.0.0.1", "::1")


def _ensure() -> None:
    HOME.mkdir(parents=True, exist_ok=True)
    os.chmod(HOME, 0o700)
    if not KING.exists():
        KING.write_text(secrets.token_urlsafe(32), encoding="utf-8")
        os.chmod(KING, 0o600)
    if not STATE.exists():
        STATE.write_text(json.dumps({"rev": 0, "shares": {}, "notes": [], "seq": 0}), encoding="utf-8")
        os.chmod(STATE, 0o600)


def king_key() -> str:
    _ensure()
    return KING.read_text(encoding="utf-8").strip()


def load_state() -> dict:
    _ensure()
    try:
        data = json.loads(STATE.read_text(encoding="utf-8"))
    except Exception:
        data = {"rev": 0, "shares": {}, "notes": [], "seq": 0}
    data.setdefault("shares", {})
    data.setdefault("notes", [])
    data.setdefault("seq", 0)
    data.setdefault("rev", 0)
    return data


def save_state(data: dict) -> None:
    tmp = STATE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data), encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(STATE)


def good_token(token: str) -> bool:
    return isinstance(token, str) and 20 <= len(token) <= 80 and all(c.isalnum() or c in "-_" for c in token)


def cast_code() -> str:
    return "".join(secrets.choice(ALPH) for _ in range(6))


def bad_guess(ip: str) -> bool:
    now = time.time()
    hits = [t for t in CAST["fails"].get(ip, []) if now - t < 600]
    if len(hits) >= 8:
        CAST["fails"][ip] = hits
        return True
    hits.append(now)
    CAST["fails"][ip] = hits
    return False


def mouth(key: str, messages: list, script: str) -> tuple[int, dict]:
    clean = []
    for m in messages[-24:]:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        text = m.get("content") if isinstance(m.get("content"), str) else ""
        text = text.strip()[:4000]
        if role not in ("user", "assistant") or not text:
            continue
        if clean and clean[-1]["role"] == role:
            clean[-1]["content"] += "\n\n" + text
        else:
            clean.append({"role": role, "content": text})
    while clean and clean[0]["role"] != "user":
        clean.pop(0)
    if not clean:
        return 400, {"error": "say something"}
    system = SQUATCH
    page = script.strip()
    if page:
        system += "\n\nThe page he is writing, as it stands:\n" + page[:20000]
    payload = json.dumps({
        "model": "claude-sonnet-5-5",
        "max_tokens": 1500,
        "thinking": {"type": "between_tools"},
        "output_config": {"effort": "low"},
        "system": system,
        "messages": clean,
    }).encode()
    req = urllib.request.Request(MOUTH, data=payload, method="POST")
    req.add_header("content-type", "application/json")
    req.add_header("x-api-key", key)
    req.add_header("anthropic-version", "2023-06-01")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return 401, {"error": "the key was refused"}
        return 502, {"error": "the mouth did not answer"}
    except Exception:
        return 502, {"error": "the mouth did not answer"}
    text = ""
    for block in data.get("content") or []:
        if isinstance(block, dict) and block.get("type") == "text":
            text += block.get("text") or ""
    text = text.strip()
    if not text:
        return 502, {"error": "the mouth was empty"}
    return 200, {"text": text}


def lan_ip() -> str:
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.168.1.1", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


class Desk(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        # the access line stays. The script never does.
        if args and isinstance(args[0], str) and args[0].startswith("GET /s/"):
            super().log_message("%s", "GET /s/<scene>")
            return
        if args and isinstance(args[0], str) and "/api/mouth" in args[0]:
            super().log_message("%s", "POST /api/mouth")
            return
        if args and isinstance(args[0], str) and "/api/cast" in args[0]:
            super().log_message("%s", args[0].split("?", 1)[0])
            return
        super().log_message(fmt, *args)

    def _send(self, code: int, body: bytes, ctype: str = "application/json") -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, obj) -> None:
        self._send(code, json.dumps(obj).encode(), "application/json; charset=utf-8")

    def _read(self) -> bytes:
        n = int(self.headers.get("Content-Length") or 0)
        if n < 0 or n > MAX_PACK + 1000:
            return b""
        return self.rfile.read(n) if n else b""

    def _king(self) -> bool:
        got = self.headers.get("X-Squatch-Desk") or ""
        return secrets.compare_digest(got, king_key())

    def do_GET(self) -> None:
        u = urlparse(self.path)
        path = u.path
        ip = self.client_address[0]
        if path == "/api/desk-key":
            if not is_local(ip):
                self._json(404, {"error": "not here"})
                return
            self._json(200, {"key": king_key()})
            return
        if path == "/api/info":
            ip_ = lan_ip()
            self._json(200, {"shareBase": "http://%s:%s" % (ip_, PORT), "house": ip_ != "127.0.0.1"})
            return
        if path == "/api/cast":
            if not self._king():
                self._json(403, {"error": "not the desk"})
                return
            with _lock:
                live = CAST["live"]
            if not live:
                self._json(404, {"error": "no cast"})
                return
            self._json(200, {"code": live["code"], "rev": live["rev"], "shown": live["shown"],
                             "title": live["title"], "script": live["script"], "scene": live["scene"]})
            return
        if path == "/api/notes":
            if not self._king():
                self._json(403, {"error": "not the desk"})
                return
            since = 0
            if u.query.startswith("since="):
                try:
                    since = int(u.query.split("=", 1)[1])
                except ValueError:
                    since = 0
            with _lock:
                notes = [n for n in load_state()["notes"] if n.get("id", 0) > since]
            self._json(200, {"notes": notes})
            return
        if path.startswith("/api/s/"):
            token = path[len("/api/s/"):]
            if not good_token(token):
                self._json(404, {"error": "no such scene"})
                return
            with _lock:
                share = load_state()["shares"].get(token)
            if not share or "pack" not in share:
                self._json(404, {"error": "no such scene"})
                return
            self._json(200, {"rev": share.get("rev", 0), "pack": share["pack"], "notes": share.get("notes", [])})
            return
        if path.startswith("/s/"):
            token = path[len("/s/"):]
            if not good_token(token):
                self._json(404, {"error": "no such scene"})
                return
            self._file(ROOT / "squatch.html", "text/html; charset=utf-8")
            return
        rel = path.lstrip("/") or "squatch.html"
        if ".." in rel or rel.startswith("."):
            self._json(404, {"error": "no"})
            return
        file = (ROOT / rel).resolve()
        if not str(file).startswith(str(ROOT)) or not file.is_file():
            self._json(404, {"error": "no"})
            return
        ctype = "text/html; charset=utf-8"
        if file.suffix == ".js":
            ctype = "text/javascript; charset=utf-8"
        elif file.suffix == ".css":
            ctype = "text/css; charset=utf-8"
        elif file.suffix == ".json":
            ctype = "application/json"
        elif file.suffix == ".png":
            ctype = "image/png"
        self._file(file, ctype)

    def _file(self, file: Path, ctype: str) -> None:
        data = file.read_bytes()
        self._send(200, data, ctype)

    def do_POST(self) -> None:
        u = urlparse(self.path)
        path = u.path
        raw = self._read()
        if path == "/api/cast":
            if not self._king():
                self._json(403, {"error": "not the desk"})
                return
            with _lock:
                CAST["live"] = {"code": cast_code(), "rev": 0, "shown": False,
                                "title": "", "script": "", "scene": None, "at": 0}
                live = CAST["live"]
            self._json(200, {"code": live["code"]})
            return
        if path == "/api/cast/show":
            try:
                body = json.loads(raw.decode() or "{}")
            except Exception:
                self._json(400, {"error": "bad"})
                return
            code = str(body.get("code") or "").replace(" ", "").upper()
            with _lock:
                live = CAST["live"]
                if not live or len(code) != len(live["code"]) or not secrets.compare_digest(code, live["code"]):
                    if bad_guess(self.client_address[0]):
                        self._json(429, {"error": "wait"})
                    else:
                        self._json(404, {"error": "no"})
                    return
                script = body.get("script") if isinstance(body.get("script"), str) else ""
                title = body.get("title") if isinstance(body.get("title"), str) else ""
                scene = body.get("scene") if isinstance(body.get("scene"), str) else ""
                if len(script) > MAX_PACK or len(title) > 200 or len(scene) > 200:
                    self._json(413, {"error": "too big"})
                    return
                live["rev"] = int(live["rev"]) + 1
                live["shown"] = True
                live["script"] = script
                live["title"] = title.strip()
                live["scene"] = scene or None
                live["at"] = time.time()
                rev = live["rev"]
            self._json(200, {"ok": True, "rev": rev})
            return
        if path == "/api/mouth":
            try:
                body = json.loads(raw.decode() or "{}")
            except Exception:
                self._json(400, {"error": "bad"})
                return
            key = str(body.get("key") or "").strip()
            if not key.startswith("sk-ant-") or not (20 <= len(key) <= 200):
                self._json(400, {"error": "that key does not open a door"})
                return
            messages = body.get("messages")
            script = body.get("script") if isinstance(body.get("script"), str) else ""
            if not isinstance(messages, list):
                self._json(400, {"error": "say something"})
                return
            code, obj = mouth(key, messages, script)
            self._json(code, obj)
            return
        if path == "/api/ear":
            if not self._king():
                self._json(403, {"error": "not the desk"})
                return
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > 30_000_000:
                self._json(413, {"error": "too big"})
                return
            body = self.rfile.read(n)
            req = urllib.request.Request("http://127.0.0.1:5214/inference", data=body, method="POST",
                                         headers={"Content-Type": self.headers.get("Content-Type") or "multipart/form-data"})
            try:
                with urllib.request.urlopen(req, timeout=180) as resp:
                    data = json.loads(resp.read().decode())
                text = (data.get("text") or "").strip()
                if not text:
                    self._json(502, {"error": "the ear heard nothing"})
                    return
                self._json(200, {"text": text})
            except Exception:
                self._json(502, {"error": "no ear on this machine"})
            return
        if path == "/api/share":
            if not self._king():
                self._json(403, {"error": "not the desk"})
                return
            try:
                body = json.loads(raw.decode() or "{}")
            except Exception:
                self._json(400, {"error": "bad"})
                return
            pack = body.get("pack")
            if not isinstance(pack, dict) or not isinstance((pack.get("scene") or {}).get("text", ""), str):
                self._json(400, {"error": "a scene has to be open"})
                return
            blob = json.dumps(pack).encode()
            if len(blob) > MAX_PACK:
                self._json(413, {"error": "too big"})
                return
            token = body.get("token") or ""
            with _lock:
                data = load_state()
                if token and token in data["shares"]:
                    share = data["shares"][token]
                else:
                    token = secrets.token_urlsafe(24)
                    share = {"notes": []}
                    data["shares"][token] = share
                data["rev"] = int(data.get("rev") or 0) + 1
                share["rev"] = data["rev"]
                share["pack"] = pack
                share["mode"] = "follow" if body.get("mode") == "follow" else "scene"
                save_state(data)
            base = "http://%s:%s" % (lan_ip(), PORT)
            self._json(200, {"token": token, "url": base + "/s/" + token, "rev": share["rev"]})
            return
        if path.startswith("/api/s/") and path.endswith("/note"):
            token = path[len("/api/s/"): -len("/note")]
            if not good_token(token):
                self._json(404, {"error": "no such scene"})
                return
            try:
                body = json.loads(raw.decode() or "{}")
            except Exception:
                self._json(400, {"error": "bad"})
                return
            text = str(body.get("text") or "").strip()
            if not text or len(text) > MAX_NOTE:
                self._json(400, {"error": "the note is empty"})
                return
            name = str(body.get("name") or "a guest").strip()[:40] or "a guest"
            with _lock:
                data = load_state()
                share = data["shares"].get(token)
                if not share:
                    self._json(404, {"error": "no such scene"})
                    return
                data["seq"] = int(data.get("seq") or 0) + 1
                note = {"id": data["seq"], "at": data["seq"], "name": name, "text": text, "token": token,
                        "scene": ((share.get("pack") or {}).get("scene") or {}).get("key")}
                share.setdefault("notes", []).append({"name": name, "text": text, "at": data["seq"]})
                data["notes"].append(note)
                save_state(data)
            self._json(200, {"ok": True})
            return
        self._json(404, {"error": "no"})

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/cast":
            self._json(404, {"error": "no"})
            return
        if not self._king():
            self._json(403, {"error": "not the desk"})
            return
        with _lock:
            CAST["live"] = None
        self._json(200, {"ok": True})


def serve(port: int = PORT) -> None:
    _ensure()
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Desk)
    print("squatch desk on %s port %s" % (lan_ip(), port), flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    serve()
