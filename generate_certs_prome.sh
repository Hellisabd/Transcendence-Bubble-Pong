#!/bin/bash

CERT_DIR="./Backend/monitoring/Prometheus/certs"

mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:4096 -sha256 -nodes \
  -keyout "$CERT_DIR/prometheus.key" \
  -out "$CERT_DIR/prometheus.crt" \
  -days 365 \
  -subj "/CN=localhost"

echo "✅ Certificats générés dans $CERT_DIR"

CERT_DIR="./Backend/monitoring/Grafana/certs"

mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:4096 -sha256 -nodes \
  -keyout "$CERT_DIR/grafana.key" \
  -out "$CERT_DIR/grafana.crt" \
  -days 365 \
  -subj "/CN=localhost"

echo "✅ Certificats générés dans $CERT_DIR"
