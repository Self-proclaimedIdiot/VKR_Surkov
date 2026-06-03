import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

const Tournaments = () => {
    const [tournaments, setTournaments] = useState([]);
    const [search, setSearch] = useState("");
    const token = sessionStorage.getItem("token");
    const navigate = useNavigate();

    const loadTournaments = (q = "") => {
        const url = q.trim()
            ? `/tournament/search?name=${encodeURIComponent(q)}`
            : "/tournament/search";

        fetch(url, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        })
            .then(r => r.json())
            .then(data => setTournaments(data.tournaments));
    };

    useEffect(() => {
        loadTournaments();
    }, []);

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
        loadTournaments(val);
    };

    const handleRegister = (tournamentId) => {
        fetch("/tournament/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ TournamentId: tournamentId })
        })
            .then(r => r.json())
            .then(data => {
                if (data.correct) {
                    toast("Вы зарегистрированы на турнир!", { duration: 2000 });
                    loadTournaments(search);
                } else {
                    toast.error(data.error || "Ошибка при регистрации");
                }
            });
    };

    const handleUnregister = (tournamentId) => {
        fetch("/tournament/unregister", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ TournamentId: tournamentId })
        })
            .then(r => r.json())
            .then(data => {
                if (data.correct) {
                    toast("Регистрация отменена.", { duration: 2000 });
                    loadTournaments(search);
                } else {
                    toast.error(data.error || "Ошибка при отмене");
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

    return (
        <div className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2>Турниры</h2>
                <input
                    type="text"
                    className="user-input"
                    placeholder="Поиск по названию..."
                    value={search}
                    onChange={handleSearch}
                    style={{ width: "260px" }}
                />
            </div>

            <div className="reports-list">
                {tournaments.length === 0 && (
                    <p style={{ color: "var(--text-muted)" }}>Турниры не найдены.</p>
                )}

                {tournaments.map(t => (
                    <div className="report-card" key={t.id}>
                        <div className="report-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span
                                style={{ fontWeight: "bold", fontSize: "1.08em", cursor: "pointer", color: "var(--gold)" }}
                                onClick={() => navigate(`/tournament/${t.id}`)}
                            >
                                {t.name}
                            </span>
                            <span style={{
                                fontSize: "0.8em",
                                fontWeight: "700",
                                color: STATUS_COLOR[t.status],
                                letterSpacing: "0.06em",
                                textTransform: "uppercase"
                            }}>
                                {STATUS_LABEL[t.status]}
                            </span>
                        </div>

                        <p className="report-text" style={{ marginTop: "8px" }}>
                            {t.passElo > 0 && <span>Мин. рейтинг: <strong>{t.passElo}</strong> &nbsp;</span>}
                            {t.passTitle && <span>Титул: <strong>{t.passTitle}</strong> &nbsp;</span>}
                            <span style={{ color: "var(--text-muted)" }}>Участники: {t.participantCount}</span>
                        </p>

                        <p className="report-text" style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>
                            {formatDate(t.startTime)} — {formatDate(t.endTime)}
                        </p>

                        <div className="report-actions" style={{ marginTop: "12px" }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => navigate(`/tournament/${t.id}`)}
                            >
                                Подробнее
                            </button>

                            {t.status === "upcoming" && !t.isRegistered && t.canRegister && (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleRegister(t.id)}
                                >
                                    Зарегистрироваться
                                </button>
                            )}

                            {t.status === "upcoming" && !t.isRegistered && !t.canRegister && (
                                <span style={{ color: "var(--text-muted)", fontSize: "0.83em", alignSelf: "center" }}>
                                    Требования не выполнены
                                </span>
                            )}

                            {t.status === "upcoming" && t.isRegistered && (
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleUnregister(t.id)}
                                >
                                    Отменить регистрацию
                                </button>
                            )}

                            {t.status !== "upcoming" && t.isRegistered && (
                                <span style={{ color: "var(--win)", fontSize: "0.83em", fontWeight: "700", alignSelf: "center" }}>
                                    ✓ Вы участвуете
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Tournaments;
