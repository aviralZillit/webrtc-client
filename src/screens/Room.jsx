/* eslint-disable no-unused-vars */
import React, { useEffect, useCallback, useState, useRef } from "react";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone, faMicrophoneSlash, faVideo, faVideoSlash, faDesktop } from "@fortawesome/free-solid-svg-icons";
import './RoomPage.css';

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [myName, setMyName] = useState("You");
  const [remoteName, setRemoteName] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Toggle dark mode
  const toggleDarkMode = () => setIsDarkMode((prevMode) => !prevMode);

  // Toggle mute/unmute
  const toggleMute = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    if (myStream) {
      myStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  // Start or stop screen sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(screenStream);
        setIsScreenSharing(true);

        const videoTrack = screenStream.getVideoTracks()[0];
        peer.peer.getSenders().forEach((sender) => {
          if (sender.track.kind === "video") {
            sender.replaceTrack(videoTrack);
          }
        });

        videoTrack.onended = () => stopScreenShare();
      } catch (error) {
        console.error("Error starting screen sharing:", error);
      }
    } else {
      stopScreenShare();
    }
  };

  // Stop screen sharing and revert to camera
  const stopScreenShare = () => {
    screenStream?.getTracks().forEach((track) => track.stop());
    setScreenStream(null);
    setIsScreenSharing(false);

    const videoTrack = myStream.getVideoTracks()[0];
    peer.peer.getSenders().forEach((sender) => {
      if (sender.track.kind === "video") {
        sender.replaceTrack(videoTrack);
      }
    });
  };

  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const endCall = () => {
    myStream?.getTracks().forEach((track) => track.stop());
    peer.peer.close();
    setMyStream(null);
    setRemoteStream(null);
    setRemoteSocketId(null);
    setRemoteName("");
    console.log("Call Ended");
  };

  const handleUserJoined = useCallback(({ name, id }) => {
    console.log(`User ${name} joined the room`);
    setRemoteSocketId(id);
    setRemoteName(name);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer, name: myName });
    setMyStream(stream);
  }, [remoteSocketId, socket, myName]);

  const handleIncommingCall = useCallback(
    async ({ from, offer, name }) => {
      setRemoteSocketId(from);
      setRemoteName(name);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMyStream(stream);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    myStream.getTracks().forEach((track) => {
      peer.peer.addTrack(track, myStream);
    });
  }, [myStream]);

  const handleCallAccepted = useCallback(({ from, ans }) => {
    peer.setLocalDescription(ans);
    sendStreams();
  }, [sendStreams]);

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(async ({ from, offer }) => {
    const ans = await peer.getAnswer(offer);
    socket.emit("peer:nego:done", { to: from, ans });
  }, [socket]);

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", (ev) => {
      const remoteStream = ev.streams[0];
      setRemoteStream(remoteStream);
    });
  }, []);

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
  }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted, handleNegoNeedIncomming, handleNegoNeedFinal]);

  return (
    <div className={`room-container ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <button onClick={toggleDarkMode} className="toggle-dark-mode">
        {isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
      <h1 className="room-heading">Room</h1>
      <h4 className="status">{remoteSocketId ? "Connected" : "No one in room"}</h4>
      <div className="controls">
        {myStream && (
          <button onClick={endCall} className="control-button">End Call</button>
        )}
        {remoteSocketId && <button onClick={handleCallUser} className="control-button">Call</button>}
        <button onClick={toggleScreenShare} className="control-button">
          {isScreenSharing ? "Stop Sharing" : "Share Screen"}
        </button>
      </div>
      <div className="stream-container">
        {myStream && (
          <div className="stream">
            <h2 className="stream-name">{myName}</h2>
            <video ref={myVideoRef} className="video-player" autoPlay muted playsInline />
            <div className="video-controls-overlay">
              <button onClick={toggleMute} className="icon-button">
                <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} className={`icon ${isMuted ? 'muted' : ''}`} />
              </button>
              <button onClick={toggleVideo} className="icon-button">
                <FontAwesomeIcon icon={isVideoOff ? faVideoSlash : faVideo} className={`icon ${isVideoOff ? 'video-off' : ''}`} />
              </button>
              <button onClick={toggleScreenShare} className="icon-button">
                <FontAwesomeIcon icon={faDesktop} className="icon" />
              </button>
            </div>
          </div>
        )}
        {remoteStream && (
          <div className="stream">
            <h2 className="stream-name">{remoteName}</h2>
            <video ref={remoteVideoRef} className="video-player" autoPlay playsInline />
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;