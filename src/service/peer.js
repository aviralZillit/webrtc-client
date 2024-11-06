class PeerService {
  constructor() {
    if (!this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              // "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478",
            ],
          },
        ],
      });
    }
  }

  async getAnswer(offer) {
    if (this.peer) {
      // Ensure the peer connection is ready for setting the remote offer
      if (this.peer.signalingState === "stable" || this.peer.signalingState === "have-local-offer") {
        await this.peer.setRemoteDescription(offer);
        const ans = await this.peer.createAnswer();
        await this.peer.setLocalDescription(new RTCSessionDescription(ans));
        return ans;
      } else {
        console.error("Cannot set remote offer in current signaling state:", this.peer.signalingState);
      }
    }
  }

  async setLocalDescription(ans) {
    if (this.peer) {
      // Check if the connection is in the correct state to set a remote answer
      if (this.peer.signalingState === "have-remote-offer") {
        await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
      } else {
        console.error("Cannot set remote answer in current signaling state:", this.peer.signalingState);
      }
    }
  }

  async getOffer() {
    if (this.peer) {
      // Create an offer only if the peer connection is in a stable state
      if (this.peer.signalingState === "stable") {
        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(new RTCSessionDescription(offer));
        return offer;
      } else {
        console.error("Cannot create offer in current signaling state:", this.peer.signalingState);
      }
    }
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new PeerService();