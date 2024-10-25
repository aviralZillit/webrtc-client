import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import './LobbyScreen.css';

const LobbyScreen = () => {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { name, room });
    },
    [name, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { name, room } = data;
      console.log(`${name} has joined room : ${room}`);
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="lobby-container">
      <h1 className="lobby-heading">Welcome to the Lobby</h1>
      <form onSubmit={handleSubmitForm} className="lobby-form">
        <div className="form-group">
          <label htmlFor="name" className="form-label">Name:</label>
          <input
            type="text"
            id="name"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="room" className="form-label">Room Number:</label>
          <input
            type="text"
            id="room"
            className="form-input"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="submit-button">Join Room</button>
      </form>
    </div>
  );
};

export default LobbyScreen;