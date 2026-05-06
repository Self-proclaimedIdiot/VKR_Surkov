import React, { useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
const UserProfile = () => {
    const token = sessionStorage.getItem('token');
    const [login, setLogin] = useState("")
    const [title, setTitle] = useState("")
    const [elos, setElos] = useState([])
    const [games, setGames] = useState([])
    useEffect(() => {
        const decoded = jwtDecode(token)
        fetch('user-profile/load-user-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ AccountId: decoded.nameid })
        })
            .then(response => response.json())
            .then(data => {
                setLogin(data.login)
                setTitle(data.title)
                setElos(data.elos)
                setGames(data.games)
            })
    }, [])
    return (
        <div className="profile-card">
            <div className="user-nickname">{login}
                {title != null && < span className="user-title">{title}</span >}
            </div>
            <div className="elo-list">
                {elos.map(elo => { 
                    return (
                        <span key={elo.formatName} className="elo-item">
                            <span className="elo-name">{elo.formatName} </span>
                            <span className="elo-value">{elo.eloNumber} </span>
                        </span>
                    )}
                )}
            </div>
            <div className="games-history">
                {games.map(game => {
                    return (
                        <div key={game.id} className="games-row">
                            <span>{"(" + game.formatName + ")"}</span>
                            <span className = "opponent">{game.opponentLogin}</span>
                            <span>{"(" + game.opponentElo + ")"}</span>
                            <span className={game.isVictory ? "status-win" : "status-loss"}>{" - " + (game.isVictory ? "Победа" : "Поражение")}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
export default UserProfile