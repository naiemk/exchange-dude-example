#!/bin/bash
rm -rf ./dist
mkdir -p ./dist/iota/dist/
mkdir -p ./dist/js
mkdir -p ./dist/css
cp iota/dist/iota.js ./dist/iota/dist/
cp ./*.html ./dist/
cp ./js/* ./dist/js/
cp ./css/* ./dist/css/
cp -R ./vendor ./dist/
tar -C ./dist/ -zcv -f exchange-dude-example.tar.gz .
mv ./exchange-dude-example.tar.gz ./dist/
