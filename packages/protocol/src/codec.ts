import type { Report, MeshMessage } from '@blackout/types';

/**
 * Low-latency binary serializer/deserializer for Blackout mesh protocol.
 * Employs UTF-8 packing with a compact binary envelope, ensuring sub-millisecond
 * serialization on resource-constrained mobile and web worker runtimes without native binaries.
 */

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export class ProtocolCodec {
  /**
   * Encodes a Report object into a compact binary ArrayBuffer.
   */
  public static encodeReport(report: Report): Uint8Array {
    const jsonStr = JSON.stringify(report);
    const jsonBytes = TEXT_ENCODER.encode(jsonStr);

    // Header: [Magic: 0x42, 0x4C, 0x4B, 0x01] (BLK v1) + 4-byte payload length
    const buffer = new Uint8Array(8 + jsonBytes.length);
    buffer[0] = 0x42; // 'B'
    buffer[1] = 0x4c; // 'L'
    buffer[2] = 0x4b; // 'K'
    buffer[3] = 0x01; // Version 1

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    view.setUint32(4, jsonBytes.length, false); // Big endian

    buffer.set(jsonBytes, 8);
    return buffer;
  }

  /**
   * Decodes a binary ArrayBuffer into a Report object.
   */
  public static decodeReport(buffer: Uint8Array): Report {
    if (buffer.length < 8) {
      throw new Error('Invalid Blackout protocol packet: Buffer too short');
    }

    if (
      buffer[0] !== 0x42 ||
      buffer[1] !== 0x4c ||
      buffer[2] !== 0x4b ||
      buffer[3] !== 0x01
    ) {
      throw new Error('Invalid Blackout protocol packet: Magic header mismatch');
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const payloadLength = view.getUint32(4, false);

    if (buffer.length < 8 + payloadLength) {
      throw new Error('Invalid Blackout protocol packet: Truncated payload');
    }

    const payloadBytes = buffer.subarray(8, 8 + payloadLength);
    const jsonStr = TEXT_DECODER.decode(payloadBytes);
    return JSON.parse(jsonStr) as Report;
  }

  /**
   * Encodes a generic MeshMessage into binary format.
   */
  public static encodeMeshMessage<T>(msg: MeshMessage<T>): Uint8Array {
    const jsonStr = JSON.stringify(msg);
    const bytes = TEXT_ENCODER.encode(jsonStr);
    const packet = new Uint8Array(4 + bytes.length);
    // Envelope: [0x4d, 0x53, 0x48, 0x01] (MSH v1)
    packet[0] = 0x4d;
    packet[1] = 0x53;
    packet[2] = 0x48;
    packet[3] = 0x01;
    packet.set(bytes, 4);
    return packet;
  }

  /**
   * Decodes a generic MeshMessage from binary format.
   */
  public static decodeMeshMessage<T>(buffer: Uint8Array): MeshMessage<T> {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x4d ||
      buffer[1] !== 0x53 ||
      buffer[2] !== 0x48 ||
      buffer[3] !== 0x01
    ) {
      throw new Error('Invalid MeshMessage envelope header');
    }

    const payload = buffer.subarray(4);
    const json = TEXT_DECODER.decode(payload);
    return JSON.parse(json) as MeshMessage<T>;
  }
}
