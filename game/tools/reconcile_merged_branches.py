#!/usr/bin/env python3
"""Delete only fully merged game branches with a SHA lease and auditable receipt.

Dry-run by default. Does not force-update refs or delete open-PR/protected branches.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

class GithubAPI:
    def __init__(self, token, repository):
        if not token or not repository or repository.count("/") != 1:
            raise ValueError("GITHUB_TOKEN and owner/repository required")
        self.token, self.repository = token, repository

    def request(self, method, path):
        req = Request(
            "https://api.github.com/repos/" + self.repository + path,
            headers={
                "Authorization": "Bearer " + self.token,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "river-valley-merged-branch-auditor",
            },
            method=method,
        )
        try:
            with urlopen(req, timeout=25) as response:
                contents = response.read(10_000_000)
                return json.loads(contents) if contents else None
        except HTTPError as exc:
            detail = exc.read(2048).decode("utf-8", "replace")
            raise RuntimeError(f"GitHub API HTTP {exc.code} {method} {path}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"GitHub API unreachable {method} {path}: {exc}") from exc

    def get(self, path):
        return self.request("GET", path)

    def delete(self, path):
        return self.request("DELETE", path)

def paged(api, route):
    rows = []
    for page in range(1, 30):
        separator = "&" if "?" in route else "?"
        batch = api.get(f"{route}{separator}per_page=100&page={page}")
        if not isinstance(batch, list):
            raise RuntimeError(f"Unexpected paginated API response for {route}")
        rows.extend(batch)
        if len(batch) < 100:
            return rows
    raise RuntimeError("GitHub listing exceeded safe pagination bound")

def reconcile(api, apply=False, max_delete=100):
    meta = api.get("")
    default = meta.get("default_branch")
    if default != "main":
        raise RuntimeError(f"Expected main as default branch, received {default!r}")
    main_sha = api.get("/branches/main")["commit"]["sha"]
    reserved = {"main"}
    for pr in paged(api, "/pulls?state=open"):
        if pr.get("head", {}).get("repo", {}).get("full_name") == api.repository:
            reserved.add(pr["head"].get("ref"))
        reserved.add(pr.get("base", {}).get("ref"))
    branches = paged(api, "/branches")
    results, deleted = [], 0
    for branch in branches:
        name = branch["name"]
        row = {"name": name, "branch_sha": branch.get("commit", {}).get("sha"),
               "protected": bool(branch.get("protected", False))}
        try:
            if name in reserved:
                row["status"] = "RESERVED_OR_OPEN_PR"
            elif row["protected"]:
                row["status"] = "PROTECTED"
            else:
                compare = api.get("/compare/main..." + quote(name, safe=""))
                row["ahead_by"] = compare.get("ahead_by")
                row["behind_by"] = compare.get("behind_by")
                if not isinstance(row["ahead_by"], int):
                    row["status"] = "COMPARE_UNAVAILABLE"
                elif row["ahead_by"] != 0:
                    row["status"] = "UNMERGED_UNIQUE_COMMITS"
                elif compare.get("base_commit", {}).get("sha") != main_sha:
                    row["status"] = "MAIN_MOVED"
                else:
                    current = api.get("/branches/" + quote(name, safe=""))
                    if current.get("commit", {}).get("sha") != row["branch_sha"]:
                        row["status"] = "BRANCH_MOVED"
                    elif current.get("protected"):
                        row["status"] = "BECAME_PROTECTED"
                    elif deleted >= max_delete:
                        row["status"] = "DELETE_LIMIT"
                    elif not apply:
                        row["status"] = "SAFE_TO_DELETE_DRY_RUN"
                    else:
                        api.delete("/git/refs/heads/" + quote(name, safe="/"))
                        row["status"] = "DELETED_VERIFIED_MERGED"
                        deleted += 1
        except (KeyError, ValueError, RuntimeError) as exc:
            row["status"] = "API_ERROR"
            row["error"] = str(exc)
        results.append(row)
    return {
        "repository": api.repository, "default_branch": default,
        "main_sha": main_sha, "mode": "APPLY" if apply else "DRY_RUN",
        "inspected": len(results), "deleted": deleted,
        "error_count": sum(r["status"] == "API_ERROR" for r in results),
        "retained_unmerged": sum(r["status"] == "UNMERGED_UNIQUE_COMMITS" for r in results),
        "branches": results,
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", default=os.getenv("GITHUB_REPOSITORY", ""))
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--max-delete", type=int, default=100)
    parser.add_argument("--report", type=Path, default=Path("/tmp/river-game-branch-cleanup.json"))
    args = parser.parse_args()
    if not 1 <= args.max_delete <= 200:
        parser.error("--max-delete must be 1..200")
    report = reconcile(GithubAPI(os.getenv("GITHUB_TOKEN", ""), args.repository),
                       apply=args.apply, max_delete=args.max_delete)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "branches"}, indent=2))
    for row in report["branches"]:
        print(row["status"].ljust(30), row["name"])
    if report["error_count"]:
        raise SystemExit(f"{report['error_count']} GitHub API errors; review the audit")

if __name__ == "__main__":
    main()
