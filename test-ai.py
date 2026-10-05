#!/usr/bin/env python3
"""Test models on OpenRouter / OpenCode with the official `openrouter` Python SDK.

Two services are supported:
  - OpenRouter (openrouter.ai): key looks like sk-or-v1-... (from openrouter.ai/keys)
    * chat -> client.chat.send()      (POST /api/v1/chat/completions)
    * embeddings -> client.embeddings.generate()  (POST /api/v1/embeddings)
    * rerank -> client.rerank.rerank()  (POST /api/v1/rerank)
  - OpenCode Go (opencode.ai/zen/go/v1): your OpenCode sk-... key, chat only.
    Use --go with OPENCODE_API_KEY or --key.

Install first:  pip install openrouter

Usage (PowerShell):
    $env:OPENROUTER_API_KEY = "sk-or-v1-..."   # OpenRouter
    python .\test-ai.py                         # test all OpenRouter models

    $env:OPENCODE_API_KEY = "sk-..."           # OpenCode Go
    python .\test-ai.py --go                    # test all OpenCode Go models

    python .\test-ai.py --go --one glm-5.2      # single OpenCode Go model
    python .\test-ai.py --list bge             # search OpenRouter catalogs
"""

import json
import os
import sys
import urllib.request

try:
    from openrouter import OpenRouter
except ImportError:
    sys.exit("Missing dependency. Run:  pip install openrouter")

# OpenRouter models to test: (model_id, type). Change freely.
MODELS = [
    ("voyageai/rerank-3-lite", "rerank"),
    ("baai/bge-m3", "embeddings"),
    ("qwen/qwen3.8-27b:free", "chat"),
]

# OpenCode Go models (chat only). Change freely.
GO_MODELS = ["qwen3.8-flash", "glm-5.2", "kimi-k3"]
GO_BASE_URL = "https://opencode.ai/zen/go/v1"
GO_SESSION = "x-opencode-session"  # required header (any session id works)


def get_api_key(service):
    """Read the key from env var or --key, tolerating
    '-OPENROUTER_API_KEY=...' style arguments (a common PowerShell mistake)."""
    env_name = "OPENCODE_API_KEY" if service == "go" else "OPENROUTER_API_KEY"
    for arg in sys.argv[1:]:
        if arg.lower().startswith(("openrouter_api_key=", "-openrouter_api_key=")) and service != "go":
            # PowerShell passes '-OPENROUTER_API_KEY=sk-...' as one string
            return arg.split("=", 1)[1]
    args = sys.argv[1:]
    if "--key" in args:
        i = args.index("--key")
        if i + 1 < len(args):
            return args[i + 1]
        if args[i].startswith("--key="):
            return args[i].split("=", 1)[1]
    for arg in args:
        if arg.startswith("--key="):
            return arg.split("=", 1)[1]
        if arg.startswith("sk-"):
            return arg
    key = os.environ.get(env_name, "") or os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        hint = " --go" if service == "go" else ""
        sys.exit(
            f"Error: no API key.\n"
            f"PowerShell:  ${env_name} = \"sk-...\"\n"
            f"or:         python .\\test-ai.py --key sk-...{hint}"
        )
    return key


def run(model, mtype, key):
    print(f"\n=== {model} ({mtype}) ===")
    with OpenRouter(api_key=key) as client:
        try:
            if mtype == "chat":
                res = client.chat.send(
                    model=model,
                    messages=[{"role": "user", "content": "Reply with exactly: hello"}],
                    max_tokens=20,
                )
                reply = (res.choices[0].message.content or "").strip()
                print("  [OK] chat")
                print(f"  reply: {reply!r}")
                print(f"  usage: {res.usage.prompt_tokens} in / {res.usage.completion_tokens} out")

            elif mtype == "embeddings":
                res = client.embeddings.generate(
                    model=model,
                    input="The quick brown fox jumps over the lazy dog",
                )
                emb = res.data[0].embedding
                print("  [OK] embeddings")
                print(f"  dimensions: {len(emb)}")
                print(f"  first values: {[round(float(v), 4) for v in list(emb)[:5]]}")
                print(f"  usage: {res.usage}")

            elif mtype == "rerank":
                res = client.rerank.rerank(
                    model=model,
                    query="What is the capital of France?",
                    documents=[
                        "Paris is the capital of France.",
                        "Berlin is the capital of Germany.",
                        "Madrid is the capital of Spain.",
                    ],
                    top_n=2,
                )
                print("  [OK] rerank")
                for r in res.results:
                    print(f"  doc[{r.index}] score={r.relevance_score:.4f} "
                          f"text={r.document.text!r}")
                print(f"  usage: {res.usage}")
            else:
                print(f"  [FAIL] unknown type {mtype!r} (use chat/embeddings/rerank)")
        except Exception as e:
            print(f"  [FAIL] {type(e).__name__}: {e}")


def run_go(model, key):
    """Test a chat model on OpenCode Go (opencode.ai/zen/go/v1)."""
    print(f"\n=== {model} (OpenCode Go) ===")
    req = urllib.request.Request(
        GO_BASE_URL + "/chat/completions",
        data=json.dumps({
            "model": model,
            "messages": [{"role": "user", "content": "Reply with exactly: hello"}],
            "max_tokens": 20,
        }).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            # Required for routing; any session id works
            GO_SESSION: "test-ai-session",
            # opencode.ai sits behind Cloudflare, which blocks Python's
            # default User-Agent (HTTP 403 error 1010) - send a browser UA.
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            data = json.loads(res.read().decode())
        reply = (data["choices"][0]["message"].get("content") or "").strip()
        usage = data.get("usage", {})
        print("  [OK] chat")
        print(f"  reply: {reply!r}")
        print(f"  usage: {usage.get('prompt_tokens')} in / {usage.get('completion_tokens')} out")
    except urllib.error.HTTPError as e:
        print(f"  [FAIL] HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")
    except Exception as e:
        print(f"  [FAIL] {type(e).__name__}: {e}")


def list_models(query=""):
    """Search OpenRouter's chat/embeddings/rerank catalogs (no key needed)."""
    catalogs = [
        ("chat", "https://openrouter.ai/api/v1/models"),
        ("embeddings", "https://openrouter.ai/api/v1/embeddings/models"),
        ("rerank", "https://openrouter.ai/api/v1/models?output_modalities=rerank"),
    ]
    for name, url in catalogs:
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                data = json.loads(r.read().decode())["data"]
        except Exception as e:
            print(f"[{name}] failed: {e}")
            continue
        matches = [m["id"] for m in data if query.lower() in m["id"].lower()]
        if matches:
            print(f"[{name}]")
            for mid in matches:
                print(f"  {mid}")


def main():
    args = sys.argv[1:]
    go = "--go" in args
    args = [a for a in args if a != "--go"]

    if args and args[0] == "--list":
        list_models(args[1] if len(args) > 1 else "")
        return

    key = get_api_key("go" if go else "openrouter")

    if go:
        if args and args[0] == "--one":
            if len(args) < 2:
                sys.exit("Usage: python test-ai.py --go --one <model-id>")
            run_go(args[1], key)
            return
        print(f"OpenCode Go model tests (key: ...{key[-6:]})")
        for model in GO_MODELS:
            run_go(model, key)
        return

    if not key.startswith("sk-or"):
        print("Note: this key does not look like an OpenRouter key (sk-or-v1-...).")
        print("      For OpenCode Go testing, add --go\n")

    if args and args[0] == "--one":
        if len(args) < 3:
            sys.exit("Usage: python test-ai.py --one <model-id> <chat|embeddings|rerank>")
        run(args[1], args[2], key)
        return

    print(f"OpenRouter model tests (key: ...{key[-6:]})")
    for model, mtype in MODELS:
        run(model, mtype, key)


if __name__ == "__main__":
    main()
