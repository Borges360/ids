"""Real POSIX PTY qualification for the standalone reference, without native npm addons."""
import errno
import fcntl
import hashlib
import json
import os
import pathlib
import pty
import select
import shutil
import signal
import struct
import subprocess
import sys
import tempfile
import termios
import time

root = pathlib.Path(__file__).resolve().parent.parent
node = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else shutil.which("node")
artifacts = root / "artifacts" / "terminal"
artifacts.mkdir(parents=True, exist_ok=True)
results = []
with tempfile.TemporaryDirectory(prefix="inteiro-terminal-") as temporary:
    for columns, rows in [(40, 12), (80, 24), (120, 36)]:
        config = pathlib.Path(temporary) / f"{columns}.json"
        pid, fd = pty.fork()
        if pid == 0:
            os.chdir(root)
            env = dict(os.environ, TERM="xterm-256color", NO_COLOR="1")
            env.pop("CI", None)
            code = "const {main}=await import('./examples/terminal/standalone.ts');const exit=await main(process.argv.slice(1));console.log('__TERMINAL_STATE__'+JSON.stringify({raw:!!process.stdin.isRaw,exit}));process.exitCode=exit;"
            os.execve(node, [node, "--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--input-type=module", "-e", code, "--", "--config", str(config), "--ascii"], env)
        output = bytearray()
        def resize(cols, height):
            fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", height, cols, 0, 0))
        def wait(text, start=0):
            deadline = time.monotonic() + 15
            while text.encode() not in output[start:]:
                if time.monotonic() > deadline:
                    raise RuntimeError(f"Timeout {columns}: {text}\n{output[-1800:].decode(errors='replace')}")
                readable, _, _ = select.select([fd], [], [], 0.1)
                if readable:
                    try:
                        chunk = os.read(fd, 65536)
                    except OSError as error:
                        if error.errno == errno.EIO:
                            raise RuntimeError("Child exited before " + text)
                        raise
                    if not chunk:
                        raise RuntimeError("EOF before " + text)
                    output.extend(chunk)
        def send(data, text):
            start = len(output)
            os.write(fd, data.encode())
            wait(text, start)
        try:
            resize(columns, rows)
            wait("Configurações")
            send("\x1b[B\x1b[B\r", "? Limite de tarefas")
            resize(120, 36)
            resize(columns, rows)
            send("\x15" + "5\r", "? Configurações")
            send("\x1b[B" * 3 + "\r", "Alterações salvas")
            send("\x1b[B" * 6 + "\r", "__TERMINAL_STATE__")
            wait('"raw":false')
            _, status = os.waitpid(pid, 0)
            assert os.waitstatus_to_exitcode(status) == 0
            assert json.loads(config.read_text())["limit"] == 5
            artifact = f"linux-{columns}x{rows}.txt"
            (artifacts / artifact).write_bytes(output)
            results.append(dict(status="passed", columns=columns, rows=rows, artifact=artifact, sha256=hashlib.sha256(output).hexdigest()))
            print(f"PASS Linux POSIX PTY {columns}x{rows}: edit/save/resize/close/raw cleanup", flush=True)
        finally:
            try:
                os.kill(pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            os.close(fd)
stamp = json.loads(subprocess.check_output([node, "--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--input-type=module", "-e", "import {terminalSource} from './scripts/terminal-evidence.mjs';console.log(JSON.stringify(await terminalSource()))"], cwd=root, text=True))
(artifacts / "linux-smoke.json").write_text(json.dumps(dict(**stamp, platform="linux", terminal="POSIX PTY under WSL Ubuntu", renderer="Inquirer 7.10.1", node=subprocess.check_output([node, "--version"], text=True).strip(), results=results, notes="Real PTY automation; no screen-reader or qualitative approval"), indent=2) + "\n")
