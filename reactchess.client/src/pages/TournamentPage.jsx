import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const STATUS_LABEL = {
    upcoming: "Предстоящий",
    ongoing:  "Идёт",
    finished: "Завершён"
};

const STATUS_COLOR = {
    upcoming: "var(--gold)",
    ongoing:  "var(--win)",
    finished: "var(--text-muted)"
};

const TournamentPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = sessionStorage.getItem("token");

    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("participants"); // "participants" | "games"

    const loadData = () => {
        fetch(`/tournament/${id}`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })
            .then(r => r.json())
            .then(d => {
                if (d.error) {
                    toast.error(d.error);
                } else {
                    setData(d);
                }
            });
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleRegister = () => {
        fetch("/tournament/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ TournamentId: Number(id) })
        })
            .then(r => r.json())
            .then(d => {
                if (d.correct) {
                    toast("Вы зарегистрированы на турнир!", { duration: 2000 });
                    loadData();
                } else {
                    toast.error(d.error || "Ошибка при регистрации");
                }
            });
    };

    const handleUnregister = () => {
        fetch("/tournament/unregister", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ TournamentId: Number(id) })
        })
            .then(r => r.json())
            .then(d => {
                if (d.correct) {
                    toast("Регистрация отменена.", { duration: 2000 });
                    loadData();
                } else {
                    toast.error(d.error || "Ошибка");
                }
            });
    };

    const formatDate = (iso) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleString("ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    if (!data) {
        return (
            <div className="page-container">
                <p style={{ color: "var(--text-muted)" }}>Загрузка...</p>
            </div>
        );
    }

    const { tournament, participants, games, isRegistered, canRegister } = data;

    return (
        <div className="page-container">

            {/* ── Шапка турнира ── */}
            <div style={{ marginBottom: "8px" }}>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate("/tournaments")}
                    style={{ marginBottom: "16px" }}
                >
                    ← Все турниры
                </button>
            </div>

            <div className="card" style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <h2 style={{ color: "var(--gold)", marginBottom: "6px" }}>{tournament.name}</h2>
                        <span style={{
                            fontSize: "0.8em",
                            fontWeight: "700",
                            color: STATUS_COLOR[tournament.status],
                            textTransform: "uppercase",
                            letterSpacing: "0.07em"
                        }}>
                            {STATUS_LABEL[tournament.status]}
                        </span>
                    </div>

                    {/* Кнопка регистрации */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {isRegistered && (
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate(`/tournament/${tournament.id}/arena`)}
                            >
                                Войти в арену
                            </button>
                        )}
                        {tournament.status === "upcoming" && !isRegistered && canRegister && (
                            <button className="btn btn-primary" onClick={handleRegister}>
                                Зарегистрироваться
                            </button>
                        )}
                        {tournament.status === "upcoming" && !isRegistered && !canRegister && (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>
                                Требования не выполнены
                            </span>
                        )}
                        {tournament.status === "upcoming" && isRegistered && (
                            <button className="btn btn-danger" onClick={handleUnregister}>
                                Отменить регистрацию
                            </button>
                        )}
                        {tournament.status !== "upcoming" && isRegistered && (
                            <span style={{ color: "var(--win)", fontWeight: "700" }}>✓ Вы участвуете</span>
                        )}
                    </div>
                </div>

                {/* Мета-информация */}
                <div style={{
                    display: "flex",
                    gap: "28px",
                    flexWrap: "wrap",
                    marginTop: "20px",
                    color: "var(--text-muted)",
                    fontSize: "0.9em"
                }}>
                    <span>
                        <span style={{ color: "var(--text-faint)", marginRight: "6px" }}>Начало:</span>
                        <span style={{ color: "var(--text-primary)" }}>{formatDate(tournament.startTime)}</span>
                    </span>
                    <span>
                        <span style={{ color: "var(--text-faint)", marginRight: "6px" }}>Конец:</span>
                        <span style={{ color: "var(--text-primary)" }}>{formatDate(tournament.endTime)}</span>
                    </span>
                    {tournament.passElo > 0 && (
                        <span>
                            <span style={{ color: "var(--text-faint)", marginRight: "6px" }}>Мин. рейтинг:</span>
                            <span style={{ color: "var(--text-primary)" }}>{tournament.passElo}</span>
                        </span>
                    )}
                    {tournament.passTitle && (
                        <span>
                            <span style={{ color: "var(--text-faint)", marginRight: "6px" }}>Требуемый титул:</span>
                            <span style={{ color: "var(--text-primary)" }}>{tournament.passTitle}</span>
                        </span>
                    )}
                    <span>
                        <span style={{ color: "var(--text-faint)", marginRight: "6px" }}>Участников:</span>
                        <span style={{ color: "var(--text-primary)" }}>{tournament.participantCount}</span>
                    </span>
                </div>
            </div>

            {/* ── Вкладки ── */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
                {["participants", "games"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: "none",
                            border: "none",
                            borderBottom: activeTab === tab ? "2px solid var(--gold)" : "2px solid transparent",
                            color: activeTab === tab ? "var(--gold)" : "var(--text-muted)",
                            padding: "10px 20px",
                            fontFamily: "'Cinzel', serif",
                            fontSize: "0.88rem",
                            fontWeight: "600",
                            letterSpacing: "0.06em",
                            cursor: "pointer",
                            borderRadius: "0",
                            transition: "color 0.2s, border-bottom-color 0.2s",
                            marginBottom: "-1px"
                        }}
                    >
                        {tab === "participants" ? `Участники (${participants.length})` : `Партии (${games.length})`}
                    </button>
                ))}
            </div>

            {/* ── Участники ── */}
            {activeTab === "participants" && (
                <div className="card">
                    {participants.length === 0 ? (
                        <p style={{ color: "var(--text-muted)" }}>Участников пока нет.</p>
                    ) : (
                        <table className="elo-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Игрок</th>
                                    <th>Рейтинг</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map((p, idx) => (
                                    <tr
                                        key={p.accountId}
                                        style={{ cursor: "pointer" }}
                                        onClick={() => navigate(`/user-profile/${p.accountId}`)}
                                    >
                                        <td style={{ color: "var(--text-muted)", width: "40px" }}>{idx + 1}</td>
                                        <td>
                                            <span style={{ color: "var(--text-primary)" }}>{p.login}</span>
                                            {p.title && (
                                                <span className="player-title-badge" style={{ marginLeft: "8px" }}>
                                                    {p.title}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-gold">{p.elo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Партии ── */}
            {activeTab === "games" && (
                <div className="card">
                    {games.length === 0 ? (
                        <p style={{ color: "var(--text-muted)" }}>Партий пока нет.</p>
                    ) : (
                        <div className="games-list" style={{ marginTop: 0 }}>
                            {games.map(g => (
                                <div
                                    key={g.id}
                                    className="game-item"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => navigate(`/replay/${g.id}/${g.whitesId}`)}
                                >
                                    <span>
                                        <img
                                            className="format-icon"
                                            src={`/formats/${g.formatName}.svg`}
                                            alt={g.formatName}
                                        />
                                    </span>
                                    <span className="game-opponent">
                                        {g.whitesLogin}
                                    </span>
                                    <span style={{ color: "var(--text-muted)", margin: "0 6px" }}>vs</span>
                                    <span className="game-opponent">
                                        {g.blacksLogin}
                                    </span>
                                    <span
                                        className={`game-result-badge ${
                                            g.result === "White" ? "status-win" :
                                            g.result === "Black" ? "status-loss" :
                                            g.result === "Draw" ? "status-draw" : "status-active"
                                        }`}
                                        style={{ marginLeft: "auto" }}
                                    >
                                        {g.status}
                                    </span>
                                    <span className="game-date">{formatDate(g.startTime)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TournamentPage;
