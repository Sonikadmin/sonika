/**
 * BluetoothService — dispositivi audio reali (Bluetooth, jack, USB).
 *
 * Si appoggia al modulo nativo SonikaAudioEngine:
 * - getAudioDevices(): dispositivi audio esterni collegati al sistema
 * - onAudioDevicesChanged: evento nativo quando un dispositivo viene
 *   collegato/scollegato (AudioDeviceCallback su Android, route change su iOS)
 *
 * Nota: il pairing Bluetooth resta a carico delle impostazioni di sistema —
 * qui vediamo i dispositivi già accoppiati e collegati, che è ciò che serve
 * per il routing audio.
 */
import NativeAudioEngine, {
  NativeAudioDevice,
} from '../../modules/sonika-audio-engine/src';
import { BluetoothDevice } from '../types';

type DeviceCallback = (devices: BluetoothDevice[]) => void;
type DisconnectCallback = (deviceId: string, type: 'input' | 'output') => void;

function toBluetoothDevice(d: NativeAudioDevice): BluetoothDevice {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    connected: d.connected,
  };
}

class BluetoothService {
  private listeners: DeviceCallback[] = [];
  private disconnectListeners: DisconnectCallback[] = [];
  private devices: BluetoothDevice[] = [];
  private nativeSub: { remove: () => void } | null = null;

  /** Legge i dispositivi attuali e resta in ascolto dei cambiamenti. */
  async startScan(): Promise<void> {
    this.refresh();
    if (!this.nativeSub) {
      this.nativeSub = NativeAudioEngine.addListener(
        'onAudioDevicesChanged',
        (e) => this.handleNativeDevices(e.devices),
      );
    }
  }

  stopScan(): void {
    this.nativeSub?.remove();
    this.nativeSub = null;
  }

  refresh(): void {
    try {
      this.handleNativeDevices(NativeAudioEngine.getAudioDevices());
    } catch {
      // Modulo non disponibile (es. Expo Go): nessun dispositivo
      this.handleNativeDevices([]);
    }
  }

  getDevices(): BluetoothDevice[] {
    return this.devices;
  }

  getConnectedDevices(): BluetoothDevice[] {
    return this.devices.filter((d) => d.connected);
  }

  onDevicesChanged(cb: DeviceCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  onDeviceDisconnected(cb: DisconnectCallback): () => void {
    this.disconnectListeners.push(cb);
    return () => {
      this.disconnectListeners = this.disconnectListeners.filter((l) => l !== cb);
    };
  }

  private handleNativeDevices(native: NativeAudioDevice[]): void {
    const next = native.map(toBluetoothDevice);

    // Notifica le disconnessioni (dispositivi spariti dalla lista)
    for (const old of this.devices) {
      if (!next.some((d) => d.id === old.id)) {
        const kind = old.type === 'microphone' ? 'input' : 'output';
        this.disconnectListeners.forEach((cb) => cb(old.id, kind));
      }
    }

    this.devices = next;
    this.listeners.forEach((cb) => cb(next));
  }
}

export const bluetoothService = new BluetoothService();
