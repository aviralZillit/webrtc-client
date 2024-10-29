import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import './RoomPage.css';

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [myName, setMyName] = useState("You");
  const [remoteName, setRemoteName] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  // Toggle mute/unmute
  const toggleMute = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  // End call function
  const endCall = () => {
    myStream?.getTracks().forEach((track) => track.stop());
    peer.peer.close();
    setMyStream(null);
    setRemoteStream(null);
    setRemoteSocketId(null);
    setRemoteName("");
    console.log("Call Ended");
  };

  // Handle user joining the room with name and id
  const handleUserJoined = useCallback(({ name, id }) => {
    console.log(`User ${name} joined the room`);
    setRemoteSocketId(id);
    setRemoteName(name);
  }, []);

  // Handle user calling, ensuring the name is passed
  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer, name: myName });
  }, [remoteSocketId, socket, myName]);

  // Handle incoming call with offer and name
  const handleIncommingCall = useCallback(
    async ({ from, offer, name }) => {
      setRemoteSocketId(from);
      setRemoteName(name);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call from ${name}`);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  // Send stream tracks to the peer connection
  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  // Handle call acceptance
  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  // Handle negotiation needed
  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  // Set up peer negotiation needed event listener
  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  // Handle negotiation needed on incoming offer
  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  // Handle final negotiation
  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  // Set up track event to receive remote streams
  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div className={`room-container ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <button onClick={toggleDarkMode} className="toggle-dark-mode">
        {isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
      <h1 className="room-heading">Room</h1>
      <h4 className="status">{remoteSocketId ? "Connected" : "No one in room"}</h4>
      <div className="controls">
        {myStream && (
          <>
            <button onClick={sendStreams} className="control-button">Send Stream</button>
            <button onClick={toggleMute} className="control-button">
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button onClick={endCall} className="control-button">End Call</button>
          </>
        )}
        {remoteSocketId && <button onClick={handleCallUser} className="control-button">Call</button>}
      </div>
      <div className="stream-container">
        {myStream && (
          <div className="stream">
            <h2 className="stream-name">{myName}</h2>
            {/* Mute the local stream for self to avoid feedback */}
            <ReactPlayer playing muted className="video-player" url={URL.createObjectURL(myStream)} />
          </div>
        )}
        {remoteStream && (
          <div className="stream">
            <h2 className="stream-name">{remoteName}</h2>
            <ReactPlayer playing className="video-player" url={URL.createObjectURL(remoteStream)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;