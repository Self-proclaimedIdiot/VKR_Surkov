import React, { useState, useEffect} from 'react';
import ChessBoard from '../components/Game.jsx';
import * as signalR from '@microsoft/signalr';
import { jwtDecode } from "jwt-decode";
import DrawBoard from '../components/Board.jsx';
import '../App.css';
const RegularPlay = () => {
    //const [message, setMessage] = useState("")
    const [isHidden, setIsHidden] = useState(true)
    const [isOpponentFound, setIsOpponentFound] = useState(false)
    const [items, setItems] = useState([])
    const token = sessionStorage.getItem('token');
    const [connection, setConnection] = useState(null);
    const [color, setColor] = useState(false)
    const [gameId, setGameId] = useState(0)
    const [baseTime, setBaseTime] = useState(0)
    const [addTime, setAddTime] = useState(0)
    const [chosenFormatId, setChosenFormatId] = useState(0)
    useEffect(() => {
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7039/chess-hub", {
                accessTokenFactory: () => {
                    return sessionStorage.getItem('token');
                }
            })
            .withAutomaticReconnect()
            .build();
        const InsideFunc = async () => {
            if (newConnection.state == signalR.HubConnectionState.Disconnected) {
                newConnection.start()
                    .then(() => {
                        console.log('Connected!');
                        // 2. Входим в "комнату" игры
                        //connection.invoke("JoinGame", gameId);

                        // 3. Подписываемся на получение ходов
                        //connection.on("ReceiveMove", (fen, move) => {
                        //console.log("Получен ход:", move, "Новый FEN:", fen);
                        // Обновите состояние вашей шахматной доски здесь
                        //});
                    })
                    .catch(e => console.log('Connection failed: ', e));
                setConnection(newConnection)
            }
        }
        InsideFunc()

        return () => {
            if (newConnection) {
                newConnection.stop();
            }
        };
    }, [setConnection]);
    const StartGame = async (formatId, time, addTime) => {
        connection.invoke("JoinQueue", formatId)
        setIsHidden(false)
        setIsOpponentFound(false)
        connection.on("GameStarted", (data) => {
            setIsOpponentFound(true)
            setBaseTime(time)
            setAddTime(addTime)
            setChosenFormatId(formatId)
            const decoded = jwtDecode(token)
            setColor(data.white == decoded.nameid)
            setGameId(data.gameId)
        })
    }
    useEffect(() => {
        fetch('regplay/load-formats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // ВОТ ОНО: Передаем токен в стандартном формате Bearer
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(data => setItems(data))
    }, [])
    return (
        <div>
            {isHidden && <ul>
                {items.map((item) => (
                    <li key={item.id} style={{ marginLeft: 40 }}>
                        <button onClick={() => StartGame(item.id, item.time, item.addTime)}>{item.name}</button>
                    </li>
                ))}
            </ul>}
            {!isHidden && !isOpponentFound && <div>Поиск противника...<img src = "loading.gif"/></div>}
            {!isHidden && isOpponentFound && <DrawBoard key={gameId} connection={connection} isWhite={color} gameId={gameId} baseTime={baseTime} addTime={addTime}
                formatId={chosenFormatId}
                onStartNew={() => StartGame(chosenFormatId, baseTime, addTime)} />}
        </div>
    )
}
export default RegularPlay;