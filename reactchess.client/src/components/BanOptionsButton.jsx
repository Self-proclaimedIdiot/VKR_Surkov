import React, { useState, useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import { jwtDecode } from "jwt-decode";
//import useSignalStore from './useSignalStore.js';
const BanOptionsButton = ({ title, accusedId, reportId, onBan }) => {
    const token = sessionStorage.getItem('token');
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [reason, setReason] = useState("")
    const [termDays, setTermDays] = useState(0)
    const SendBan = () => {
        const decoded = jwtDecode(token)
        fetch('/reports/ban-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ReportId: reportId, AccountId: decoded.nameid, AccusedId: accusedId, Term: termDays, Reason: reason })
        })
            .then(response => response.json())
            .then((data) => {
                if (data.correct) {
                    toast("Пользователь заблокирован!", {
                        duration: 2000,
                    });
                    onBan()
                    setIsOpen(false)
                }
            })
    }
    const ChangeTermDays = (e) => {
        setTermDays(e.target.value === '' ? '' : Number(e.target.value));
    }
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + rect.width / 2
            });
            position
        }
    }, [isOpen]);


    return (
        <div>
            <button className="btn btn-secondary" onClick={() => setIsOpen(!isOpen)}>
                {title}
            </button>

            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 70,
                    transform: 'translateX(-50%)',
                    backgroundColor: '#0e0f13',
                    border: '1px solid #ccc',
                    padding: '10px',
                    zIndex: 10,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    minWidth: '150px'
                }}>
                    <span className="user-input-label">
                    Причина блокировки:
                        <input
                            type="text"
                            value={reason}
                            className="user-input"
                            onChange={(e) => { setReason(e.target.value) }}
                        />
                    </span>
                    <span className="user-input-label">
                    Срок блокировки (в днях):
                        <input
                            type = "number"
                            value={termDays}
                            className="user-input"
                            onChange={ChangeTermDays}
                        />
                    </span>
                    <button className="btn btn-primary" onClick={() => SendBan()} >
                        Заблокировать
                    </button>
                    <button className="btn btn-danger" onClick={() => setIsOpen(false)}>
                        Отмена
                    </button>
                </div>
            )}
        </div>
    );
};

export default BanOptionsButton;