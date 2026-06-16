#!/usr/bin/env ruby
# Novaé — HTTPS server (needed so phones can use the motion / gyroscope mode).
require 'webrick'
require 'webrick/https'
require 'openssl'
require 'socket'

dir  = File.expand_path(File.dirname(__FILE__))
port = (ENV['PORT'] || 8443).to_i
cert = OpenSSL::X509::Certificate.new(File.read(File.join(dir, 'certs', 'cert.pem')))
key  = OpenSSL::PKey::RSA.new(File.read(File.join(dir, 'certs', 'key.pem')))

# best-effort LAN IP
lan = Socket.ip_address_list.detect { |a| a.ipv4? && !a.ipv4_loopback? && !a.ipv4_multicast? }
ip  = lan ? lan.ip_address : 'localhost'

server = WEBrick::HTTPServer.new(
  Port: port,
  BindAddress: '0.0.0.0',
  DocumentRoot: File.join(dir, 'www'),
  DocumentRootOptions: { FancyIndexing: true },
  SSLEnable: true,
  SSLCertificate: cert,
  SSLPrivateKey: key,
  Logger: WEBrick::Log.new($stderr, WEBrick::Log::WARN),
  AccessLog: []
)

puts ""
puts "  Novaé est servi en HTTPS."
puts "  • Sur ce Mac      : https://localhost:#{port}/"
puts "  • Sur le téléphone: https://#{ip}:#{port}/   (même réseau Wi-Fi)"
puts ""
puts "  Le navigateur affichera un avertissement (certificat auto-signé) :"
puts "  acceptez / « Visiter quand même » — c'est normal en local."
puts "  Ctrl+C pour arrêter."
puts ""

trap('INT')  { server.shutdown }
trap('TERM') { server.shutdown }
server.start
