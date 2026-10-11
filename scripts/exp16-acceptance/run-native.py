"""Owned native fixture only. --full-schema applies all18standard migrations to a NEW local DB."""
from pathlib import Path
import os, subprocess, tempfile, shutil, sys

full_schema = sys.argv[1:] == ['--full-schema']
if sys.argv[1:] and not full_schema:
    raise SystemExit('Only --full-schema is supported')
app = Path(__file__).resolve().parents[2]
bin_dir = Path('/opt/homebrew/opt/postgresql@18/bin')
if not all((bin_dir / name).is_file() for name in ['initdb', 'pg_ctl', 'createdb']):
    raise SystemExit('Native SQL gate unrun: existing PostgreSQL binaries unavailable; no install attempted.')
owned = Path(tempfile.mkdtemp(prefix='exp16-replay-fixture-', dir='/tmp'))
(owned/'socket').mkdir()
port = 55513 if full_schema else 55510
env = {key: os.environ[key] for key in ['PATH', 'LANG', 'LC_ALL', 'TMPDIR'] if key in os.environ}
env['DOTENV_CONFIG_PATH'] = '/dev/null'
env['EXP16_ENABLE_V2_WRITES'] = '1'
if full_schema:
    env['EXP16_NATIVE_FULL_SCHEMA'] = '1'
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
    if full_schema:
        if run(['node', 'node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', 'scripts/exp16-acceptance/full-schema.config.ts']):
            raise RuntimeError('Owned full-schema migration failed; tests not run')
        pattern = '|'.join(['native v2 rollback', 'native release head CAS', 'native legacy rollback', 'native equal-config rollback', 'native new-release approval', 'native gated writer', 'native store rejects', 'native approved correction', 'native EOF-to-persistence', 'native persistence holds', 'native answer/update', 'native rollback refuses', 'native paid expiry', 'native owner deletion', 'native anonymous widget', 'native widget persistence', 'native widget usage', 'native subscription expiring'])
        exit_code = run(['node_modules/.bin/jest', '--config', 'scripts/exp16-replay/jest.config.cjs', '--runInBand', '--testNamePattern', pattern, '--json', '--outputFile', 'audit/exp16-acceptance-20261011/full-schema-jest.json'])
    else:
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
    (app/('audit/exp16-acceptance-20261011/full-schema-native-validation.log' if full_schema else 'audit/exp16-acceptance-20261011/native-validation.log')).write_text('\n'.join(log)+'\n')
raise SystemExit(exit_code)
