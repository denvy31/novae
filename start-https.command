#!/bin/bash
# Novaé — double-click to launch the HTTPS server (required for phone motion mode).
cd "$(dirname "$0")" || exit 1
ruby serve_https.rb
