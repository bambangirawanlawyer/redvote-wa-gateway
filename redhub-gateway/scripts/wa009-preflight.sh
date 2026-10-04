#!/usr/bin/env sh
set -eu

echo "WA009_PREFLIGHT_START"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run preflight as root"
  exit 2
fi

echo "HOSTNAME=$(hostname)"
echo "KERNEL=$(uname -sr)"
if [ -r /etc/os-release ]; then
  . /etc/os-release
  echo "OS=${PRETTY_NAME:-unknown}"
fi

echo "CPU_COUNT=$(getconf _NPROCESSORS_ONLN 2>/dev/null || nproc)"
echo "MEMORY:"
free -h
echo "DISK_ROOT:"
df -h /

command -v docker >/dev/null 2>&1 || {
  echo "ERROR: docker is not installed"
  exit 3
}

docker --version
docker compose version

echo "CONTAINERS:"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo "LISTENING_PORTS:"
ss -tulpn

if command -v ufw >/dev/null 2>&1; then
  echo "UFW:"
  ufw status
else
  echo "UFW=not-installed"
fi

if ss -ltn | awk '{print $4}' | grep -Eq '(^|:)3410$'; then
  echo "PORT_3410_IN_USE=yes"
else
  echo "PORT_3410_IN_USE=no"
fi

echo "WA009_PREFLIGHT_DONE"
