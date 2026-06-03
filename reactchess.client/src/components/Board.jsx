import React, { useState, useEffect, useMemo } from 'react';
import ChessBoard from '../components/Game.jsx';
import GameOverModal from '../components/GameOverModal.jsx'
import TrasformationModal from '../components/TransformationModal.jsx'
import ConfirmButton from './ConfirmButton.jsx';
import { toast, Toaster } from 'sonner';
import useBeforeUnload from '../components/BeforeUnload.jsx'
import WarningForm from './WarningForm.jsx';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
const DrawBoard = ({ connection, isWhite, gameId, baseTime, addTime,formatId, isDuel, onStartNew }) => {
    const token = sessionStorage.getItem('token');
    const decoded = jwtDecode(token)
    const accountId = decoded.nameid
    const navigate = useNavigate();
    const [draggedFigure, setDraggedFigure] = useState({ piece: null, loc: [] })
    const [boardHash, setBoardHash] = useState(0);
    const [moves, setMoves] = useState([])
    const [log, setLog] = useState("")
    const [status, setStatus] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isTransformModalOpen, setIsTranformModalOpen] = useState(false)
    const [transformingPawnLoc, setTransformingPawnLoc] = useState([])
    const [modalData, setModalData] = useState({ message: "", old_elo: 0, new_elo: 0 })
    const [hasMoveBackMessage, setHasMoveBackMessage] = useState(false)
    const [moveHistory, setMoveHistory] = useState([])
    const [isMoveFromHistory, setIsMoveFromHistory] = useState(false)
    const [seconds, setSeconds] = useState(baseTime)
    const [isActive, setIsActive] = useState(isWhite)
    const [isOpponentActive, setIsOpponentActive] = useState(!isWhite)
    const [ending, setEnding] = useState(Math.floor(Date.now() / 1000) + baseTime)
    const [opponentSeconds, setOpponentSeconds] = useState(baseTime)
    const [opponentEnding, setOpponentEnding] = useState(Math.floor(Date.now() / 1000) + baseTime)
    const [pingCompensation, setPingCompensation] = useState(0)
    const [opponentPingCompensation, setOpponentPingCompensation] = useState(0)
    const [missingPieces, setMissingPieces] = useState([])
    const [opponentMissingPieces, setOpponentMissingPieces] = useState([])
    const [advantage, setAdvantage] = useState(0)
    const [isDirty, setIsDirty] = useState(true)
    const [playerLogin, setPlayerLogin] = useState("")
    const [opponentLogin, setOpponentLogin] = useState("")
    const [playerElo, setPlayerElo] = useState(0)
    const [opponentElo, setOpponentElo] = useState(0)
    const [playerTitle, setPlayerTitle] = useState("")
    const [opponentTitle, setOpponentTitle] = useState("")
    const [opponentId, setOpponentId] = useState(0)
    const [isFriend, setIsFriend] = useState(false)
    const [isOver, setIsOver] = useState(false)
    const [dl, setDl] = useState(0)
    dl
    log
    useBeforeUnload(isDirty)
    const game = useMemo(() => {
        const instance = new ChessBoard()
        instance.ReadFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        return instance
    }, [])
    const DragHandle = (e, data) => {
        if (data.piece.color == game.currentPlayer) {
            setDraggedFigure(data)
            setMoves(game.GetMoves(data.piece, data.loc, true))
            e.target.style.opacity = '1.0';
        }
    }
    const CheckForMissings = () => {
        const missings = game.GetAllMissings()
        let player_missings = []
        let opponent_missings = []
        let counted_advantage = 0
        missings.map(piece => {
            if (piece.color == 'w' && isWhite || piece.color == 'b' && !isWhite) {
                player_missings.push(piece)
                counted_advantage -= piece.GetCost()
            }
            else {
                opponent_missings.push(piece)
                counted_advantage += piece.GetCost()
            }
        })
        setMissingPieces(player_missings)
        setOpponentMissingPieces(opponent_missings)
        setAdvantage(counted_advantage)
    }
    const RegisterMove = (piece, loc, dest) => {
        //setMessage(figure?.type + " " + loc + " to " + dest + " " + boardHash)
        boardHash;
        const response = game.MakeMove(loc, dest)
        setBoardHash(prev => prev + 1)
        setMoves([])
        if (response != "NotLegal") {
            if (response == "Tranformation") {
                setTransformingPawnLoc(dest)
                setIsTranformModalOpen(true)
            }
            else {
                setLog(game.WriteToFEN() + " " + response)
                setIsActive(false)
                setIsOpponentActive(true)
                setOpponentEnding(Math.floor(GetTrueTime() / 1000) + opponentSeconds)
                setSeconds(prev => prev + addTime)
                let castling_type = ""
                if (piece.type == 'k' && loc[1] == 4) {
                    if (dest[1] == 0)
                        castling_type = "0-0-0";
                    else if (dest[1] == 7)
                        castling_type = "0-0";
                }
                const newMove = (castling_type == "" ?
                    (piece.type == 'p' ? "" : piece.type.toUpperCase()) + game.GetNotationFromCoords([dest[0], dest[1]]) :
                    castling_type) + (response == "Check" ? "+" : "")
                const FEN = game.WriteToFEN()
                setMoveHistory(prev => [...prev, [newMove, FEN]])
                setStatus(response + (isWhite ? " White" : " Black"))
                CheckForMissings()
                connection.invoke("SendMove", String(gameId), FEN, response +
                    (isWhite ? " White" : " Black"))
            }
        }
        if (hasMoveBackMessage)
            DenyMoveBack()
    }
    const TransformPawn = (type, color) => {
        const response = game.TransformPiece(type, color, transformingPawnLoc)
        setLog(game.WriteToFEN() + " " + response)
        setIsActive(false)
        setIsOpponentActive(true)
        setOpponentEnding(Math.floor(GetTrueTime() / 1000) + opponentSeconds)
        setSeconds(prev => prev + addTime)
        const newMove = game.GetNotationFromCoords([transformingPawnLoc[0], transformingPawnLoc[1]]) + "=" + type.toUpperCase()
            + (response == "Check" ? "+" : "")
        const FEN = game.WriteToFEN()
        setMoveHistory(prev => [...prev, [newMove, FEN]])
        setStatus(response + (isWhite ? " White" : " Black"))
        CheckForMissings()
        connection.invoke("SendMove", String(gameId), FEN, response +
            (isWhite ? " White" : " Black"))
    }
    const Concede = () => {
        connection.invoke("SendConcede", String(gameId))
    }
    const Draw = () => {
        connection.invoke("AskForDraw", String(gameId))
    }
    const AcceptDraw = () => {
        connection.invoke("AcceptDraw", String(gameId))
    }
    const DenyDraw = () => {
        connection.invoke("DenyDraw", String(gameId))
    }
    const MoveBack = () => {
        connection.invoke("AskForMoveBack", String(gameId))
    }
    const AcceptMoveBack = () => {
        connection.invoke("AcceptMoveBack", String(gameId), isWhite ? 'b' : 'w')
        setHasMoveBackMessage(false)
    }
    const DenyMoveBack = () => {
        connection.invoke("DenyMoveBack", String(gameId))
        setHasMoveBackMessage(false)
        toast.dismiss()
    }
    const IsInMoves = (row, column) => {
        let b = false
        moves.map((move) => b = (move[0] == row && move[1] == column) ? true : b)
        return b
    }
    const DefineOutline = (row, column) => {
        if (IsInMoves(row, column)) { return "target" }
        if (game.board[row][column]?.type == 'k' && game.board[row][column]?.color == 'b' &&
            status == "Check White" ||
            game.board[row][column]?.type == 'k' && game.board[row][column]?.color == 'w' &&
            status == "Check Black") { return "checked" }
        return ""
    }
    const OpenUserProfile = (accountId) => {
        navigate(`/user-profile/${accountId}`)
    }
    const WatchMoveFromHistory = (FEN, isActual) => {
        game.ReadFromFEN(FEN)
        setIsMoveFromHistory(!isActual)
        setBoardHash(prev => prev + 1)
    }
    const RenderSquare = (row, column) => {
        const squareClass = 'square-' + ((row + column) % 2 == 0 ? 'white' : 'black')
        return (
            <span
                key={`${row}-${column}`}
                className={DefineOutline(row, column)}>
                <span
                    className={squareClass}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => RegisterMove(draggedFigure.piece, draggedFigure.loc, [row, column])}>
                    {game.board[row][column] && (< img src={'/pieces/' + game.board[row][column]?.getSprite()} className={"piece-svg" +
                        ((game.board[row][column].color == 'w' && game.currentPlayer == 'w' && isWhite ||
                            game.board[row][column].color == 'b' && game.currentPlayer == 'b' && !isWhite) && !isMoveFromHistory ? "-ours" : "")} 
                        draggable={(game.board[row][column].color == 'w' && game.currentPlayer == 'w' && isWhite ||
                            game.board[row][column].color == 'b' && game.currentPlayer == 'b' && !isWhite) && !isMoveFromHistory ? "true" : "false"}
                        onDragStart={(e) => DragHandle(e, { piece: game.board[row][column], loc: [row, column] })}
                        onDragEnd={() => setMoves([])} />)}

                </span>
            </span>
        )
    }
    const ConvertSeconds = (seconds) => {
        const minutes = Math.floor(seconds / 60)
        const free_seconds = seconds % 60
        return (minutes < 10 ? "0" : "") + minutes + ":" + (free_seconds < 10 ? "0" : "") + free_seconds
    }
    const GetTrueTime = () => {
        const offset = localStorage.getItem('serverOffset')
        return Math.floor(Date.now() + Number(offset))
    }
    useEffect(() => {
        fetch('/game/load-players-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({IsWhite: isWhite, GameId: gameId})
        })
            .then(response => response.json())
            .then(data => {
                setPlayerLogin(data.login)
                setPlayerElo(data.elo)
                setPlayerTitle(data.title)
                setOpponentLogin(data.opponentLogin)
                setOpponentElo(data.opponentElo)
                setOpponentTitle(data.opponentTitle)
                setOpponentId(data.opponentId)
                setIsFriend(data.isFriend)
            })
    }, [])
    useEffect(() => {
        if (isModalOpen) {
            setIsDirty(false)
            setIsOver(true)
        }
    }, [isModalOpen])
    useEffect(() => {
        let interval = null;

        // Переводим всё в одну систему (мс) для расчетов
        const endingMs = ending * 1000;

        if (isActive && !isOver && GetTrueTime() < endingMs) {
            interval = setInterval(() => {
                const now = GetTrueTime();
                const diff = endingMs - now;
                const newValue = Math.ceil(diff / 1000) - pingCompensation
                if (newValue > seconds + addTime && pingCompensation == 0) {
                    setPingCompensation(newValue - seconds)
                }
                if (diff <= 0) {
                    setSeconds(0);
                    clearInterval(interval);
                    connection.invoke("SendTimesUp", gameId)
                } else {
                    // Используем Math.ceil, чтобы 0.1 сек превращалась в 1, а не в 0
                    setSeconds(prev => {
                        if (prev >= newValue)
                            return newValue
                        else {
                            return prev
                        }
                    });
                }
            }, 100); // Чаще = плавнее
        }

        return () => clearInterval(interval);
    }, [isActive, ending, isOver]); // seconds здесь нет — и это победа
    useEffect(() => {
        let interval = null;

        // Переводим всё в одну систему (мс) для расчетов
        const endingMs = opponentEnding * 1000;

        if (isOpponentActive && !isOver && GetTrueTime() < endingMs) {
            interval = setInterval(() => {
                const now = GetTrueTime();
                const diff = endingMs - now;
                const newValue = Math.ceil(diff / 1000) - opponentPingCompensation
                if (newValue > opponentSeconds + addTime && opponentPingCompensation == 0)
                    setOpponentPingCompensation(newValue - opponentSeconds)
                if (diff <= 0) {
                    setOpponentSeconds(0);
                    clearInterval(interval);
                } else {
                    // Используем Math.ceil, чтобы 0.1 сек превращалась в 1, а не в 0
                    setOpponentSeconds(prev => {
                        if (prev >= newValue)
                            return newValue
                        else {
                            return prev
                        }
                    });
                }
            }, 100); // Чаще = плавнее
        }

        return () => clearInterval(interval);
    }, [isOpponentActive, opponentEnding, isOver]); // seconds здесь нет — и это победа
    useEffect(() => {
        const handleMoveReceived = (data) => {
            if (data.status == "MoveBack") {
                let moveIndex = -1
                moveHistory.map(move => moveIndex = move[1] == data.fen ? moveHistory.indexOf(move) : moveIndex)
                let newHistory = [...moveHistory]
                for (let i = moveIndex+1; i < moveHistory.length; i++)
                    newHistory.pop()
                setMoveHistory(newHistory)
            }
            if (data.fen != "no_fen")
            {
                game.ReadFromFEN(data.fen)
            };
            setIsMoveFromHistory(false)
            setLog(data.fen);
            setIsActive(true);
            setIsOpponentActive(false)
            const published = localStorage.getItem('atPublish')
            setEnding(Math.floor(published / 1000) + seconds)
            setOpponentEnding(prev => prev + addTime)
            setStatus(data.status)
            setBoardHash(Math.random());
            if (data.moveNote != undefined)
                setMoveHistory(prev => [...prev, [(data.moveNote) + (data.status.split(' ')[0] == 'Check' ? "+" : ""), data.fen]])
            console.log(moveHistory[0])
            CheckForMissings()
            setIsModalOpen(data.gameOver)
            if (data.gameOver)
                setModalData(data.gameOverData)
        };
        const handleDrawReceived = () => {
            toast("Запрос ничьи", {
                description: "Согласиться на ничью?",
                duration: Infinity, // Тост не исчезнет сам, пока пользователь не нажмет
                action: {
                    label: "Подтвердить",
                    onClick: () => AcceptDraw(),
                },
                cancel: {
                    label: "Отмена",
                    onClick: () => DenyDraw(),
                },
            });
        };
        const handleDrawDenied = () => {
            toast("Предложение ничьи отвергнуто")
        }
        const handleMoveBackReceived = () => {
            toast("Запрос возвращения хода", {
                description: "Согласиться на возвращение позиции?",
                duration: Infinity, // Тост не исчезнет сам, пока пользователь не нажмет
                action: {
                    label: "Подтвердить",
                    onClick: () => AcceptMoveBack(),
                },
                cancel: {
                    label: "Отмена",
                    onClick: () => DenyMoveBack(),
                },
            });
            setHasMoveBackMessage(true)
        }
        const handleMoveBackDenied = () => {
            toast("Возвращение хода отвергнуто")
        }
        const hadleTimeCorrect = (data) => {
            if (data.own) {
                setSeconds(Math.floor((data.time - GetTrueTime()) / 1000))
                setPingCompensation(0)
            }
            else {
                setOpponentSeconds(Math.floor((data.time - GetTrueTime()) / 1000))
                setOpponentPingCompensation(0)
            }
            setDl(data.time)
            localStorage.setItem('atPublish', data.timeAtPublish)
        }
        const handleOffsetCorrect = (data) => {
            const offset = data.serverTime - Date.now()
            localStorage.setItem('serverOffset', offset)
        }
        connection.on("MoveReceived", handleMoveReceived);
        connection.on("DrawReceived", handleDrawReceived)
        connection.on("DrawDenied", handleDrawDenied)
        connection.on("MoveBackReceived", handleMoveBackReceived)
        connection.on("MoveBackDenied", handleMoveBackDenied)
        connection.on("TimeCorrect", hadleTimeCorrect)
        connection.on("OffsetCorrect", handleOffsetCorrect)
        return () => {
            connection.off("MoveReceived", handleMoveReceived);
            connection.off("DrawReceived", handleDrawReceived)
            connection.off("DrawDenied", handleDrawDenied)
            connection.off("MoveBackReceived", handleMoveBackReceived)
            connection.off("MoveBackDenied", handleMoveBackDenied)
            connection.off("TimeCorrect", hadleTimeCorrect)
            connection.off("OffsetCorrect", handleOffsetCorrect)
        };
    }, [connection, game, moveHistory])
    return (
        <div className="board-wrapper">
            <div className="game-panel">
                <div className={`player-info ${isOpponentActive ? 'active-player' : ''}`} onClick={() => OpenUserProfile(opponentId)}>
                    <div>
                        <div className="player-name">
                            {opponentTitle && <span className="player-title-badge">{opponentTitle}</span>}
                            {opponentLogin}
                        </div>
                        <div className="player-elo">{opponentElo}</div>
                    </div>
                    <div className={`chess-timer ${opponentSeconds < 30 ? 'timer-warning' : ''}`}>
                        {ConvertSeconds(opponentSeconds)}
                    </div>
                </div>
                {missingPieces.length > 0 &&
                <div className="captured-pieces">
                {missingPieces.map(piece => {
                    return (
                        <span key={missingPieces.indexOf(piece)}>
                            <img src={'/pieces/' + piece.getSprite()} />
                        </span>
                    )
                })}
                {advantage < 0 && (<p>+{-advantage}</p>)}
                </div>}
            <table className="small-table-right">
                <thead>
                    <tr>
                        <th>Белые</th>
                        <th>Черные</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        moveHistory.map((move,moveIndex) => {
                            const index = moveHistory.indexOf(move)
                            if (index % 2 == 0) {
                                return(
                                    <tr key={moveIndex}>
                                        <td
                                            key={moveIndex * 100 + 1}
                                            onClick={() => WatchMoveFromHistory(move[1], index == moveHistory.length - 1)
                                                && !isWhite}>
                                            {((moveIndex + 2) / 2) + ") " + move[0]}</td>
                                        {index + 1 < moveHistory.length && <td
                                            key={moveIndex * 100 + 2}
                                            onClick={() => WatchMoveFromHistory(moveHistory[index + 1][1], (index == moveHistory.length - 2)
                                                && isWhite)}>
                                            {moveHistory[index + 1][0]}</td>}
                                </tr>)
                            }
                        })
                    }
                </tbody>
            </table>
            <Toaster position="top-right" richColors closeButton />
                <div className="board" key={boardHash}>
                {game.board.map((row, rowIndex) => (
                    <div key={rowIndex} className="row">
                        {row.map((_, colIndex) => RenderSquare(isWhite ? rowIndex : 7 - rowIndex,
                            isWhite?colIndex:7 - colIndex))}
                    </div>
                ))}
            </div>
            {/*<div className="chess-opponent-timer">*/}
            {/*    <span className="time-display">{ConvertSeconds(opponentSeconds)}</span>*/}
            {/*</div>*/}
            {/*<div className="chess-timer">*/}
            {/*    <span className="time-display">{ConvertSeconds(seconds)}</span>*/}
            {/*</div>*/}
                <div className= "game-actions">
            <ConfirmButton onConfirm={() => Concede()} title="Сдаться" />
            <ConfirmButton onConfirm={() => Draw()} title="Предложить ничью" />
                <ConfirmButton onConfirm={() => MoveBack()} title="Вернуть ход" />
                </div>
                {opponentMissingPieces.length > 0 &&
                    <div className="captured-pieces">
                        {opponentMissingPieces.map(piece => {
                            return (
                                <span key={opponentMissingPieces.indexOf(piece)}>
                                    <img src={'/pieces/' + piece.getSprite()} />
                                </span>
                            )
                        })}
                        {advantage > 0 && (<p>+{advantage}</p>)}
                    </div>}
                <div className={`player-info ${isActive ? 'active-player' : ''}`} onClick={() => OpenUserProfile(accountId)}>
                    <div>
                        <div className="player-name">
                            {playerTitle && <span className="player-title-badge">{playerTitle}</span>}
                            {playerLogin}
                        </div>
                        <div className="player-elo">{playerElo}</div>
                    </div>
                    <div className={`chess-timer ${seconds < 30 ? 'timer-warning' : ''}`}>
                        {ConvertSeconds(seconds)}
                    </div>
            </div>
            <WarningForm isDirty={isDirty} message="Выход из партии засчитается как автоматическое поражение. Вы действительно хотите выйти?">
            </WarningForm>
            <GameOverModal isOpen={isModalOpen}
                message={modalData.message}
                new_elo={modalData.new_elo}
                old_elo={modalData.old_elo}
                onStartNew={() => onStartNew()}
                opponentId={opponentId}
                formatId={formatId}
                gameId={gameId}
                isFriend={isFriend}
                isDuel={isDuel }
                onClose={() => setIsModalOpen(false)}>
                <p>игра окончена, это модальное окно... вот</p>
            </GameOverModal>
            <TrasformationModal isOpen={isTransformModalOpen}
                isWhite={isWhite}
                onClose={() => setIsTranformModalOpen(false)}
                onSelect={(type, color) => TransformPawn(type, color)}
            >
                </TrasformationModal>
            </div>
        </div>
    )
}

export default DrawBoard