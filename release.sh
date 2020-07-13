#!/usr/bin/env bash

VER=$(grep "version" website.properties|cut -d'=' -f2)  && \
  docker build -t thedatapub/website:$VER \
    -t registry.circulosiete.com/library/thedatapub/website:$VER . && \
  git release $VER && \
  docker push thedatapub/website:$VER && \
  docker push registry.circulosiete.com/library/thedatapub/website:$VER && \
  echo "done"
