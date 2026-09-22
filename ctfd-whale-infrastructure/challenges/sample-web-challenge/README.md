# Sample Dynamic Web Challenge (XploitX 2026)

This sample demonstrates how CTFd-Whale deploys isolated containers with **dynamic flags** adhering to the standard format: `XploitXβ{flag}`.

## How It Works
1. When a contestant clicks **"Launch Instance"**, CTFd-Whale assigns a random UUID and starts this container.
2. Whale injects the flag via the environment variable `FLAG="XploitXβ{uuid}"`.
3. The container's `/entrypoint.sh` writes the variable into `/flag`.
4. Competitors access their container URL and solve the challenge to extract the flag.

## Build and Register in CTFd
On your CTFd server:
```bash
# 1. Build the Docker image locally
docker build -t xploitx/sample-web:1.0 .

# 2. In CTFd Admin Panel:
# - Go to Challenges -> New Challenge
# - Type: dynamic_docker
# - Docker Image: xploitx/sample-web:1.0
# - Redirect Type: http
# - Target Port: 80
# - Flag: XploitXβ{{{uuid}}}
```
