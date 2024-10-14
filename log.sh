#!/bin/bash

# Based on https://github.com/google/clasp/issues/725#issuecomment-811020123

set -e

trap "exit" INT TERM ERR
trap "kill 0" EXIT

clasp logs --watch --json | grep '"message": ' &
clasp run $1
sleep ${2:-20}