import React, { useState, useEffect, useMemo } from 'react';
import ChessBoard from '../components/Game.jsx';
import GameOverModal from '../components/GameOverModal.jsx'
import TrasformationModal from '../components/TransformationModal.jsx'
import ConfirmButton from './ConfirmButton.jsx';
import { toast, Toaster } from 'sonner';
import useBeforeUnload from '../components/BeforeUnload.jsx'
import WarningForm from './WarningForm.jsx';
const DrawBoard = ({ connection, isWhite, gameId, baseTime, addTime }) => {
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
    const [dl, setDl] = useState(0)
    dl
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
                connection.invoke("SendMove", gameId, FEN, response +
                    (isWhite ? " White" : " Black"))
            }
        }
        if (hasMoveBackMessage)
            DenyMoveBack()
    }
    const TransformPawn = (type, color) => {
        game.TransformPiece(type, color, transformingPawnLoc)
        const newMove = game.GetNotationFromCoords([transformingPawnLoc[0], transformingPawnLoc[1]]) + "=" + type.toUpperCase()
        const FEN = game.WriteToFEN()
        setMoveHistory(prev => [...prev, [newMove, FEN]])
        setStatus("MoveDone" + (isWhite ? " White" : " Black"))
        connection.invoke("SendMove", gameId, FEN, "MoveDone" +
            (isWhite ? " White" : " Black"))
    }
    const Concede = () => {
        connection.invoke("SendConcede", gameId)
    }
    const Draw = () => {
        connection.invoke("AskForDraw", gameId)
    }
    const AcceptDraw = () => {
        connection.invoke("AcceptDraw", gameId)
    }
    const DenyDraw = () => {
        connection.invoke("DenyDraw", gameId)
    }
    const MoveBack = () => {
        connection.invoke("AskForMoveBack", gameId)
    }
    const AcceptMoveBack = () => {
        connection.invoke("AcceptMoveBack", gameId, isWhite ? 'b' : 'w')
        setHasMoveBackMessage(false)
    }
    const DenyMoveBack = () => {
        connection.invoke("DenyMoveBack", gameId)
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
                    {game.board[row][column] && (< img src={'/pieces/' + game.board[row][column]?.getSprite()} className="piece-svg"
                        draggable={(game.board[row][column].color == 'w' && isWhite ||
                            game.board[row][column].color == 'b' && !isWhite) && !isMoveFromHistory ? "true" : "false"}
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
        fetch('game/load-players-data', {
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
            })
    }, [])
    useEffect(() => {
        let interval = null;

        // Переводим всё в одну систему (мс) для расчетов
        const endingMs = ending * 1000;

        if (isActive && GetTrueTime() < endingMs) {
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
    }, [isActive, ending]); // seconds здесь нет — и это победа
    useEffect(() => {
        let interval = null;

        // Переводим всё в одну систему (мс) для расчетов
        const endingMs = opponentEnding * 1000;

        if (isOpponentActive && GetTrueTime() < endingMs) {
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
    }, [isOpponentActive, opponentEnding]); // seconds здесь нет — и это победа
    useEffect(() => {
        if (isModalOpen)
            setIsDirty(false)
    }, [isModalOpen])
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
        <div>
            <div className="player-card">
                <span className="player-login">{opponentLogin}</span>
                <span className="player-elo">{"(" + opponentElo + ")"}</span>
                {opponentTitle != null && <span>{opponentTitle}</span>}
            </div>
            <div className="eaten-pieces-container">
                {missingPieces.map(piece => {
                    return (
                        <span key={missingPieces.indexOf(piece)}>
                            <img src={'/pieces/' + piece.getSprite()} />
                        </span>
                    )
                })}
                {advantage < 0 && (<p>+{-advantage}</p>)}
            </div>
            {log}
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
            <div className="chess-opponent-timer">
                <span className="time-display">{ConvertSeconds(opponentSeconds)}</span>
            </div>
            <div className="chess-timer">
                <span className="time-display">{ConvertSeconds(seconds)}</span>
            </div>
            <div className = "fixed-container">
            <ConfirmButton onConfirm={() => Concede()} title="Сдаться" />
            <ConfirmButton onConfirm={() => Draw()} title="Предложить ничью" />
                <ConfirmButton onConfirm={() => MoveBack()} title="Вернуть ход" />
            </div>
            <div className="eaten-pieces-container">
                {opponentMissingPieces.map(piece => {
                    return(
                        <span key={opponentMissingPieces.indexOf(piece)}>
                            <img src={'/pieces/' + piece.getSprite()} />
                        </span>
                    )
                })}
                {advantage > 0 && (<p>+{advantage}</p>)}
            </div>
            <div className="player-card">
                <span className="player-login">{playerLogin}</span>
                <span className="player-elo">{"(" + playerElo + ")"}</span>
                {playerTitle != null && <span>{playerTitle}</span>}
            </div>
            <WarningForm isDirty={isDirty}></WarningForm>
            <GameOverModal isOpen={isModalOpen}
                message={modalData.message}
                new_elo={modalData.new_elo}
                old_elo={modalData.old_elo}
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
    )
}

export default DrawBoard