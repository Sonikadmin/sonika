require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', '..', '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'SonikaAudioEngine'
  s.version        = package['version']
  s.summary        = 'Real-time low-latency audio engine for Sonika'
  s.description    = 'Native iOS audio module: AVAudioEngine pipeline with per-channel biquad EQ, amplification, stereo balance and Bluetooth routing.'
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = 'https://github.com/sonika'
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{swift}'
  s.frameworks = 'AVFoundation', 'Accelerate'
end
