"""Run compiled application authentication on an owned synthetic PG18 fixture."""
from pathlib import Path
import os, json, shutil, subprocess, tempfile, signal

root = Path(__file__).resolve().parents[3]
app = root / 'integration'
output = root / 'evidence' / 'remaining' / 'local-auth'
output.mkdir(parents=True, exist_ok=True)
bin_dir = Path('/opt/homebrew/opt/postgresql@18/bin')
owned = Path(tempfile.mkdtemp(prefix='experthub-full-http-', dir='/tmp'))
(owned / 'socket').mkdir(mode=0o700)
env = {k: os.environ[k] for k in ['PATH', 'LANG', 'LC_ALL', 'TMPDIR'] if k in os.environ}
env.update(DOTENV_CONFIG_PATH='/dev/null', NEXT_TELEMETRY_DISABLED='1', EXP_REMAINING_OWNED_SYNTHETIC_CLUSTER='1')
env['DATABASE_URL'] = f'postgresql://integration_synthetic@localhost:55522/integration_full_http?host={owned}/socket'
env['DIRECT_URL'] = env['DATABASE_URL']
steps = []
success = False
cleanup = False

def run(command, label, timeout=180):
    if label == 'browser':
        process = subprocess.Popen(command, cwd=app, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            stdout, _ = process.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                stdout, _ = process.communicate(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                stdout, _ = process.communicate(timeout=10)
            (output / (label + '.log')).write_text(stdout)
            steps.append({'step': label, 'exit': 'timeout', 'ownedProcessGroupTerminated': True})
            raise RuntimeError('Owned browser process group timed out and was terminated')
        result = subprocess.CompletedProcess(command, process.returncode, stdout)
    else:
        result = subprocess.run(command, cwd=app, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
    (output / (label + '.log')).write_text(result.stdout)
    steps.append({'step': label, 'exit': result.returncode})
    print(label, result.returncode, flush=True)
    if result.returncode:
        raise RuntimeError(label + ' failed; inspect saved log')
    return result.stdout

try:
    run([str(bin_dir/'initdb'), '-D', str(owned/'data'), '-U', 'integration_synthetic', '--auth=trust', '--no-locale', '--encoding=UTF8'], 'init')
    run([str(bin_dir/'pg_ctl'), '-D', str(owned/'data'), '-l', str(owned/'postgres.log'), '-o', f'-h "" -p 55522 -k {owned}/socket -c timezone=UTC', '-w', 'start'], 'start')
    run([str(bin_dir/'createdb'), '-h', str(owned/'socket'), '-p', '55522', '-U', 'integration_synthetic', 'integration_full_http'], 'createdb')
    identity = run([str(bin_dir/'psql'), '-h', str(owned/'socket'), '-p', '55522', '-U', 'integration_synthetic', '-d', 'integration_full_http', '-At', '-c', "SELECT current_database() || '|' || current_user || '|' || COALESCE(inet_server_addr()::text,'PRIVATE_SOCKET') || '|' || (SELECT count(*) FROM information_schema.tables WHERE table_schema='public')"], 'identity')
    if identity.strip() != 'integration_full_http|integration_synthetic|PRIVATE_SOCKET|0':
        raise RuntimeError('Owned empty database identity mismatch')
    run(['node', 'node_modules/prisma/build/index.js', 'migrate', 'deploy'], 'migrations')
    run(['node', 'scripts/remaining-acceptance/local-auth-built.cjs'], 'browser', 240)
    success = True
finally:
    if (owned/'data'/'postmaster.pid').exists():
        try:
            run([str(bin_dir/'pg_ctl'), '-D', str(owned/'data'), '-m', 'fast', '-w', 'stop'], 'stop', 30)
            cleanup = True
        except Exception:
            cleanup = False
    else:
        cleanup = True
    if cleanup:
        shutil.rmtree(owned)
    (output/'result.json').write_text(json.dumps({'success': success and cleanup, 'steps': steps, 'ownedRuntime': str(owned), 'cleanup': cleanup, 'runtimeRemoved': not owned.exists(), 'database': 'integration_full_http', 'role': 'integration_synthetic', 'tcpListener': False, 'provider': 'no model/provider recomputation; real compiled Next/Auth.js/Prisma fixture', 'postgres': 'installed18; not PG16'}, indent=2))
    print('cleanup', cleanup, 'runtime removed', not owned.exists(), flush=True)
if not success or not cleanup:
    raise SystemExit(1)
