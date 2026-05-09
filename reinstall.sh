#!bin/bash

git fetch && git pull && npm run build && openclaw plugins install . --force && openclaw gateway restart