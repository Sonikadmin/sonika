import Foundation
import Accelerate

/// Single biquad filter section — Direct Form I, 32-bit float.
/// All coefficient updates are thread-safe (atomic swap of a frozen struct).
final class BiquadFilter {

  // Filter coefficients (normalised: a0 = 1)
  private struct Coefficients {
    var b0: Float = 1; var b1: Float = 0; var b2: Float = 0
    var a1: Float = 0; var a2: Float = 0
  }

  // Delay-line state (per-instance, NOT shared across threads)
  private var x1: Float = 0, x2: Float = 0
  private var y1: Float = 0, y2: Float = 0

  private var coeff = Coefficients()

  // MARK: - Coefficient setters

  /// Peaking bell EQ  (all mid bands)
  func setPeaking(freq: Float, sampleRate: Float, gainDb: Float, q: Float = 1.41) {
    guard gainDb != 0 else { setPassthrough(); return }
    let w0   = 2 * Float.pi * freq / sampleRate
    let cosW = cos(w0)
    let sinW = sin(w0)
    let A    = pow(10, gainDb / 40)
    let alpha = sinW / (2 * q)
    let a0inv = 1 / (1 + alpha / A)
    coeff = Coefficients(
      b0: (1 + alpha * A) * a0inv,
      b1: (-2 * cosW)     * a0inv,
      b2: (1 - alpha * A) * a0inv,
      a1: (-2 * cosW)     * a0inv,
      a2: (1 - alpha / A) * a0inv
    )
  }

  /// Low-shelf (for the lowest band ~125 Hz)
  func setLowShelf(freq: Float, sampleRate: Float, gainDb: Float, s: Float = 1) {
    guard gainDb != 0 else { setPassthrough(); return }
    let w0    = 2 * Float.pi * freq / sampleRate
    let cosW  = cos(w0)
    let A     = pow(10, gainDb / 40)
    let alpha = sin(w0) / 2 * sqrt((A + 1/A) * (1/s - 1) + 2)
    let sqA   = sqrt(A)
    let a0    = (A+1) + (A-1)*cosW + 2*sqA*alpha
    let a0inv = 1 / a0
    coeff = Coefficients(
      b0:  A * ((A+1) - (A-1)*cosW + 2*sqA*alpha) * a0inv,
      b1:  2*A * ((A-1) - (A+1)*cosW)             * a0inv,
      b2:  A * ((A+1) - (A-1)*cosW - 2*sqA*alpha) * a0inv,
      a1: -2 * ((A-1) + (A+1)*cosW)               * a0inv,
      a2:      ((A+1) + (A-1)*cosW - 2*sqA*alpha) * a0inv
    )
  }

  /// High-shelf (for the highest band ~8 kHz)
  func setHighShelf(freq: Float, sampleRate: Float, gainDb: Float, s: Float = 1) {
    guard gainDb != 0 else { setPassthrough(); return }
    let w0    = 2 * Float.pi * freq / sampleRate
    let cosW  = cos(w0)
    let A     = pow(10, gainDb / 40)
    let alpha = sin(w0) / 2 * sqrt((A + 1/A) * (1/s - 1) + 2)
    let sqA   = sqrt(A)
    let a0    = (A+1) - (A-1)*cosW + 2*sqA*alpha
    let a0inv = 1 / a0
    coeff = Coefficients(
      b0:  A * ((A+1) + (A-1)*cosW + 2*sqA*alpha) * a0inv,
      b1: -2*A * ((A-1) + (A+1)*cosW)             * a0inv,
      b2:  A * ((A+1) + (A-1)*cosW - 2*sqA*alpha) * a0inv,
      a1:  2 * ((A-1) - (A+1)*cosW)               * a0inv,
      a2:     ((A+1) - (A-1)*cosW - 2*sqA*alpha)  * a0inv
    )
  }

  func setPassthrough() {
    coeff = Coefficients()
    resetState()
  }

  func resetState() {
    x1 = 0; x2 = 0; y1 = 0; y2 = 0
  }

  // MARK: - Sample processing

  /// Process a block of float samples in-place (Direct Form I).
  func process(_ samples: UnsafeMutablePointer<Float>, count: Int) {
    let c = coeff
    for i in 0..<count {
      let x = samples[i]
      let y = c.b0*x + c.b1*x1 + c.b2*x2 - c.a1*y1 - c.a2*y2
      x2 = x1; x1 = x
      y2 = y1; y1 = y
      samples[i] = y
    }
  }
}


/// Five-band parametric EQ for one audio channel.
/// Band layout:  0=LowShelf(125Hz), 1=Peak(500Hz), 2=Peak(1kHz), 3=Peak(3kHz), 4=HighShelf(8kHz)
final class ChannelEQ {
  private let filters: [BiquadFilter] = (0..<5).map { _ in BiquadFilter() }

  private let frequencies: [Float] = [125, 500, 1000, 3000, 8000]

  func updateBands(gains: [Float], sampleRate: Float) {
    precondition(gains.count == 5)
    for (i, gain) in gains.enumerated() {
      let f = frequencies[i]
      switch i {
      case 0:  filters[i].setLowShelf(freq: f, sampleRate: sampleRate, gainDb: gain)
      case 4:  filters[i].setHighShelf(freq: f, sampleRate: sampleRate, gainDb: gain)
      default: filters[i].setPeaking(freq: f, sampleRate: sampleRate, gainDb: gain)
      }
    }
  }

  func process(_ samples: UnsafeMutablePointer<Float>, count: Int) {
    for filter in filters {
      filter.process(samples, count: count)
    }
  }

  func reset() { filters.forEach { $0.resetState() } }
}
