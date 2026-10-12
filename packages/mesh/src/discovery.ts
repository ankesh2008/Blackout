import type { PeerInfo, MeshMessage, UserRole } from '@blackout/types';
import { ProtocolCodec } from '@blackout/protocol';

export type MeshDiscoveryEvent =
  | { type: 'PEER_FOUND'; peer: PeerInfo }
  | { type: 'PEER_CONNECTED'; peer: PeerInfo }
  | { type: 'PEER_DISCONNECTED'; peerId: string }
  | { type: 'PACKET_RECEIVED'; packet: MeshMessage; fromPeerId: string };

export type DiscoveryEventHandler = (event: MeshDiscoveryEvent) => void;

export interface DiscoveryOptions {
  nodeId: string;
  callsign: string;
  role: UserRole;
  channelName?: string;
  heartbeatIntervalMs?: number;
}

/**
 * P2P Discovery and signaling manager.
 * Discovers nearby devices via local WebRTC / BroadcastChannel / local network when the internet is down.
 */
export class MeshDiscovery {
  private readonly nodeId: string;
  private readonly callsign: string;
  private readonly role: UserRole;
  private readonly channelName: string;
  private readonly heartbeatIntervalMs: number;

  private connectedPeers: Map<string, PeerInfo> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<DiscoveryEventHandler> = new Set();
  private isDestroyed = false;

  constructor(options: DiscoveryOptions) {
    this.nodeId = options.nodeId;
    this.callsign = options.callsign;
    this.role = options.role;
    this.channelName = options.channelName || 'blackout-mesh-discovery';
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 4000;

    this.initTransport();
  }

  private initTransport() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event) => this.handleRawMessage(event.data);
      } catch (err) {
        console.warn('[MeshDiscovery] BroadcastChannel not supported in this environment');
      }
    }
  }

  public start() {
    if (this.isDestroyed) return;

    // Send immediate beacon
    this.announcePresence();

    // Start periodic heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.announcePresence();
      this.pruneStalePeers();
    }, this.heartbeatIntervalMs);
  }

  public stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public destroy() {
    this.stop();
    this.isDestroyed = true;
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.listeners.clear();
    this.connectedPeers.clear();
  }

  public on(handler: DiscoveryEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private emit(event: MeshDiscoveryEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public getConnectedPeers(): PeerInfo[] {
    return Array.from(this.connectedPeers.values());
  }

  public announcePresence() {
    const beacon: MeshMessage<PeerInfo> = {
      id: `beacon_${this.nodeId}_${Date.now()}`,
      senderId: this.nodeId,
      senderCallsign: this.callsign,
      type: 'PEER_HELLO',
      timestamp: Date.now(),
      payload: {
        peerId: this.nodeId,
        callsign: this.callsign,
        role: this.role,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        latencyMs: 12,
        isMeshRelay: this.role === 'INCIDENT_COMMANDER' || this.role === 'FIRST_RESPONDER',
      },
    };

    this.broadcast(beacon);
  }

  public broadcast<T>(message: MeshMessage<T>) {
    if (this.broadcastChannel) {
      const bytes = ProtocolCodec.encodeMeshMessage(message);
      this.broadcastChannel.postMessage(bytes);
    }
  }

  private handleRawMessage(data: any) {
    try {
      let packet: MeshMessage;
      if (data instanceof Uint8Array) {
        packet = ProtocolCodec.decodeMeshMessage(data);
      } else if (typeof data === 'object' && data.type) {
        packet = data as MeshMessage;
      } else {
        return;
      }

      // Ignore our own broadcasted packets
      if (packet.senderId === this.nodeId) {
        return;
      }

      // If targeted to a specific peer and not for us, ignore
      if (packet.targetId && packet.targetId !== this.nodeId) {
        return;
      }

      this.processIncomingPacket(packet);
    } catch (err) {
      console.warn('[MeshDiscovery] Failed to decode mesh packet', err);
    }
  }

  private processIncomingPacket(packet: MeshMessage) {
    const peerId = packet.senderId;

    if (packet.type === 'PEER_HELLO') {
      const peerData = packet.payload as PeerInfo;
      const existing = this.connectedPeers.get(peerId);

      const peer: PeerInfo = {
        ...peerData,
        lastPing: Date.now(),
      };

      this.connectedPeers.set(peerId, peer);

      if (!existing) {
        this.emit({ type: 'PEER_FOUND', peer });
        this.emit({ type: 'PEER_CONNECTED', peer });
      }
    } else {
      const peer = this.connectedPeers.get(peerId);
      if (peer) {
        peer.lastPing = Date.now();
      }
    }

    this.emit({
      type: 'PACKET_RECEIVED',
      packet,
      fromPeerId: peerId,
    });
  }

  private pruneStalePeers() {
    const now = Date.now();
    const timeout = this.heartbeatIntervalMs * 3;

    for (const [peerId, peer] of this.connectedPeers.entries()) {
      if (now - peer.lastPing > timeout) {
        this.connectedPeers.delete(peerId);
        this.emit({ type: 'PEER_DISCONNECTED', peerId });
      }
    }
  }
}
