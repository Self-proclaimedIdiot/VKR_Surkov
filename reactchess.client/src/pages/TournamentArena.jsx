import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import DrawBoard from "../components/Board.jsx";

const TournamentArena = () => {
    const { id: tournamentId } = useParams();
    const navigate = useNavigate();
    const token = sessionStorage.getItem("token");
    const myAccountId = Number(jwtDecode(token).nameid);

    const [connection, setConnection] = useState(null);
    const [tournament, setTournament] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);

    // Состояние поиска/игры — аналогично RegularPlay
    const [inQueue, setInQueue] = useState(false);
    const [isGameFound, setIsGameFound] = useState(false);
    const [isWhite, setIsWhite] = useState(false);
    const [gameId, setGameId] = useState(0);
    const [baseTime, setBaseTime] = useState(0);
    const [addTime, setAddTime] = useState(0);
    const [formatId, setFormatId] = useState(0);

    // ── Загружаем данные турнира и таблицу лидеров ──
    const loadLeaderboard = () => {
        fetch(`/tournament/${tournamentId}/leaderboard`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(d => {
                setTournament(d.tournament);
                setLeaderboard(d.leaderboard);
            });
    };

    useEffect(() => {
        loadLeaderboard();
    }, [tournamentId]);

    // ── Подключение к chess-hub — точно как в RegularPlay ──
    useEffect(() => {
        const newConn = new signalR.HubConnectionBuilder()
            .withUrl("https://localhost:7039/chess-hub", {
                accessTokenFactory: () => sessionStorage.getItem("token")
            })
            .withAutomaticReconnect()
            .build();

        newConn.start()
            .then(() => {
                setConnection(newConn);
            })
            .catch(e => console.error("Chess hub connection failed:", e));

        return () => {
            if (newConn) newConn.stop();
        };
    }, []);

    // ── Слушаем GameStarted — аналогично RegularPlay ──
    useEffect(() => {
        if (!connection) return;

        const onGameStarted = (data) => {
            const white = data.white ?? data.White;
            const receivedGameId = data.gameId ?? data.GameId;
            setIsWhite(String(white) === String(myAccountId));
            setGameId(Number(receivedGameId));
            setIsGameFound(true);
            setInQueue(false);
        };

        connection.on("GameStarted", onGameStarted);
        return () => connection.off("GameStarted", onGameStarted);
    }, [connection, myAccountId]);

    // ── Загрузить время формата после начала игры (как DuelPlay) ──
    useEffect(() => {
        if (!gameId) return;
        fetch("/duel/get-format-time", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ AccountId: myAccountId, FormatId: 1, GameId: gameId })
        })
            .then(r => r.json())
            .then(d => {
                setBaseTime(d.baseTime);
                setAddTime(d.addTime);
                setFormatId(1);
            });
    }, [gameId]);

    const handleJoinQueue = () => {
        if (!connection) return;
        connection.invoke("ClearLogs");
        connection.invoke("JoinArenaQueue", Number(tournamentId));
        setInQueue(true);
        toast("Ищем соперника...", { duration: 2000 });
    };

    const handleGameFinished = () => {
        // Возвращаемся в лобби, обновляем таблицу
        setIsGameFound(false);
        setGameId(0);
        setInQueue(false);
        loadLeaderboard();
    };

    // ── Рендер игры — передаём connection напрямую в DrawBoard, без изменений ──
    if (isGameFound && gameId && baseTime > 0) {
        return (
            <div>
                <div style={{ padding: "10px 20px", background: "var(--surface-1)", display: "flex", gap: "16px", alignItems: "center" }}>
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                        🏆 Арена: {tournament?.name ?? `Турнир #${tournamentId}`}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>Партия идёт...</span>
                </div>
                <DrawBoard
                    key={gameId}
                    connection={connection}
                    isWhite={isWhite}
                    gameId={gameId}
                    baseTime={baseTime}
                    addTime={addTime}
                    isDuel={false}
                    formatId={formatId}
                    onStartNew={handleGameFinished}
                />
            </div>
        );
    }

    // ── Лобби ──
    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/tournament/${tournamentId}`)}
                        style={{ marginBottom: "8px" }}
                    >
                        ← К турниру
                    </button>
                    <h2 style={{ color: "var(--gold)" }}>
                        Арена{tournament ? `: ${tournament.name}` : ""}
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88em", marginTop: "4px" }}>
                        Играйте неограниченное количество партий против других участников.
                        2 очка за победу, 1 за ничью.
                    </p>
                </div>

                <div style={{ textAlign: "right", paddingTop: "30px" }}>
                    {!inQueue ? (
                        <button className="btn btn-primary" onClick={handleJoinQueue}>
                            Найти партию
                        </button>
                    ) : (
                        <div>
                            <div className="search-status" style={{ marginBottom: "8px" }}>
                                Поиск соперника...
                                <div className="search-spinner" />
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={() => setInQueue(false)}>
                                Отмена
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Таблица лидеров */}
            <div className="card">
                <h3 style={{ marginBottom: "16px", color: "var(--gold)" }}>Таблица лидеров</h3>
                {leaderboard.length === 0 ? (
                    <p style={{ color: "var(--text-muted)" }}>Партии ещё не сыграны. Станьте первым!</p>
                ) : (
                    <table className="elo-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Игрок</th>
                                <th title="Победы / Ничьи / Поражения">В / Н / П</th>
                                <th title="2 за победу, 1 за ничью">Очки</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((row, idx) => (
                                <tr
                                    key={row.accountId}
                                    style={{
                                        cursor: "pointer",
                                        background: row.accountId === myAccountId
                                            ? "rgba(212,175,55,0.07)" : undefined
                                    }}
                                    onClick={() => navigate(`/user-profile/${row.accountId}`)}
                                >
                                    <td style={{ color: "var(--text-muted)", width: "36px" }}>
                                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                                    </td>
                                    <td>
                                        {row.login}
                                        {row.title && (
                                            <span className="player-title-badge" style={{ marginLeft: "6px" }}>
                                                {row.title}
                                            </span>
                                        )}
                                        {row.accountId === myAccountId && (
                                            <span style={{ color: "var(--gold)", fontSize: "0.8em", marginLeft: "6px" }}>
                                                (вы)
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: "0.85em" }}>
                                        <span style={{ color: "var(--win)" }}>{row.wins}</span>
                                        {" / "}
                                        <span style={{ color: "var(--text-muted)" }}>{row.draws}</span>
                                        {" / "}
                                        <span style={{ color: "var(--loss)" }}>{row.losses}</span>
                                    </td>
                                    <td className="text-gold" style={{ fontWeight: 700 }}>{row.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TournamentArena;
