#!/bin/bash

cp -r ../artifacts/contracts src/share/common/
cp -r ../.env.vaults src/share/common/

cp -r src/share/common src/lambda/lambda11/lib/
cp -r src/share/common src/lambda/lambda12/lib/
cp -r src/share/common src/lambda/lambda21/lib/
cp -r src/share/common src/lambda/lambda22/lib/
cp -r src/share/common src/lambda/lambda31/lib/
cp -r src/share/common src/lambda/lambda32/lib/
cp -r src/share/common src/lambda/lambda41/lib/
cp -r src/share/common src/lambda/lambda42/lib/
