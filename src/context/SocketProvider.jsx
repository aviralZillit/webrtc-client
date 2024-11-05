import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

// Using process.env directly
const environment = process.env.NODE_ENV;
console.log("Current environment:", environment);

const socketUrl =
    process.env.NODE_ENV === "prod"
      ? process.env.REACT_APP_SOCKET_URL_PROD
      : process.env.REACT_APP_SOCKET_URL_DEV;


export const SocketProvider = (props) => {
  // const socket = useMemo(() => io("https://webrtc-dev.zillit.com"), []);
  const socket = useMemo(() => io(socketUrl), []);

  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
};
