import React from 'react';
import { Link } from 'react-router-dom';
const Home = () => {
    const token = sessionStorage.getItem('token');
    return (
        <div className="home-page">
            <div className="home-hero">
                <div className="home-logo">ReactChess</div>
                <p className="home-tagline">
                    Играйте в шахматы онлайн — находите соперников, отслеживайте рейтинг,
                    разбирайте партии и улучшайте своё мастерство.
                </p>
                {token == null && <div className="home-cta">
                    <Link to="/login" className="btn btn-primary btn-lg">Войти</Link>
                    <Link to="/register" className="btn btn-secondary btn-lg">Регистрация</Link>
                </div>}
            </div>

            <div className="home-features">
                <div className="feature-tile">
                    <span className="feature-icon">♟</span>
                    <div className="feature-name">Быстрая игра</div>
                    <p className="feature-desc">
                        Найдите соперника по рейтингу за секунды в любом временном контроле.
                    </p>
                </div>
                <div className="feature-tile">
                    <span className="feature-icon">📈</span>
                    <div className="feature-name">Рейтинг ELO</div>
                    <p className="feature-desc">
                        Следите за своим прогрессом отдельно для каждого формата игры.
                    </p>
                </div>
                <div className="feature-tile">
                    <span className="feature-icon">🎬</span>
                    <div className="feature-name">Разбор партий</div>
                    <p className="feature-desc">
                        Пересматривайте каждую сыгранную партию ход за ходом.
                    </p>
                </div>
                <div className="feature-tile">
                    <span className="feature-icon">🤝</span>
                    <div className="feature-name">Друзья и дуэли</div>
                    <p className="feature-desc">
                        Добавляйте друзей и вызывайте их на приватный поединок.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Home;
