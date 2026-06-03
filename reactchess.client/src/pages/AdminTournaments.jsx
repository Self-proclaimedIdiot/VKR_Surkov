import { useState, useEffect } from "react";
import { toast } from 'sonner';

const emptyForm = {
    name: "",
    passElo: 0,
    passTitle: "",
    startTime: "",
    endTime: ""
};

const toInputDatetime = (isoString) => {
    if (!isoString) return "";
    return isoString.slice(0, 16);
};

const AdminTournaments = () => {
    const [tournaments, setTournaments] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const token = sessionStorage.getItem('token');

    const loadTournaments = () => {
        fetch('/tournaments/get-all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(data => setTournaments(data.tournaments));
    };

    useEffect(() => {
        loadTournaments();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setIsFormOpen(true);
    };

    const openEdit = (tournament) => {
        setForm({
            name: tournament.name,
            passElo: tournament.passElo,
            passTitle: tournament.passTitle,
            startTime: toInputDatetime(tournament.startTime),
            endTime: toInputDatetime(tournament.endTime)
        });
        setEditingId(tournament.id);
        setIsFormOpen(true);
    };

    const handleSubmit = () => {
        const payload = {
            Name: form.name,
            PassElo: Number(form.passElo),
            PassTitle: form.passTitle,
            StartTime: new Date(form.startTime).toISOString(),
            EndTime: new Date(form.endTime).toISOString()
        };

        if (editingId !== null) {
            fetch('/tournaments/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ Id: editingId, ...payload })
            })
                .then(r => r.json())
                .then(data => {
                    if (data.correct) {
                        toast("Турнир обновлён!", { duration: 2000 });
                        setIsFormOpen(false);
                        loadTournaments();
                    } else {
                        toast.error(data.error || "Ошибка при обновлении");
                    }
                });
        } else {
            fetch('/tournaments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
                .then(r => r.json())
                .then(data => {
                    if (data.correct) {
                        toast("Турнир создан!", { duration: 2000 });
                        setIsFormOpen(false);
                        loadTournaments();
                    } else {
                        toast.error(data.error || "Ошибка при создании");
                    }
                });
        }
    };

    const handleDelete = (id) => {
        fetch('/tournaments/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ Id: id })
        })
            .then(r => r.json())
            .then(data => {
                if (data.correct) {
                    toast("Турнир удалён!", { duration: 2000 });
                    loadTournaments();
                } else {
                    toast.error(data.error || "Ошибка при удалении");
                }
            });
    };

    const formatDatetime = (isoString) => {
        if (!isoString) return "—";
        const d = new Date(isoString);
        return d.toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Управление турнирами</h2>
                <button className="btn btn-primary" onClick={openCreate}>+ Создать турнир</button>
            </div>

            {isFormOpen && (
                <div className="report-card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>
                        {editingId !== null ? 'Редактировать турнир' : 'Новый турнир'}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label>
                            Название
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="user-input"
                                style={{ display: 'block', width: '100%', marginTop: '4px' }}
                                placeholder="Название турнира"
                            />
                        </label>

                        <label>
                            Минимальный рейтинг (ELO)
                            <input
                                type="number"
                                name="passElo"
                                value={form.passElo}
                                onChange={handleChange}
                                className="user-input"
                                style={{ display: 'block', width: '100%', marginTop: '4px' }}
                                min={0}
                            />
                        </label>

                        <label>
                            Требуемый титул (необязательно)
                            <input
                                type="text"
                                name="passTitle"
                                value={form.passTitle}
                                onChange={handleChange}
                                className="user-input"
                                style={{ display: 'block', width: '100%', marginTop: '4px' }}
                                placeholder="Например: GM, IM..."
                            />
                        </label>

                        <label>
                            Дата и время начала
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={form.startTime}
                                onChange={handleChange}
                                className="user-input"
                                style={{ display: 'block', width: '100%', marginTop: '4px' }}
                            />
                        </label>

                        <label>
                            Дата и время окончания
                            <input
                                type="datetime-local"
                                name="endTime"
                                value={form.endTime}
                                onChange={handleChange}
                                className="user-input"
                                style={{ display: 'block', width: '100%', marginTop: '4px' }}
                            />
                        </label>
                    </div>

                    <div className="report-actions" style={{ marginTop: '16px' }}>
                        <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
                            {editingId !== null ? 'Сохранить' : 'Создать'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setIsFormOpen(false)}>
                            Отмена
                        </button>
                    </div>
                </div>
            )}

            <div className="reports-list">
                {tournaments.length === 0 && (
                    <p style={{ color: '#aaa' }}>Турниров пока нет.</p>
                )}
                {tournaments.map(tournament => (
                    <div className="report-card" key={tournament.id}>
                        <div className="report-header">
                            <span style={{ fontWeight: 'bold', fontSize: '1.05em' }}>{tournament.name}</span>
                        </div>
                        <p className="report-text">
                            ELO: {tournament.passElo}{tournament.passTitle ? ` · Титул: ${tournament.passTitle}` : ''}
                        </p>
                        <p className="report-text">
                            Начало: {formatDatetime(tournament.startTime)}<br />
                            Конец: {formatDatetime(tournament.endTime)}
                        </p>
                        <div className="report-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => openEdit(tournament)}>
                                Редактировать
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(tournament.id)}>
                                Удалить
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminTournaments;
