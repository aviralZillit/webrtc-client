class PeerService {
  constructor() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });

    this.localStream = null;
    this.remoteStream = new MediaStream();

    this.peer.ontrack = (event) => {
      // Avoid adding duplicate tracks to the remote stream
      if (!this.remoteStream.getTracks().includes(event.track)) {
        this.remoteStream.addTrack(event.track);
        console.log("Remote track added:", event.track);
      }
    };
  }

  async addLocalStream(stream) {
    this.localStream = stream;

    // Add tracks if they haven't been added yet
    this.localStream.getTracks().forEach((track) => {
      const existingSenders = this.peer.getSenders();
      const trackExists = existingSenders.some(
        (sender) => sender.track === track
      );

      if (!trackExists) {
        this.peer.addTrack(track, this.localStream);
        console.log("Local track added:", track);
      }
    });
  }

  async getAnswer(offer) {
    if (this.peer) {
      if (this.peer.signalingState === "stable") {
        console.warn("Peer is already stable. Ignoring remote offer.");
        return;
      }
      await this.peer.setRemoteDescription(offer);
      const ans = await this.peer.createAnswer();
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      return ans;
    }
  }

  async setLocalDescription(ans) {
    if (this.peer) {
      if (this.peer.signalingState !== "have-remote-offer") {
        console.warn("Peer is not expecting an answer. Ignoring remote answer.");
        return;
      }
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
    }
  }

  async getOffer() {
    if (this.peer) {
      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      return offer;
    }
  }

  getRemoteStream() {
    return this.remoteStream;
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new PeerService();