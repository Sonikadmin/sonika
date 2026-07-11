/**
 * EngineSync — unico punto di sincronizzazione store → motore audio nativo.
 *
 * Osserva useAudioStore e invia a audioEngine.updateSettings solo i campi
 * effettivamente cambiati, e solo mentre l'amplificazione è attiva.
 * Così ogni schermata (Home, Equalizer, Profili) deve solo scrivere nello
 * store: l'audio si aggiorna in tempo reale senza chiamate sparse.
 */
import { useAudioStore } from '../store/audioStore';
import { audioEngine, AudioEngineSettings } from './AudioEngine';

export function initEngineSync(): () => void {
  return useAudioStore.subscribe((s, prev) => {
    if (!s.isRunning) return;

    const patch: Partial<AudioEngineSettings> = {};

    if (s.leftEQ         !== prev.leftEQ)         patch.leftEQ         = s.leftEQ;
    if (s.rightEQ        !== prev.rightEQ)        patch.rightEQ        = s.rightEQ;
    if (s.leftVolume     !== prev.leftVolume)     patch.leftVolume     = s.leftVolume;
    if (s.rightVolume    !== prev.rightVolume)    patch.rightVolume    = s.rightVolume;
    if (s.amplification  !== prev.amplification)  patch.amplification  = s.amplification;
    if (s.stereoBalance  !== prev.stereoBalance)  patch.stereoBalance  = s.stereoBalance;
    if (s.sonikaClean    !== prev.sonikaClean)    patch.sonikaClean    = s.sonikaClean;
    if (s.conversationMode !== prev.conversationMode) patch.conversationMode = s.conversationMode;
    if (s.monoMode       !== prev.monoMode)       patch.monoMode       = s.monoMode;
    if (s.monoChannel    !== prev.monoChannel)    patch.monoChannel    = s.monoChannel;
    if (s.micSource      !== prev.micSource)      patch.micSource      = s.micSource;
    if (s.audioOutput    !== prev.audioOutput)    patch.audioOutput    = s.audioOutput;

    if (Object.keys(patch).length > 0) {
      audioEngine.updateSettings(patch);
    }
  });
}
