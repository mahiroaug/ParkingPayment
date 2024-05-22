#!/bin/bash

cp -r ../artifacts/contracts src/lambda/lambda11/lib/
cp -r ../artifacts/contracts src/lambda/lambda12/lib/
cp -r ../artifacts/contracts src/lambda/lambda21/lib/
cp -r ../artifacts/contracts src/lambda/lambda22/lib/

cp -r ../.env.vaults src/lambda/lambda12/lib/