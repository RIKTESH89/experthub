"""Existing installed PostgreSQL only; own disposable fixture, no app migrations/live DB."""
from pathlib import Path
import os, subprocess, tempfile, shutil

app = Path(__file__).resolve().parents[4] / 'exp-16'
bin_dir = Path('/opt/homebrew/opt/postgresql@18/bin')
if not all((bin_dir / name).is_file() for name in ['initdb', 'pg_ctl', 'createdb']):
    raise SystemExit('Native SQL gate unrun: existing PostgreSQL binaries unavailable; no install attempted.')
owned = Path(tempfile.mkdtemp(prefix='exp16-replay-fixture-', dir='/tmp'))
(owned/'socket').mkdir()
port = 55510
env = {key: os.environ[key] for key in ['PATH', 'LANG', 'LC_ALL', 'TMPDIR'] if key in os.environ}
env['DOTENV_CONFIG_PATH'] = '/dev/null'
env['EXP16_ENABLE_V2_WRITES'] = '1'
env.update(DATABASE_URL=f'postgresql://exp16_fixture@localhost:{port}/exp16_replay_fixture?host={owned}/socket', EXP16_OWNED_SYNTHETIC_CLUSTER='1')
env['DIRECT_URL'] = env['DATABASE_URL']
started = False
log = []
exit_code = 1
def run(command):
    result = subprocess.run(command, cwd=app, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    log.append('$ ' + ' '.join(map(str, command)) + '\n' + result.stdout + '\nexit=' + str(result.returncode))
    print(result.stdout, flush=True)
    return result.returncode
try:
    if run([str(bin_dir/'initdb'), '-D', str(owned/'data'), '-U', 'exp16_fixture', '--auth=trust', '--no-locale', '--encoding=UTF8']):
        log.append('Native SQL gate UNRUN: fixture initialization failed; no server started.')
        raise RuntimeError('Disposable fixture initialization failed')
    if run([str(bin_dir/'pg_ctl'), '-D', str(owned/'data'), '-l', str(owned/'postgres.log'), '-o', f'-h \"\" -p {port} -k {owned}/socket', '-w', 'start']):
        raise RuntimeError('Disposable fixture startup failed')
    started = True
    if run([str(bin_dir/'createdb'), '-h', str(owned/'socket'), '-p', str(port), '-U', 'exp16_fixture', 'exp16_replay_fixture']):
        raise RuntimeError('Synthetic database creation failed')
    exit_code = run(['node_modules/.bin/jest', '--config', 'scripts/exp16-replay/jest.config.cjs', '--runInBand'])
finally:
    if started:
        stopped = run([str(bin_dir/'pg_ctl'), '-D', str(owned/'data'), '-m', 'fast', '-w', 'stop']) == 0
        if stopped:
            shutil.rmtree(owned)
            log.append("Owned server stopped and runtime removed: " + str(owned))
        else:
            exit_code = 1
            log.append('Cleanup blocked: owned runtime retained at ' + str(owned))
    else:
        shutil.rmtree(owned)
    Path(__file__).with_name('native-review.log').write_text('\n'.join(log)+'\n')
raise SystemExit(exit_code)
