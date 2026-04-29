/**
 * BluetoothService — manages BT device discovery and audio routing.
 *
 * PROTOTYPE: returns simulated devices. In production replace with
 * react-native-ble-plx + AVAudioSession (iOS) / AudioManager (Android)
 * for actual device enumeration and routing.
 */
import { BluetoothDevice } from '../types';

type DeviceCallback = (devices: BluetoothDevice[]) => void;
type DisconnectCallback = (deviceId: string, type: 'input' | 'output') => void;

class BluetoothService {
  private listeners: DeviceCallback[] = [];
  private disconnectListeners: DisconnectCallback[] = [];
  private simulatedDevices: BluetoothDevice[] = [];
  private scanInterval: ReturnType<typeof setInterval> | null = null;

  async startScan(): Promise<void> {
    // Simulate device discovery after short delay
    setTimeout(() => {
      this.simulatedDevices = [
        {
          id: 'bt-mic-001',
          name: 'Microfono Bluetooth Tavolo',
          type: 'microphone',
          connected: false,
          rssi: -55,
        },
        {
          id: 'bt-bone-001',
          name: 'Shokz OpenRun Pro',
          type: 'bone_conduction',
          connected: true,
          rssi: -40,
        },
        {
          id: 'bt-hp-001',
          name: 'AirPods Pro',
          type: 'headphones',
          connected: true,
          rssi: -35,
        },
      ];
      this.notifyListeners();
    }, 1200);
  }

  stopScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  async connect(deviceId: string): Promise<void> {
    this.simulatedDevices = this.simulatedDevices.map((d) =>
      d.id === deviceId ? { ...d, connected: true } : d
    );
    this.notifyListeners();
  }

  async disconnect(deviceId: string): Promise<void> {
    this.simulatedDevices = this.simulatedDevices.map((d) =>
      d.id === deviceId ? { ...d, connected: false } : d
    );
    this.notifyListeners();
  }

  getDevices(): BluetoothDevice[] {
    return this.simulatedDevices;
  }

  getConnectedDevices(): BluetoothDevice[] {
    return this.simulatedDevices.filter((d) => d.connected);
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

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.simulatedDevices));
  }
}

export const bluetoothService = new BluetoothService();
