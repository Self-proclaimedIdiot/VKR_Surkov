import React, { useEffect, useState, useRef} from 'react';
import { useParams } from 'react-router-dom';
import useSignalStore from '../components/useSignalStore.js';
import { jwtDecode } from "jwt-decode";
import DrawBoard from '../components/Board.jsx';
const DuelPlay = () => {
    const isUnmounting = useRef(false)
    const token = sessionStorage.getItem('token');
    const {opponentId, formatId, gameId} = useParams();
    const [baseTime, setBaseTime] = useState(0)
    const [addTime, setAddTime] = useState(0)
    const [isWhite, setIsWhite] = useState(0)
    const [isLoaded, setIsLoaded] = useState(false)
    const connection = useSignalStore((state) => state.chessConnection);
    //const setConnection = useSignalStore((state) => state.setChessConnection);
    const StartGame = () => {
        
    }
    useEffect(() => {
        const decoded = jwtDecode(token)
        fetch('/duel/get-format-time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ AccountId: decoded.nameid, FormatId: formatId, GameId: gameId })
        })
            .then(response => response.json())
            .then(data => {
                setBaseTime(data.baseTime)
                setAddTime(data.addTime)
                setIsWhite(data.isWhite)
                setIsLoaded(true)
            })
    }, [])
    useEffect(() => {
        return () => {
            // Ставим флаг, что мы реально начали процесс удаления
            isUnmounting.current = true;

            // Даем небольшую задержку, чтобы понять: это реальный выход или фокусы React
            setTimeout(() => {
                if (isUnmounting.current && connection) {
                    connection.stop();
                }
            }, 50);
        };
    }, []);
    return (
        <div>
            {isLoaded &&  < DrawBoard key={gameId} connection={connection} isWhite={isWhite} gameId={Number(gameId)} baseTime={baseTime} addTime={addTime}
                isDuel={true}  formatId={Number(formatId)}
                onStartNew={() => StartGame()} />}
        </div>
    )
}
export default DuelPlay