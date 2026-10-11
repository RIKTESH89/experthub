"""Bounded anonymous GET checks; no cookies, provider exchange, redirect following or writes."""
import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ORIGIN = "https://stgtesting.experthub.co.in"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect())
cases = [
    ("/api/auth/session", 200),
    ("/api/experts?limit=1", 401),
    ("/api/chat/sessions", 401),
    ("/api/expert/corrections", 401),
    ("/api/expert/corrections/context", 401),
    ("/expert/reviews", 307),
    ("/subscriber/feed", 307),
]
checks = []
for route, expected in cases:
    try:
        response = opener.open(urllib.request.Request(ORIGIN + route, headers={"User-Agent": "ExpertHub-bounded-readonly-acceptance/20261011"}), timeout=25)
    except urllib.error.HTTPError as error:
        response = error
    item = {"path": route, "status": response.code, "expected": expected, "pass": response.code == expected}
    if route == "/api/auth/session":
        item["anonymousSessionIsNull"] = json.loads(response.read(10000)) is None
        item["cacheControl"] = response.headers.get("cache-control")
        item["pass"] &= item["anonymousSessionIsNull"] and "no-store" in (item["cacheControl"] or "")
    if expected == 307:
        target = urllib.parse.urlparse(response.headers.get("location", ""))
        item["redirectPath"] = target.path
        item["redirectHost"] = target.hostname
        item["pass"] &= target.path == "/login" and target.hostname in (None, "stgtesting.experthub.co.in")
    response.close()
    checks.append(item)
report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "candidate": "43b784a4e71fc985ae178e1d7ab764f0ff4a85d1", "mode": "anonymous read-only HTTPS guards", "authenticatedJourneys": "NOT RUN", "providerExchanges": 0, "databaseMutation": False, "checks": checks, "pass": all(item["pass"] for item in checks)}
Path(__file__).with_name("read-only-guards.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
raise SystemExit(0 if report["pass"] else 1)
