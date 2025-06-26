#!/bin/bash
rm -fr dist/
pnpm run docs:build
pnpm run dity-explorer-build

mkdir dist
cp -rf docs/.vitepress/dist/* dist/

mkdir dist/explorer
cp -fr packages/dity-explorer/dist/* dist/explorer/
