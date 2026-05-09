#!/bin/bash

PLUGIN_NAME="openclaw-onlyonebot"

install_and_restart() {
  openclaw plugins install . --force && openclaw gateway restart
}

pull_build_install_restart() {
  git fetch && git pull && npm run build && install_and_restart
}

uninstall_plugin() {
  openclaw plugins uninstall "$PLUGIN_NAME"
}

usage() {
  echo "Usage: $0              install plugin from cwd and restart gateway" >&2
  echo "       $0 -u           git pull, build, install, restart" >&2
  echo "       $0 -remove      uninstall plugin $PLUGIN_NAME" >&2
}

case "${1:-}" in
  "")
    install_and_restart
    ;;
  -u|--update)
    pull_build_install_restart
    ;;
  -remove)
    uninstall_plugin
    ;;
  -h|--help)
    usage
    ;;
  *)
    echo "Unknown option: $1" >&2
    usage
    exit 1
    ;;
esac
