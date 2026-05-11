import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ChessBoard from '../components/Game.jsx';
//import { jwtDecode } from "jwt-decode";
const Replay = () => {
    const { gameId, accountId } = useParams();
    //const token = sessionStorage.getItem('token');
    const [isWhite, setIsWhite] = useState(null)
    const [start, setStart] = useState("")
    const [opponentLogin, setOpponentLogin] = useState("")
    const [formatName, setFormatName] = useState("")
    const [moves, setMoves] = useState([])
    const [currentMove, setCurrentMove] = useState(-1)
    const [boardHash, setBoardHash] = useState(0);
    const [seconds, setSeconds] = useState(0)
    const [opponentSeconds, setOpponentSeconds] = useState(0)
    const [defaultTime, setDefaultTime] = useState(0)
    const game = useMemo(() => {
        const instance = new ChessBoard()
        instance.ReadFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        return instance
    }, [])
    const ConvertSeconds = (seconds) => {
        const minutes = Math.floor(seconds / 60)
        const free_seconds = seconds % 60
        return (minutes < 10 ? "0" : "") + minutes + ":" + (free_seconds < 10 ? "0" : "") + free_seconds
    }
    const NextMove = () => {
        if (currentMove < moves.length - 1) {
            game.ReadFromFEN(moves[currentMove + 1].fen)
            setBoardHash(prev => prev + 1)
            if ((currentMove + 1) % 2 == 0 && isWhite || (currentMove + 1) % 2 == 1 && !isWhite) {
                setSeconds(moves[currentMove + 1].time)
                if (currentMove > -1)
                    setOpponentSeconds(moves[currentMove].time)
                else setOpponentSeconds(defaultTime)
            }
            else {
                setOpponentSeconds(moves[currentMove + 1].time)
                if (currentMove > -1)
                    setSeconds(moves[currentMove].time)
                else setSeconds(defaultTime)
            }
            setCurrentMove(prev => prev + 1)
        }
    }
    const PreviousMove = () => {
        if (currentMove > -1) {
            if (currentMove > 0)
                game.ReadFromFEN(moves[currentMove - 1].fen)
            else {
                game.ReadFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
            }
            setBoardHash(prev => prev - 1)
            if ((currentMove - 1) % 2 == 0 && isWhite || (currentMove - 1) % 2 == 1 && !isWhite) {
                if (currentMove > 0) {
                    setSeconds(moves[currentMove - 1].time)
                    if (currentMove > 1)
                        setOpponentSeconds(moves[currentMove - 2].time)
                    else setOpponentSeconds(defaultTime)
                }
                //я надеюсь, на утро ты вспомнишь, но остановились мы тут
                else {
                    setSeconds(defaultTime)
                    setOpponentSeconds(defaultTime)
                }
            }
            else {
                if (currentMove > 0) {
                    setOpponentSeconds(moves[currentMove - 1].time)
                    if (currentMove > 1)
                        setSeconds(moves[currentMove - 2].time)
                    else setSeconds(defaultTime)
                }
                //я надеюсь, на утро ты вспомнишь, но остановились мы тут
                else {
                    setOpponentSeconds(defaultTime)
                    setSeconds(defaultTime)
                }
            }
            setCurrentMove(prev => prev - 1)
        }
    }
    const MoveFromTable = (FEN, index) => {
        game.ReadFromFEN(FEN)
        setBoardHash(prev => prev + 1)
        if (index % 2 == 0 && isWhite || index % 2 == 1 && !isWhite) {
            setSeconds(moves[index].time)
            if (index > 0)
                setOpponentSeconds(moves[index - 1].time)
            else setOpponentSeconds(defaultTime)
        }
        else {
            setOpponentSeconds(moves[index].time)
            if (index > 0)
                setSeconds(moves[index - 1].time)
            else setSeconds(defaultTime)
        }
        setCurrentMove(index)
    }
    const RenderSquare = (row, column) => {
        const squareClass = 'square-' + ((row + column) % 2 == 0 ? 'white' : 'black')
        return (
            <span
                key={`${row}-${column}`}>
                <span
                    className={squareClass}>
                    {game.board[row][column] && (< img src={'/pieces/' + game.board[row][column]?.getSprite()} className="piece-svg"/>)}
                </span>
            </span>
        )
    }
    useEffect(() => {
        //const decoded = jwtDecode(token)
        fetch('/replay/played-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ GameId: gameId, AccountId: accountId })
        })
            .then(response => response.json())
            .then(data => {
                setIsWhite(data.isWhite)
                setStart(data.start)
                setOpponentLogin(data.opponentLogin)
                setFormatName(data.formatName)
                setMoves(data.moves)
                setSeconds(data.defaultTime)
                setOpponentSeconds(data.defaultTime)
                setDefaultTime(data.defaultTime)
            })
    }, [])
    return (<div>
        <span>Игра в формате {formatName} с игроком {opponentLogin} от {start}</span>
        {currentMove > - 1 && <div>Последний ход: {Math.floor((currentMove + 2) / 2) + '.' + moves[currentMove].note}
            {currentMove % 2 == 0 ? " Ход белых" : " Ход черных"}</div>}
        <table className="small-table-right">
            <thead>
                <tr>
                    <th>Белые</th>
                    <th>Черные</th>
                </tr>
            </thead>
            <tbody>
                {
                    moves.map((move, moveIndex) => {
                        const index = moves.indexOf(move)
                        if (index % 2 == 0) {
                            return (
                                <tr key={moveIndex}>
                                    <td
                                        key={moveIndex * 100 + 1}
                                        onClick={() => MoveFromTable(move.fen, index)
                                            && !isWhite}>
                                        {((moveIndex + 2) / 2) + ") " + move.note}</td>
                                    {index + 1 < moves.length && <td
                                        key={moveIndex * 100 + 2}
                                        onClick={() => MoveFromTable(moves[index + 1].fen, index+1)}>
                                        {moves[index + 1].note}</td>}
                                </tr>)
                        }
                    })
                }
            </tbody>
        </table>
        <div className="board" key={boardHash}>
            {game.board.map((row, rowIndex) => (
                <div key={rowIndex} className="row">
                    {row.map((_, colIndex) => RenderSquare(isWhite ? rowIndex : 7 - rowIndex,
                        isWhite ? colIndex : 7 - colIndex))}
                </div>
            ))}
        </div>
        <div className="chess-opponent-timer">
            <span className="time-display">{ConvertSeconds(opponentSeconds)}</span>
        </div>
        <div className="chess-timer">
            <span className="time-display">{ConvertSeconds(seconds)}</span>
        </div>
        <div>
            <button onClick={() => PreviousMove()}>Назад</button>
            <button onClick={() => NextMove()}>Вперед</button></div>
    </div>)
}
export default Replay