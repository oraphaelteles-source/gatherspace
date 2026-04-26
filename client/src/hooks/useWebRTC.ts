import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from './useSocket';
import { useGameStore } from '../stores/gameStore';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface PeerConnection {
  pc: RTCPeerConnection;
  stream: MediaStream | null;
  videoEl: HTMLVideoElement;
}

const peers = new Map<string, PeerConnection>();
let localStream: MediaStream | null = null;

export function getLocalStream() { return localStream; }
export function getPeers() { return peers; }

export function useWebRTC(onPeersChanged: () => void) {
  const isMuted = useGameStore(s => s.isMuted);
  const isVideoOff = useGameStore(s => s.isVideoOff);
  const isSharingScreen = useGameStore(s => s.isSharingScreen);
  const nearbyPlayers = useGameStore(s => s.nearbyPlayers);
  const prevNearby = useRef<Set<string>>(new Set());

  const getOrCreateStream = useCallback(async () => {
    if (localStream) return localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      localStream = new MediaStream();
    }
    return localStream;
  }, []);

  const createPeer = useCallback(async (peerId: string, initiator: boolean) => {
    if (peers.has(peerId)) return;

    const stream = await getOrCreateStream();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const remoteStream = new MediaStream();
    const videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = false;

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
      videoEl.srcObject = remoteStream;
      onPeersChanged();
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket()?.emit('webrtc_ice', { to: peerId, candidate: e.candidate });
      }
    };

    peers.set(peerId, { pc, stream: remoteStream, videoEl });

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket()?.emit('webrtc_offer', { to: peerId, offer });
    }

    onPeersChanged();
  }, [getOrCreateStream, onPeersChanged]);

  const removePeer = useCallback((peerId: string) => {
    const peer = peers.get(peerId);
    if (peer) {
      peer.pc.close();
      peers.delete(peerId);
      onPeersChanged();
    }
  }, [onPeersChanged]);

  // Handle proximity changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const added = new Set([...nearbyPlayers].filter(id => !prevNearby.current.has(id)));
    const removed = new Set([...prevNearby.current].filter(id => !nearbyPlayers.has(id)));

    added.forEach(id => createPeer(id, socket.id! > id));
    removed.forEach(id => removePeer(id));

    prevNearby.current = new Set(nearbyPlayers);
  }, [nearbyPlayers, createPeer, removePeer]);

  // Handle incoming WebRTC events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOffer = async ({ from, offer }: any) => {
      await createPeer(from, false);
      const peer = peers.get(from);
      if (!peer) return;
      await peer.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { to: from, answer });
    };

    const handleAnswer = async ({ from, answer }: any) => {
      const peer = peers.get(from);
      if (peer) await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIce = async ({ from, candidate }: any) => {
      const peer = peers.get(from);
      if (peer && candidate) await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice', handleIce);

    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice', handleIce);
    };
  }, [createPeer]);

  // Mute/unmute
  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
  }, [isMuted]);

  // Video on/off
  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => { t.enabled = !isVideoOff; });
  }, [isVideoOff]);

  // Screen share
  useEffect(() => {
    if (!isSharingScreen) return;
    (async () => {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        peers.forEach(({ pc }) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        screenTrack.onended = () => {
          useGameStore.getState().toggleScreenShare();
        };
      } catch {
        useGameStore.getState().toggleScreenShare();
      }
    })();
  }, [isSharingScreen]);

  return { peers, localStream };
}
